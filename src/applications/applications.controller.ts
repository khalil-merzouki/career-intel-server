import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { id } from '../common/validation.js';
import { ApplicationsService } from './applications.service.js';

@Controller('api/applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}
  @Get() list() {
    return this.service.list();
  }
  @Get('by-job/:jobId') forJob(@Param('jobId') jobId: string) {
    return this.service.forJob(id(jobId));
  }
  @Get('source/:jobId') source(@Param('jobId') jobId: string) {
    return this.service.source(id(jobId));
  }
  @Get(':applicationId') get(@Param('applicationId') applicationId: string) {
    return this.service.get(id(applicationId));
  }
  @Post() create(@Body() body: unknown) {
    return this.service.create(body);
  }
  @Put(':applicationId') update(
    @Param('applicationId') applicationId: string,
    @Body() body: unknown,
  ) {
    return this.service.update(id(applicationId), body);
  }
}
