import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  JobAgentClient,
  classifyJobType,
  mapAnalysis,
} from './job-agent.client.js';

const input = { description: 'A'.repeat(100), url: '' };
const output = {
  jobTitle: 'Senior Engineer',
  company: 'Acme',
  seniority: 'senior',
  location: {
    city: 'Madrid',
    country: 'Spain',
    workMode: 'hybrid',
    details: null,
  },
  salary: {
    min: 60000,
    max: 80000,
    currency: 'EUR',
    period: 'year',
    isEstimated: false,
  },
  requirements: {
    yearsOfExperience: 5,
    education: null,
    mustHaveSkills: ['TypeScript'],
    niceToHaveSkills: ['AWS'],
    softSkills: [],
    languages: ['English'],
  },
};
afterEach(() => vi.restoreAllMocks());
describe('job agent client', () => {
  it('maps analysis to a reviewable opportunity', () => {
    expect(mapAnalysis(input, output)).toMatchObject({
      role: 'Senior Engineer',
      location: 'Madrid, Spain',
      workType: 'hybrid',
      jobType: 'unknown',
      salary: 'EUR 60,000–80,000 / year',
      salarySource: 'listed',
      experience: '5 years of experience',
      requirements: [
        expect.objectContaining({ text: 'TypeScript', priority: 'required' }),
        expect.objectContaining({ text: 'AWS', priority: 'preferred' }),
        expect.objectContaining({ text: 'English', category: 'language' }),
      ],
    });
  });
  it('classifies explicit employment terms without treating full-time as permanent', () => {
    expect(
      classifyJobType('Full-time software engineer', {
        type: 'full-time',
        details: null,
      }),
    ).toBe('unknown');
    expect(
      classifyJobType('Permanent role', { type: 'full-time', details: null }),
    ).toBe('permanent');
    expect(
      classifyJobType('Six-month role', { type: 'contract', details: null }),
    ).toBe('contract');
    expect(classifyJobType('CDI role')).toBe('permanent');
  });
  it('uses the separate agent URL and bearer token', async () => {
    vi.stubEnv('JOB_AGENT_TOKEN', 'test-token');
    vi.stubEnv('JOB_AGENT_URL', 'http://127.0.0.1:3002');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(output), { status: 200 }));
    await new JobAgentClient().analyze(input);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:3002/analyze'),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ description: input.description }),
      }),
    );
    vi.unstubAllEnvs();
  });
  it('rejects a non-job response from the agent', async () => {
    vi.stubEnv('JOB_AGENT_TOKEN', 'test-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 422 }),
    );
    await expect(new JobAgentClient().analyze(input)).rejects.toMatchObject({
      status: 422,
    });
    vi.unstubAllEnvs();
  });
});
