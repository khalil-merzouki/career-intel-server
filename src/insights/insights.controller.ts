import { Controller, Get } from '@nestjs/common';
import { InsightsService } from './insights.service.js';

@Controller('api/insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  get() {
    return this.insights.get();
  }
}
