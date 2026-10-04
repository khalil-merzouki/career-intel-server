import type { ApplicationsService } from '../applications/applications.service.js';
import type { Application } from '../applications/types.js';
import type { JobsService } from '../jobs/jobs.service.js';
import type { JobOpportunity } from '../jobs/types.js';
import {
  emptyProfile,
  type ProfileService,
} from '../profile/profile.service.js';
import { buildDashboard, DashboardService } from './dashboard.service.js';

const opportunity: JobOpportunity = {
  id: 'job-1',
  role: 'Designer',
  company: 'Acme',
  location: 'Unknown',
  workType: 'unknown',
  salary: '',
  salarySource: 'estimated',
  url: '',
  description: '',
  seniority: '',
  experience: '',
  requirements: [
    { id: 'req-1', category: 'skill', text: 'Figma', priority: 'required' },
  ],
  status: 'confirmed',
  trackingStatus: 'saved',
  notes: '',
  createdAt: '2026-10-01T00:00:00.000Z',
};
const application: Application = {
  id: 'app-1',
  jobId: 'job-1',
  role: 'Old title',
  company: 'Old company',
  location: '',
  stage: 'technical-interview',
  appliedOn: '2026-10-01',
  notes: '',
  importantDates: [],
  interviews: [
    {
      id: 'interview-1',
      title: 'Team interview',
      date: '2026-10-06',
      status: 'scheduled',
      notes: '',
    },
    {
      id: 'interview-2',
      title: 'Past interview',
      date: '2026-10-01',
      status: 'scheduled',
      notes: '',
    },
  ],
  stageHistory: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
};

describe('dashboard summary', () => {
  it('returns the empty-state shape and profile focus', () => {
    expect(buildDashboard(emptyProfile, [], [], '2026-10-04')).toMatchObject({
      profileReady: false,
      activeApplicationCount: 0,
      savedOpportunityCount: 0,
      upcomingInterviewCount: 0,
      analyzedOpportunityCount: 0,
      activeApplications: [],
      upcomingInterviews: [],
      bestAlignedOpportunities: [],
      recurringGaps: [],
      focus: { kind: 'link', href: '/profile' },
    });
  });
  it('aggregates active applications, interviews, alignment and recurring gaps', () => {
    const jobs = [
      opportunity,
      {
        ...opportunity,
        id: 'job-2',
        requirements: [{ ...opportunity.requirements[0], id: 'req-2' }],
      },
    ];
    const summary = buildDashboard(
      { ...emptyProfile, complete: true },
      jobs,
      [application],
      '2026-10-04',
    );
    expect(summary).toMatchObject({
      profileReady: true,
      activeApplicationCount: 1,
      savedOpportunityCount: 2,
      upcomingInterviewCount: 1,
      analyzedOpportunityCount: 2,
      focus: { kind: 'application', applicationId: 'app-1' },
    });
    expect(summary.activeApplications[0]).toMatchObject({
      role: 'Designer',
      stageLabel: 'Technical interview',
    });
    expect(summary.upcomingInterviews).toHaveLength(1);
    expect(summary.bestAlignedOpportunities).toHaveLength(2);
    expect(summary.bestAlignedOpportunities[0]).toMatchObject({
      documentedMatches: 0,
      reviewItems: 1,
      comparedItems: 1,
    });
    expect(summary.recurringGaps).toEqual([
      { name: 'Figma', opportunityCount: 2, requiredCount: 2 },
    ]);
  });
  it('loads source data through the service', async () => {
    const profile = { get: vi.fn().mockResolvedValue(emptyProfile) };
    const jobs = { list: vi.fn().mockResolvedValue([]) };
    const applications = { list: vi.fn().mockResolvedValue([]) };
    const service = new DashboardService(
      profile as unknown as ProfileService,
      jobs as unknown as JobsService,
      applications as unknown as ApplicationsService,
    );
    expect(await service.get()).toMatchObject({ activeApplicationCount: 0 });
    expect(profile.get).toHaveBeenCalledOnce();
    expect(jobs.list).toHaveBeenCalledOnce();
    expect(applications.list).toHaveBeenCalledOnce();
  });
});
