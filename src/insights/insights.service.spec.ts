import type { ApplicationsService } from '../applications/applications.service.js';
import type { Application } from '../applications/types.js';
import type { JobsService } from '../jobs/jobs.service.js';
import type { JobOpportunity } from '../jobs/types.js';
import {
  emptyProfile,
  type ProfileService,
} from '../profile/profile.service.js';
import { aggregateInsights, InsightsService } from './insights.service.js';

const baseJob: JobOpportunity = {
  id: 'job-1',
  role: 'Engineer',
  company: 'Acme',
  location: 'Unknown',
  workType: 'unknown',
  salary: '',
  salarySource: 'estimated',
  url: '',
  description: '',
  seniority: '',
  experience: '',
  status: 'confirmed',
  trackingStatus: 'saved',
  notes: '',
  createdAt: '2026-10-01T00:00:00.000Z',
  requirements: [
    { id: 'f1', category: 'skill', text: 'Figma', priority: 'required' },
    { id: 's1', category: 'skill', text: 'SQL', priority: 'preferred' },
    { id: 'r1', category: 'skill', text: 'React', priority: 'required' },
    {
      id: 'r1-duplicate',
      category: 'skill',
      text: ' react ',
      priority: 'preferred',
    },
  ],
};
const secondJob: JobOpportunity = {
  ...baseJob,
  id: 'job-2',
  trackingStatus: 'applied',
  requirements: [
    { id: 's2', category: 'skill', text: 'sql', priority: 'required' },
    { id: 'r2', category: 'skill', text: 'React', priority: 'required' },
    { id: 'l2', category: 'language', text: 'English', priority: 'required' },
  ],
};
const application: Application = {
  id: 'app-1',
  jobId: 'job-2',
  role: 'Engineer',
  company: 'Acme',
  location: '',
  stage: 'applied',
  appliedOn: '2026-10-02',
  notes: '',
  importantDates: [],
  interviews: [],
  stageHistory: [],
  createdAt: '2026-10-02',
  updatedAt: '2026-10-02',
};
const profile = {
  ...emptyProfile,
  complete: true,
  skills: [{ id: 'skill-1', name: 'Figma', proficiency: 'Advanced' as const }],
  experience: [
    {
      id: 'exp-1',
      role: 'Data Analyst',
      company: 'Acme',
      period: '',
      description: 'Used SQL daily.',
    },
  ],
};

describe('career insights', () => {
  it('provides an honest empty and incomplete profile state', () => {
    expect(aggregateInsights(emptyProfile, [], [])).toMatchObject({
      analyzedOpportunityCount: 0,
      skillDemand: [],
      skillGaps: [],
      highValueSkills: [],
      strongSkills: [],
      recurringRequirements: [],
    });
    const incomplete = aggregateInsights(emptyProfile, [baseJob], []);
    expect(incomplete.skillDemand).toHaveLength(3);
    expect(
      incomplete.skillDemand.every((item) => item.alignment === 'unassessed'),
    ).toBe(true);
    expect(incomplete.skillGaps).toEqual([]);
  });
  it('deduplicates each job, excludes archived jobs, and ranks documented gaps', () => {
    const archived = {
      ...baseJob,
      id: 'job-3',
      trackingStatus: 'archived' as const,
    };
    const result = aggregateInsights(
      profile,
      [baseJob, secondJob, archived],
      [application],
    );
    expect(result.analyzedOpportunityCount).toBe(2);
    expect(result.applicationCount).toBe(1);
    expect(
      result.skillDemand.find((item) => item.name === 'React'),
    ).toMatchObject({
      opportunityCount: 2,
      requiredCount: 2,
      applicationCount: 1,
      alignment: 'gap',
    });
    expect(
      result.skillDemand.find((item) => item.name === 'SQL'),
    ).toMatchObject({
      opportunityCount: 2,
      requiredCount: 1,
      applicationCount: 1,
      alignment: 'partial',
    });
    expect(result.strongSkills).toEqual([
      expect.objectContaining({ name: 'Figma', alignment: 'strong' }),
    ]);
    expect(result.highValueSkills[0].name).toBe('React');
    expect(result.recurringRequirements).toHaveLength(2);
    expect(
      result.careerInsights.some((item) => item.title === 'Review React'),
    ).toBe(true);
  });
  it('loads current data through the service', async () => {
    const profileService = { get: vi.fn().mockResolvedValue(emptyProfile) };
    const jobsService = { list: vi.fn().mockResolvedValue([]) };
    const applicationsService = { list: vi.fn().mockResolvedValue([]) };
    const service = new InsightsService(
      profileService as unknown as ProfileService,
      jobsService as unknown as JobsService,
      applicationsService as unknown as ApplicationsService,
    );
    expect(await service.get()).toMatchObject({ analyzedOpportunityCount: 0 });
    expect(profileService.get).toHaveBeenCalledOnce();
    expect(jobsService.list).toHaveBeenCalledOnce();
    expect(applicationsService.list).toHaveBeenCalledOnce();
  });
});
