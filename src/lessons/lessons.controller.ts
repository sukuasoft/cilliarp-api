import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createLessonDto: CreateLessonDto, @GetUser() user: any) {
    return this.lessonsService.create(createLessonDto, user.role);
  }

  @Get()
  findAll(
    @Query('courseId') courseId?: string,
    @Query('published') published?: string,
    @GetUser() user?: any,
  ) {
    const courseIdNum = courseId ? parseInt(courseId, 10) : undefined;
    const isPublished = published !== undefined ? published === 'true' : undefined;
    
    return {
        lessons: this.lessonsService.findAll(courseIdNum, isPublished, user?.role)
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user?: any) {
    return this.lessonsService.findOne(id, user?.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLessonDto: UpdateLessonDto,
    @GetUser() user: any,
  ) {
    return this.lessonsService.update(id, updateLessonDto, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.lessonsService.remove(id, user.role);
  }

  @Post(':id/video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('video'))
  uploadVideo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }), // 500MB
          new FileTypeValidator({ fileType: /^video\/(mp4|avi|mov|wmv|flv|webm)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @GetUser() user: any,
  ) {
    return this.lessonsService.uploadVideo(id, file, user.role);
  }

  @Get(':id/video')
  @UseGuards(JwtAuthGuard)
  getVideoUrl(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.lessonsService.getVideoUrl(id, user.id, user.role);
  }

  @Patch('course/:courseId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reorderLessons(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() lessonOrders: { id: number; order: number }[],
    @GetUser() user: any,
  ) {
    return this.lessonsService.reorderLessons(courseId, lessonOrders, user.role);
  }
}
