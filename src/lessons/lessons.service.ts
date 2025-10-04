import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto } from './dto/lesson.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async create(createLessonDto: CreateLessonDto, userRole: Role): Promise<LessonResponseDto> {
    // Only admins can create lessons
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can create lessons');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createLessonDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if lesson with same order already exists in the course
    const existingLesson = await this.prisma.lesson.findFirst({
      where: {
        courseId: createLessonDto.courseId,
        order: createLessonDto.order,
      },
    });

    if (existingLesson) {
      throw new ConflictException('A lesson with this order already exists in the course');
    }

    const lesson = await this.prisma.lesson.create({
      data: createLessonDto,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return lesson;
  }

  async findAll(
    courseId?: number,
    isPublished?: boolean,
    userRole?: Role
  ): Promise<LessonResponseDto[]> {
    const where: any = {};

    if (courseId) {
      where.courseId = courseId;
    }

    // Non-admin users can only see published lessons
    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    } else if (userRole !== Role.ADMIN) {
      where.isPublished = true;
    }

    const lessons = await this.prisma.lesson.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            isPublished: true,
          },
        },
      },
      orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
    });

    // Filter out lessons from unpublished courses for non-admin users
    if (userRole !== Role.ADMIN) {
      return lessons.filter(lesson => lesson.course.isPublished);
    }

    return lessons;
  }

  async findOne(id: number, userRole?: Role): Promise<LessonResponseDto> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            isPublished: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Non-admin users can only see published lessons from published courses
    if (userRole !== Role.ADMIN) {
      if (!lesson.isPublished || !lesson.course.isPublished) {
        throw new NotFoundException('Lesson not found');
      }
    }

    return lesson;
  }

  async update(id: number, updateLessonDto: UpdateLessonDto, userRole: Role): Promise<LessonResponseDto> {
    // Only admins can update lessons
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update lessons');
    }

    const existingLesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!existingLesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if lesson order conflicts (if order is being updated)
    if (updateLessonDto.order && updateLessonDto.order !== existingLesson.order) {
      const conflictingLesson = await this.prisma.lesson.findFirst({
        where: {
          courseId: existingLesson.courseId,
          order: updateLessonDto.order,
          id: { not: id },
        },
      });

      if (conflictingLesson) {
        throw new ConflictException('A lesson with this order already exists in the course');
      }
    }

    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: updateLessonDto,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return updatedLesson;
  }

  async remove(id: number, userRole: Role): Promise<void> {
    // Only admins can delete lessons
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete lessons');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Delete associated video file from MinIO
    if (lesson.videoUrl) {
      try {
        await this.minioService.deleteFile(lesson.videoUrl);
      } catch (error) {
        console.warn('Failed to delete lesson video:', error);
      }
    }

    await this.prisma.lesson.delete({
      where: { id },
    });
  }

  async uploadVideo(lessonId: number, file: Express.Multer.File, userRole: Role): Promise<LessonResponseDto> {
    // Only admins can upload videos
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can upload lesson videos');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Delete old video if exists
    if (lesson.videoUrl) {
      try {
        await this.minioService.deleteFile(lesson.videoUrl);
      } catch (error) {
        console.warn('Failed to delete old video:', error);
      }
    }

    // Upload new video
    const videoPath = await this.minioService.uploadVideo(file);

    // Update lesson with new video path
    const updatedLesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { videoUrl: videoPath },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    return updatedLesson;
  }

  async getVideoUrl(lessonId: number, userId: number, userRole: Role): Promise<string> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { studentId: userId },
            },
          },
        },
      },
    });

    if (!lesson || !lesson.videoUrl) {
      throw new NotFoundException('Lesson or video not found');
    }

    // Check access permissions
    if (userRole !== Role.ADMIN) {
      // Check if lesson and course are published
      if (!lesson.isPublished || !lesson.course.isPublished) {
        throw new ForbiddenException('Lesson not available');
      }

      // Check if user is enrolled in the course
      if (lesson.course.enrollments.length === 0) {
        throw new ForbiddenException('You must be enrolled in this course to view the video');
      }
    }

    return this.minioService.getFileUrl(lesson.videoUrl);
  }

  async reorderLessons(courseId: number, lessonOrders: { id: number; order: number }[], userRole: Role): Promise<LessonResponseDto[]> {
    // Only admins can reorder lessons
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can reorder lessons');
    }

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Validate that all lessons belong to the course
    const lessonIds = lessonOrders.map(lo => lo.id);
    const lessons = await this.prisma.lesson.findMany({
      where: {
        id: { in: lessonIds },
        courseId,
      },
    });

    if (lessons.length !== lessonIds.length) {
      throw new NotFoundException('Some lessons not found or do not belong to this course');
    }

    // Update lesson orders in transaction
    await this.prisma.$transaction(
      lessonOrders.map(({ id, order }) =>
        this.prisma.lesson.update({
          where: { id },
          data: { order },
        })
      )
    );

    // Return updated lessons
    return this.prisma.lesson.findMany({
      where: { courseId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }
}
