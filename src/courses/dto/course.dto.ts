import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CourseResponseDto {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail?: string | null;
  isPublished: boolean;
  instructor?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lessons?: any[];
  enrollments?: any[];
  reviews?: any[];
}
