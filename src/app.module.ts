import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseService } from './database/database.service.js';
import { ProfileController } from './profile/profile.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { ProfileExtractorClient } from './profile/profile-extractor.client.js';
import { JobsController } from './jobs/jobs.controller.js';
import { JobsService } from './jobs/jobs.service.js';
import { JobAgentClient } from './jobs/job-agent.client.js';
import { ApplicationsController } from './applications/applications.controller.js';
import { ApplicationsService } from './applications/applications.service.js';
import { DashboardController } from './dashboard/dashboard.controller.js';
import { DashboardService } from './dashboard/dashboard.service.js';
import { InsightsController } from './insights/insights.controller.js';
import { InsightsService } from './insights/insights.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [
    ProfileController,
    JobsController,
    ApplicationsController,
    DashboardController,
    InsightsController,
  ],
  providers: [
    DatabaseService,
    ProfileService,
    ProfileExtractorClient,
    JobAgentClient,
    JobsService,
    ApplicationsService,
    DashboardService,
    InsightsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
