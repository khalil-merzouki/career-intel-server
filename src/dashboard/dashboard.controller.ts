import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get() get() {
    return this.service.get();
  }
}
