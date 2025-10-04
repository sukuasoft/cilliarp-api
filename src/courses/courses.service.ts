import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto } from './dto/course.dto';
import { Role } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async create(createCourseDto: CreateCourseDto, userRole: Role): Promise<CourseResponseDto> {
    // Only admins can create courses
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can create courses');
    }

    const course = await this.prisma.course.create({
      data: createCourseDto,
      include: {
        lessons: true,
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        reviews: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return course;
  }

  async findAll(
    isPublished?: boolean,
    search?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ courses: CourseResponseDto[]; total: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { instructor: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
          },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          reviews: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      courses,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, userRole?: Role): Promise<CourseResponseDto> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: {
          where: userRole === Role.ADMIN ? undefined : { isPublished: true },
          orderBy: { order: 'asc' },
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        reviews: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Non-admin users can only see published courses
    if (userRole !== Role.ADMIN && !course.isPublished) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto, userRole: Role): Promise<CourseResponseDto> {
    // Only admins can update courses
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update courses');
    }

    const existingCourse = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      throw new NotFoundException('Course not found');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
      include: {
        lessons: true,
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        reviews: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updatedCourse;
  }

  async remove(id: number, userRole: Role): Promise<void> {
    // Only admins can delete courses
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete courses');
    }

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { lessons: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Delete associated files from MinIO
    if (course.thumbnail) {
      try {
        await this.minioService.deleteFile(course.thumbnail);
      } catch (error) {
        console.warn('Failed to delete course thumbnail:', error);
      }
    }

    // Delete lesson videos
    for (const lesson of course.lessons) {
      if (lesson.videoUrl) {
        try {
          await this.minioService.deleteFile(lesson.videoUrl);
        } catch (error) {
          console.warn('Failed to delete lesson video:', error);
        }
      }
    }

    await this.prisma.course.delete({
      where: { id },
    });
  }

  async uploadThumbnail(courseId: number, file: Express.Multer.File, userRole: Role): Promise<CourseResponseDto> {
    // Only admins can upload thumbnails
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can upload course thumbnails');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Delete old thumbnail if exists
    if (course.thumbnail) {
      try {
        await this.minioService.deleteFile(course.thumbnail);
      } catch (error) {
        console.warn('Failed to delete old thumbnail:', error);
      }
    }

    // Upload new thumbnail
    const thumbnailPath = await this.minioService.uploadImage(file, true);

    // Update course with new thumbnail path
    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: { thumbnail: thumbnailPath },
      include: {
        lessons: true,
        enrollments: true,
        reviews: true,
      },
    });

    return updatedCourse;
  }

  async getThumbnailUrl(courseId: number): Promise<string> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { thumbnail: true },
    });

    if (!course || !course.thumbnail) {
      throw new NotFoundException('Course or thumbnail not found');
    }

    return this.minioService.getFileUrl(course.thumbnail);
  }

  async getEnrollmentStats(courseId: number, userRole: Role): Promise<any> {
    // Only admins can view enrollment stats
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view enrollment statistics');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const [totalEnrollments, completedEnrollments, averageProgress] = await Promise.all([
      this.prisma.enrollment.count({
        where: { courseId },
      }),
      this.prisma.enrollment.count({
        where: { courseId, completedAt: { not: null } },
      }),
      this.prisma.enrollment.aggregate({
        where: { courseId },
        _avg: { progress: true },
      }),
    ]);

    return {
      courseId,
      totalEnrollments,
      completedEnrollments,
      averageProgress: averageProgress._avg.progress || 0,
      completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
    };
  }
}
