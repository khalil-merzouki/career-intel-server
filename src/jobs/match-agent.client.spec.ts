import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile } from '../profile/profile.service.js';
import type { JobOpportunity } from './types.js';
import {
  MatchAgentClient,
  validateRecruiterMatch,
} from './match-agent.client.js';

const result = {
  stage: 'recruiter-reviewed',
  score: 75,
  threshold: 65,
  matchedSkills: ['React'],
  missingSkills: [],
  recommendInterview: true,
  summary: 'Evidence supports an interview.',
};
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
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe('match agent client', () => {
  it('rejects malformed agent output', () => {
    expect(() => validateRecruiterMatch({ ...result, score: 120 })).toThrow();
    expect(() =>
      validateRecruiterMatch({ ...result, recommendInterview: null }),
    ).toThrow();
  });
  it('sends saved content with bearer auth and excludes local file metadata', async () => {
    vi.stubEnv('MATCH_AGENT_TOKEN', 'test-token');
    vi.stubEnv('MATCH_AGENT_URL', 'http://127.0.0.1:3003');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    const profile = {
      ...emptyProfile,
      importedFile: 'private-cv.pdf',
      complete: true,
    };
    expect(await new MatchAgentClient().evaluate(profile, job)).toEqual(result);
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(String(endpoint)).toBe('http://127.0.0.1:3003/evaluate');
    expect(options?.headers).toMatchObject({
      authorization: 'Bearer test-token',
    });
    expect(options?.body).toContain('"description"');
    expect(options?.body).not.toContain('private-cv.pdf');
  });
});
