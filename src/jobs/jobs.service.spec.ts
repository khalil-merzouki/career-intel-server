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
