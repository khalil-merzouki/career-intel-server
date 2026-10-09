import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { id } from '../common/validation.js';
import { JobsService } from './jobs.service.js';

@Controller('api/jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post('analyze') analyze(@Body() body: unknown) {
    return this.service.analyze(body);
  }
  @Post(':jobId/evaluate-match') evaluateMatch(@Param('jobId') jobId: string) {
    return this.service.evaluateMatch(id(jobId));
  }
  @Get(':jobId/match') match(@Param('jobId') jobId: string) {
    return this.service.match(id(jobId));
  }
  @Get(':jobId') get(@Param('jobId') jobId: string) {
    return this.service.get(id(jobId));
  }
  @Post(':jobId/confirm') confirm(
    @Param('jobId') jobId: string,
    @Body() body: unknown,
  ) {
    return this.service.confirm(id(jobId), body);
  }
  @Put(':jobId') update(@Param('jobId') jobId: string, @Body() body: unknown) {
    return this.service.update(id(jobId), body);
  }
}
