import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        ...userData,
      },
    });

    return this.excludePassword(user);
  }

  async findAll(role?: Role): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => this.excludePassword(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
        reviews: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.excludePassword(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto, currentUserId: number, currentUserRole: Role): Promise<UserResponseDto> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Authorization check: users can only update their own profile, admins can update any
    if (currentUserRole !== Role.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles
    if (updateUserDto.role && currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Check email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    const updateData = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.excludePassword(updatedUser);
  }

  async remove(id: number, currentUserId: number, currentUserRole: Role): Promise<void> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Authorization check: users can only delete their own account, admins can delete any
    if (currentUserRole !== Role.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only delete your own account');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async uploadAvatar(userId: number, file: Express.Multer.File, currentUserId: number, currentUserRole: Role): Promise<UserResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Authorization check
    if (currentUserRole !== Role.ADMIN && currentUserId !== userId) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    // Delete old avatar if exists
    if (user.avatar) {
      try {
        await this.minioService.deleteFile(user.avatar);
      } catch (error) {
        // Log error but don't fail the upload
        console.warn('Failed to delete old avatar:', error);
      }
    }

    // Upload new avatar
    const avatarPath = await this.minioService.uploadImage(file, true);

    // Update user with new avatar path
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
    });

    return this.excludePassword(updatedUser);
  }

  async getAvatarUrl(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user || !user.avatar) {
      throw new NotFoundException('User or avatar not found');
    }

    return this.minioService.getFileUrl(user.avatar);
  }

  private excludePassword(user: any): UserResponseDto {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
