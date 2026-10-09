import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { JobOpportunityInput, JobRequirement, WorkType } from './types.js';

type Analysis = {
  jobTitle: string;
  company: string | null;
  seniority: string;
  location: {
    city: string | null;
    country: string | null;
    workMode: WorkType;
    details: string | null;
  };
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
    period: string;
    isEstimated: boolean;
  };
  requirements: {
    yearsOfExperience: number | null;
    education: string | null;
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    softSkills: string[];
    languages: string[];
  };
};

export function mapAnalysis(input: JobOpportunityInput, value: unknown) {
  if (!value || typeof value !== 'object')
    throw new ServiceUnavailableException('Job analysis is unavailable.');
  const a = value as Partial<Analysis>;
  const location = a.location;
  const salary = a.salary;
  const requirements = a.requirements;
  if (
    typeof a.jobTitle !== 'string' ||
    (a.company !== null && typeof a.company !== 'string') ||
    typeof a.seniority !== 'string' ||
    !location ||
    !['remote', 'hybrid', 'on-site', 'unknown'].includes(location.workMode) ||
    !salary ||
    typeof salary.currency !== 'string' ||
    typeof salary.period !== 'string' ||
    typeof salary.isEstimated !== 'boolean' ||
    !requirements ||
    !Array.isArray(requirements.mustHaveSkills) ||
    !Array.isArray(requirements.niceToHaveSkills) ||
    !Array.isArray(requirements.softSkills) ||
    !Array.isArray(requirements.languages)
  )
    throw new ServiceUnavailableException('Job analysis is unavailable.');
  const items: JobRequirement[] = [];
  const add = (
    category: JobRequirement['category'],
    text: string,
    priority: JobRequirement['priority'],
  ) => {
    if (typeof text !== 'string' || !text.trim())
      throw new ServiceUnavailableException('Job analysis is unavailable.');
    if (
      !items.some(
        (item) =>
          item.category === category &&
          item.text.toLowerCase() === text.toLowerCase(),
      )
    )
      items.push({ id: randomUUID(), category, text, priority });
  };
  for (const skill of requirements.mustHaveSkills)
    add('skill', skill, 'required');
  for (const skill of requirements.niceToHaveSkills)
    add('skill', skill, 'preferred');
  for (const skill of requirements.softSkills) add('skill', skill, 'required');
  for (const language of requirements.languages)
    add('language', language, 'required');
  if (requirements.education)
    add('education', requirements.education, 'required');
  const amount = (value: number | null) =>
    value === null ? '' : new Intl.NumberFormat('en-US').format(value);
  const salaryText =
    salary.min === null && salary.max === null
      ? ''
      : `${salary.currency} ${amount(salary.min)}${salary.min !== null && salary.max !== null ? '–' : ''}${amount(salary.max)} / ${salary.period}`;
  return {
    ...input,
    role: a.jobTitle,
    company: a.company ?? '',
    location:
      [location.city, location.country].filter(Boolean).join(', ') ||
      location.details ||
      'Unknown',
    workType: location.workMode,
    salary: salaryText,
    salarySource: salary.isEstimated
      ? ('estimated' as const)
      : ('listed' as const),
    seniority: a.seniority === 'unknown' ? '' : a.seniority,
    experience:
      requirements.yearsOfExperience === null
        ? ''
        : `${requirements.yearsOfExperience} years of experience`,
    requirements: items,
  };
}

@Injectable()
export class JobAgentClient {
  async analyze(input: JobOpportunityInput) {
    const token = process.env.JOB_AGENT_TOKEN;
    if (!token)
      throw new ServiceUnavailableException('Job analysis is unavailable.');
    let endpoint: URL;
    try {
      endpoint = new URL(
        '/analyze',
        process.env.JOB_AGENT_URL ?? 'http://127.0.0.1:3002',
      );
      if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error();
    } catch {
      throw new ServiceUnavailableException('Job analysis is unavailable.');
    }
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ description: input.description }),
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ServiceUnavailableException('Job analysis is unavailable.');
    }
    if (response.status === 422)
      throw new UnprocessableEntityException(
        'This text does not appear to be a job description.',
      );
    if (!response.ok)
      throw new ServiceUnavailableException('Job analysis is unavailable.');
    try {
      return mapAnalysis(input, await response.json());
    } catch {
      throw new ServiceUnavailableException('Job analysis is unavailable.');
    }
  }
}
