import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  content: string;

  @IsNumber()
  @Min(1)
  order: number;

  @IsNumber()
  courseId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class LessonResponseDto {
  id: number;
  title: string;
  description?: string | null;
  content: string;
  videoUrl?: string | null;
  duration?: number | null;
  order: number;
  isPublished: boolean;
  courseId: number;
  createdAt: Date;
  updatedAt: Date;
  course?: any;
}
