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
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  create(@Body() createEnrollmentDto: CreateEnrollmentDto, @GetUser() user: any) {
    return this.enrollmentsService.create(createEnrollmentDto, user.id, user.role);
  }

  @Get()
  findAll(
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
    @GetUser() user?: any,
  ) {
    const studentIdNum = studentId ? parseInt(studentId, 10) : undefined;
    const courseIdNum = courseId ? parseInt(courseId, 10) : undefined;
    
    return this.enrollmentsService.findAll(studentIdNum, courseIdNum, user?.id, user?.role);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getEnrollmentStats(@GetUser() user: any) {
    return this.enrollmentsService.getEnrollmentStats(user.role);
  }

  @Get('student/:studentId/courses')
  getStudentCourses(
    @Param('studentId', ParseIntPipe) studentId: number,
    @GetUser() user: any,
  ) {
    return this.enrollmentsService.getStudentCourses(studentId, user.id, user.role);
  }

  @Get('course/:courseId/students')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getCourseStudents(
    @Param('courseId', ParseIntPipe) courseId: number,
    @GetUser() user: any,
  ) {
    return this.enrollmentsService.getCourseStudents(courseId, user.role);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.enrollmentsService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @GetUser() user: any,
  ) {
    return this.enrollmentsService.update(id, updateEnrollmentDto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.enrollmentsService.remove(id, user.id, user.role);
  }
}
