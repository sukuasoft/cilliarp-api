import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateEnrollmentDto {
  @IsNumber()
  courseId: number;

  @IsOptional()
  @IsNumber()
  studentId?: number; // Optional because it can be taken from JWT token
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class EnrollmentResponseDto {
  id: number;
  progress: number;
  completedAt?: Date | null;
  studentId: number;
  courseId: number;
  createdAt: Date;
  updatedAt: Date;
  student?: any;
  course?: any;
  payments?: any[];
}
