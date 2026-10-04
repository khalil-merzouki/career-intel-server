import { emptyProfile } from '../profile/profile.service.js';
import type { JobOpportunity } from '../jobs/types.js';
import type { Application } from '../applications/types.js';
import { buildDashboardSummary } from './summary.js';

const makeJob = (id: string): JobOpportunity => ({
  id,
  role: 'Engineer',
  company: 'Acme',
  location: 'Remote',
  workType: 'remote',
  salary: '',
  salarySource: 'estimated',
  url: '',
  description: '',
  seniority: '',
  experience: '',
  requirements: [
    {
      id: `requirement-${id}`,
      category: 'skill',
      text: 'React',
      priority: 'required',
    },
  ],
  status: 'confirmed',
  trackingStatus: 'saved',
  notes: '',
  createdAt: '2026-10-01T00:00:00.000Z',
});
const makeApplication = (jobId: string): Application => ({
  id: 'application-1',
  jobId,
  role: 'Engineer',
  company: 'Acme',
  location: 'Remote',
  stage: 'applied',
  appliedOn: '2026-10-01',
  notes: '',
  importantDates: [],
  interviews: [
    {
      id: 'interview-1',
      title: 'Screening',
      date: '2026-10-03',
      status: 'scheduled',
      notes: '',
    },
  ],
  stageHistory: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
});

describe('dashboard summary', () => {
  it('asks for the profile when data is empty', () => {
    const summary = buildDashboardSummary(emptyProfile, [], [], '2026-10-02');
    expect(summary).toMatchObject({
      profileReady: false,
      activeApplicationCount: 0,
      savedOpportunityCount: 0,
      upcomingInterviewCount: 0,
      analyzedOpportunityCount: 0,
      focus: { kind: 'link', href: '/profile' },
    });
    expect(summary.bestAlignedOpportunities).toEqual([]);
  });
  it('counts confirmed jobs and recurring skill gaps once per job', () => {
    const profile = { ...emptyProfile, complete: true };
    const jobs = [makeJob('job-1'), makeJob('job-2')];
    jobs[0].requirements.push({
      id: 'duplicate',
      category: 'skill',
      text: 'react',
      priority: 'preferred',
    });
    const summary = buildDashboardSummary(profile, jobs, [], '2026-10-02');
    expect(summary.savedOpportunityCount).toBe(2);
    expect(summary.analyzedOpportunityCount).toBe(2);
    expect(summary.recurringGaps).toEqual([
      { name: 'react', opportunityCount: 2, requiredCount: 2 },
    ]);
    expect(summary.bestAlignedOpportunities).toHaveLength(2);
    expect(summary.focus).toMatchObject({
      kind: 'link',
      href: '/profile/setup/skills',
    });
  });
  it('prioritizes upcoming interviews and excludes closed applications', () => {
    const job = makeJob('job-1');
    const active = makeApplication(job.id);
    const closed = {
      ...makeApplication(job.id),
      id: 'application-2',
      stage: 'accepted' as const,
    };
    const summary = buildDashboardSummary(
      emptyProfile,
      [job],
      [active, closed],
      '2026-10-02',
    );
    expect(summary.activeApplicationCount).toBe(1);
    expect(summary.upcomingInterviewCount).toBe(1);
    expect(summary.activeApplications[0].stageLabel).toBe('Applied');
    expect(summary.focus).toMatchObject({
      kind: 'application',
      applicationId: active.id,
    });
    expect(summary.upcomingInterviews[0].title).toBe('Screening');
  });
});
