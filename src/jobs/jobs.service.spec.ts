import { describe, expect, it, vi } from 'vitest';
import { emptyProfile } from '../profile/profile.service.js';
import type { DatabaseService } from '../database/database.service.js';
import type { ProfileService } from '../profile/profile.service.js';
import type { JobAgentClient } from './job-agent.client.js';
import type { MatchAgentClient } from './match-agent.client.js';
import type { JobOpportunity } from './types.js';
import { JobsService } from './jobs.service.js';

const job: JobOpportunity = {
  id: 'test',
  role: 'Engineer',
  company: 'Acme',
  description: 'A'.repeat(100),
  requirements: [],
  location: '',
  workType: 'unknown',
  salary: '',
  salarySource: 'estimated',
  url: '',
  seniority: '',
  experience: '',
  status: 'confirmed',
  trackingStatus: 'saved',
  notes: '',
  createdAt: '',
};
describe('explicit match evaluation', () => {
  it('uses saved records when both are ready', async () => {
    const profile = { ...emptyProfile, complete: true };
    const evaluate = vi.fn().mockResolvedValue({ score: 70 });
    const service = new JobsService(
      {} as DatabaseService,
      { get: vi.fn().mockResolvedValue(profile) } as unknown as ProfileService,
      {} as JobAgentClient,
      { evaluate } as unknown as MatchAgentClient,
    );
    vi.spyOn(service, 'get').mockResolvedValue(job);
    await service.evaluateMatch(job.id);
    expect(evaluate).toHaveBeenCalledWith(profile, job);
  });
  it('does not call the agent for unconfirmed jobs or incomplete profiles', async () => {
    const evaluate = vi.fn();
    const service = new JobsService(
      {} as DatabaseService,
      {
        get: vi.fn().mockResolvedValue(emptyProfile),
      } as unknown as ProfileService,
      {} as JobAgentClient,
      { evaluate } as unknown as MatchAgentClient,
    );
    vi.spyOn(service, 'get')
      .mockResolvedValueOnce({ ...job, status: 'draft' })
      .mockResolvedValueOnce(job);
    await expect(service.evaluateMatch(job.id)).rejects.toMatchObject({
      status: 409,
    });
    await expect(service.evaluateMatch(job.id)).rejects.toMatchObject({
      status: 409,
    });
    expect(evaluate).not.toHaveBeenCalled();
  });
});

describe('job capture duplicates', () => {
  const existing = { ...job, url: 'https://example.com/jobs/engineer' };
  const values = vi.fn().mockResolvedValue(undefined);
  const analyze = vi.fn().mockResolvedValue({
    role: ' Engineer ',
    company: 'ACME',
    url: 'https://other.example/jobs/1',
    description: 'B'.repeat(100),
    requirements: [],
    location: '',
    workType: 'unknown',
    salary: '',
    salarySource: 'estimated',
    seniority: '',
    experience: '',
  });
  const service = new JobsService(
    {
      db: { insert: vi.fn().mockReturnValue({ values }) },
    } as unknown as DatabaseService,
    {} as ProfileService,
    { analyze } as unknown as JobAgentClient,
    {} as MatchAgentClient,
  );
  vi.spyOn(service, 'list').mockResolvedValue([existing]);

  it('blocks an existing URL before analysis, even with confirmation', async () => {
    analyze.mockClear();
    await expect(
      service.analyze({
        url: 'https://example.com/jobs/engineer#details',
        description: 'A'.repeat(100),
        allowSimilar: true,
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'duplicate_url' },
    });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('asks before saving the same role and company at a different URL', async () => {
    values.mockClear();
    const input = {
      url: 'https://other.example/jobs/1',
      description: 'B'.repeat(100),
    };
    await expect(service.analyze(input)).rejects.toMatchObject({
      status: 409,
      response: { code: 'similar_job', existing: { id: existing.id } },
    });
    expect(values).not.toHaveBeenCalled();
    await service.analyze({ ...input, allowSimilar: true });
    expect(values).toHaveBeenCalledTimes(1);
  });
});
