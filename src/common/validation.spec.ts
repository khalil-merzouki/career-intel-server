import { validateProfile } from '../profile/validation.js';
import { emptyProfile } from '../profile/profile.service.js';
import {
  validateCapture,
  validateConfirmation,
  validateExtraction,
  validateJobUpdate,
} from '../jobs/validation.js';
import { validateCreate, validateUpdate } from '../applications/validation.js';
import type { JobOpportunity } from '../jobs/types.js';
import { compareOpportunity } from '../jobs/match-analysis.js';
import { choice, date, id, list, object, string } from './validation.js';

describe('request and domain validation', () => {
  it('checks primitive values and calendar dates', () => {
    expect(object({ x: 1 })).toEqual({ x: 1 });
    expect(() => object([])).toThrow();
    expect(string('x', 'name')).toBe('x');
    expect(() => string(1, 'name')).toThrow();
    expect(list([], 'entries')).toEqual([]);
    expect(() => list({}, 'entries')).toThrow();
    expect(choice('a', 'letter', ['a', 'b'])).toBe('a');
    expect(() => choice('c', 'letter', ['a', 'b'])).toThrow();
    expect(date('2024-02-29', 'date')).toBe('2024-02-29');
    expect(() => date('2024-02-30', 'date')).toThrow();
    expect(id('47b6e9b2-36bd-469c-aa50-222222222222')).toBeTruthy();
    expect(() => id('bad')).toThrow();
  });
  it('validates profile and rejects malformed nested records', () => {
    expect(validateProfile(emptyProfile)).toEqual(emptyProfile);
    expect(() =>
      validateProfile({
        ...emptyProfile,
        skills: [{ id: '1', name: 'SQL', proficiency: 'invalid' }],
      }),
    ).toThrow();
  });
  it('validates job capture, confirmation, and update', () => {
    const captured = validateCapture({
      url: 'https://example.com',
      description: 'x'.repeat(100),
    });
    expect(() =>
      validateCapture({
        url: 'javascript:alert(1)',
        description: 'x'.repeat(100),
      }),
    ).toThrow();
    const job: JobOpportunity = {
      id: '47b6e9b2-36bd-469c-aa50-222222222222',
      ...captured,
      role: 'Engineer',
      company: 'Acme',
      location: 'Unknown',
      workType: 'unknown',
      salary: '',
      salarySource: 'estimated',
      seniority: '',
      experience: '',
      requirements: [],
      status: 'draft',
      trackingStatus: 'saved',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    expect(validateConfirmation(job).role).toBe(job.role);
    expect(
      validateExtraction({
        ...job,
        requirements: [
          { category: 'skill', text: 'React', priority: 'required' },
        ],
      }).requirements[0].id,
    ).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      validateJobUpdate({ notes: '', trackingStatus: 'archived' })
        .trackingStatus,
    ).toBe('archived');
    expect(() =>
      validateJobUpdate({ notes: '', trackingStatus: 'invalid' }),
    ).toThrow();
    expect(compareOpportunity(job, emptyProfile).state).toBe('job-unconfirmed');
  });
  it('validates application inputs', () => {
    expect(
      validateCreate({
        jobId: '47b6e9b2-36bd-469c-aa50-222222222222',
        appliedOn: '2026-10-02',
      }).appliedOn,
    ).toBe('2026-10-02');
    expect(
      validateUpdate({
        stage: 'offer',
        appliedOn: '2026-10-02',
        notes: '',
        importantDates: [],
        interviews: [],
      }).stage,
    ).toBe('offer');
    expect(() =>
      validateUpdate({
        stage: 'wrong',
        appliedOn: '2026-10-02',
        notes: '',
        importantDates: [],
        interviews: [],
      }),
    ).toThrow();
  });
});
