import { JobsService } from './jobs.service.js';
import type { DatabaseService } from '../database/database.service.js';
import type { ProfileService } from '../profile/profile.service.js';
import type { JobExtractorClient } from './job-extractor.client.js';

const input = {
  url: 'https://example.com/job',
  description:
    'A software engineering job description with enough detail to pass capture validation. The person will develop applications and work with the product team.',
};

describe('JobsService.analyze', () => {
  it('saves a draft from validated extractor output', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const database = {
      db: { insert: vi.fn().mockReturnValue({ values }) },
    } as unknown as DatabaseService;
    const extractor = {
      extract: vi.fn().mockResolvedValue({
        role: 'Engineer',
        company: 'Acme',
        location: 'Unknown',
        workType: 'unknown',
        salary: '',
        salarySource: 'estimated',
        seniority: '',
        experience: '',
        requirements: [
          { category: 'skill', text: 'TypeScript', priority: 'required' },
        ],
      }),
    } as unknown as JobExtractorClient;
    const service = new JobsService(database, {} as ProfileService, extractor);
    const job = await service.analyze(input);
    expect(job).toMatchObject({
      role: 'Engineer',
      status: 'draft',
      trackingStatus: 'saved',
      description: input.description,
      url: input.url,
    });
    expect(job.requirements[0]).toMatchObject({
      category: 'skill',
      text: 'TypeScript',
    });
    expect(job.requirements[0].id).toBeTruthy();
    expect(extractor.extract).toHaveBeenCalledWith(input);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ id: job.id, data: job }),
    );
  });
  it('does not save malformed extractor output', async () => {
    const values = vi.fn();
    const database = {
      db: { insert: vi.fn().mockReturnValue({ values }) },
    } as unknown as DatabaseService;
    const extractor = {
      extract: vi.fn().mockResolvedValue({ role: 'Engineer' }),
    } as unknown as JobExtractorClient;
    await expect(
      new JobsService(database, {} as ProfileService, extractor).analyze(input),
    ).rejects.toThrow();
    expect(values).not.toHaveBeenCalled();
  });
});
