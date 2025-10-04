import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto, EnrollmentResponseDto } from './dto/enrollment.dto';
import { Role } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createEnrollmentDto: CreateEnrollmentDto, currentUserId: number, currentUserRole: Role): Promise<EnrollmentResponseDto> {
    const { courseId, studentId } = createEnrollmentDto;
    
    // Determine the actual student ID
    let actualStudentId = currentUserId;
    
    // Only admins can enroll other users
    if (studentId && studentId !== currentUserId) {
      if (currentUserRole !== Role.ADMIN) {
        throw new ForbiddenException('Only admins can enroll other users');
      }
      actualStudentId = studentId;
    }

    // Check if course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.isPublished && currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Cannot enroll in unpublished course');
    }

    // Check if student exists
    const student = await this.prisma.user.findUnique({
      where: { id: actualStudentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: actualStudentId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: actualStudentId,
        courseId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            thumbnail: true,
          },
        },
        payments: true,
      },
    });

    return enrollment;
  }

  async findAll(
    studentId?: number,
    courseId?: number,
    currentUserId?: number,
    currentUserRole?: Role
  ): Promise<EnrollmentResponseDto[]> {
    const where: any = {};

    // Apply filters
    if (studentId) {
      where.studentId = studentId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    // Authorization: Students can only see their own enrollments, admins can see all
    if (currentUserRole !== Role.ADMIN) {
      where.studentId = currentUserId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            thumbnail: true,
            isPublished: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments;
  }

  async findOne(id: number, currentUserId: number, currentUserRole: Role): Promise<EnrollmentResponseDto> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            thumbnail: true,
            isPublished: true,
          },
        },
        payments: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Authorization check
    if (currentUserRole !== Role.ADMIN && enrollment.studentId !== currentUserId) {
      throw new ForbiddenException('You can only view your own enrollments');
    }

    return enrollment;
  }

  async update(id: number, updateEnrollmentDto: UpdateEnrollmentDto, currentUserId: number, currentUserRole: Role): Promise<EnrollmentResponseDto> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Authorization check
    if (currentUserRole !== Role.ADMIN && enrollment.studentId !== currentUserId) {
      throw new ForbiddenException('You can only update your own enrollments');
    }

    // Prepare update data
    const updateData: any = { ...updateEnrollmentDto };

    // Mark as completed if progress reaches 100%
    if (updateEnrollmentDto.progress === 100 && !enrollment.completedAt) {
      updateData.completedAt = new Date();
    } else if (updateEnrollmentDto.progress && updateEnrollmentDto.progress < 100 && enrollment.completedAt) {
      updateData.completedAt = null;
    }

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            thumbnail: true,
          },
        },
        payments: true,
      },
    });

    return updatedEnrollment;
  }

  async remove(id: number, currentUserId: number, currentUserRole: Role): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Authorization check
    if (currentUserRole !== Role.ADMIN && enrollment.studentId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own enrollments');
    }

    await this.prisma.enrollment.delete({
      where: { id },
    });
  }

  async getStudentCourses(studentId: number, currentUserId: number, currentUserRole: Role): Promise<any[]> {
    // Authorization check
    if (currentUserRole !== Role.ADMIN && studentId !== currentUserId) {
      throw new ForbiddenException('You can only view your own courses');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map(enrollment => ({
      ...enrollment.course,
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        completedAt: enrollment.completedAt,
        enrolledAt: enrollment.createdAt,
      },
    }));
  }

  async getCourseStudents(courseId: number, currentUserRole: Role): Promise<any[]> {
    // Only admins can view course students
    if (currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view course students');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map(enrollment => ({
      ...enrollment.student,
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        completedAt: enrollment.completedAt,
        enrolledAt: enrollment.createdAt,
      },
    }));
  }

  async getEnrollmentStats(currentUserRole: Role): Promise<any> {
    // Only admins can view enrollment statistics
    if (currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view enrollment statistics');
    }

    const [
      totalEnrollments,
      completedEnrollments,
      averageProgress,
      enrollmentsByMonth,
    ] = await Promise.all([
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({
        where: { completedAt: { not: null } },
      }),
      this.prisma.enrollment.aggregate({
        _avg: { progress: true },
      }),
      this.prisma.enrollment.groupBy({
        by: ['createdAt'],
        _count: true,
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);

    return {
      totalEnrollments,
      completedEnrollments,
      averageProgress: averageProgress._avg.progress || 0,
      completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
      enrollmentsByMonth: enrollmentsByMonth.map(item => ({
        month: item.createdAt.toISOString().slice(0, 7), // YYYY-MM format
        count: item._count,
      })),
    };
  }
}
