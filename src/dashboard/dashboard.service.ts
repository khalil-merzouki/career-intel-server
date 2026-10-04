import { Injectable } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { ProfileService } from '../profile/profile.service.js';
import { buildDashboardSummary } from './summary.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly profile: ProfileService,
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}
  async get() {
    const [profile, jobs, applications] = await Promise.all([
      this.profile.get(),
      this.jobs.list(),
      this.applications.list(),
    ]);
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    return buildDashboardSummary(profile, jobs, applications, today);
  }
}
