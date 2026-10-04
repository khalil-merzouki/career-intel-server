import { DashboardService } from './dashboard.service.js';
import { emptyProfile } from '../profile/profile.service.js';
import type { ProfileService } from '../profile/profile.service.js';
import type { JobsService } from '../jobs/jobs.service.js';
import type { ApplicationsService } from '../applications/applications.service.js';

describe('DashboardService', () => {
  it('combines the current profile, jobs, and applications', async () => {
    const profile = {
      get: vi.fn().mockResolvedValue(emptyProfile),
    } as unknown as ProfileService;
    const jobs = {
      list: vi.fn().mockResolvedValue([]),
    } as unknown as JobsService;
    const applications = {
      list: vi.fn().mockResolvedValue([]),
    } as unknown as ApplicationsService;
    const summary = await new DashboardService(
      profile,
      jobs,
      applications,
    ).get();
    expect(summary).toMatchObject({
      profileReady: false,
      savedOpportunityCount: 0,
      focus: { href: '/profile' },
    });
    expect(profile.get).toHaveBeenCalledOnce();
    expect(jobs.list).toHaveBeenCalledOnce();
    expect(applications.list).toHaveBeenCalledOnce();
  });
});
