import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { choice, list, object, string } from '../common/validation.js';
import type {
  JobOpportunity,
  JobOpportunityInput,
  JobRequirement,
} from './types.js';

export function validateCapture(value: unknown): JobOpportunityInput {
  const input = object(value);
  const description = string(input.description, 'description', 50000);
  const url = string(input.url, 'url', 2000);
  if (description.trim().length < 100)
    throw new BadRequestException(
      'Paste at least 100 characters from the job description.',
    );
  if (url.trim()) {
    try {
      if (!['http:', 'https:'].includes(new URL(url).protocol))
        throw new Error();
    } catch {
      throw new BadRequestException(
        'Enter a valid job URL beginning with http:// or https://.',
      );
    }
  }
  return { description, url };
}
export function validateConfirmation(
  value: unknown,
): Pick<
  JobOpportunity,
  | 'role'
  | 'company'
  | 'location'
  | 'workType'
  | 'salary'
  | 'salarySource'
  | 'seniority'
  | 'experience'
  | 'requirements'
> {
  const input = object(value);
  const requirements: JobRequirement[] = list(
    input.requirements,
    'requirements',
    100,
  ).map((entry) => {
    const item = object(entry);
    return {
      id: string(item.id, 'requirement.id', 100),
      category: choice(item.category, 'category', [
        'skill',
        'language',
        'certification',
        'location',
        'work',
      ]),
      text: string(item.text, 'requirement.text', 1000),
      priority: choice(item.priority, 'priority', ['required', 'preferred']),
    };
  });
  return {
    role: string(input.role, 'role', 500),
    company: string(input.company, 'company', 500),
    location: string(input.location, 'location', 500),
    workType: choice(input.workType, 'workType', [
      'remote',
      'hybrid',
      'on-site',
      'unknown',
    ]),
    salary: string(input.salary, 'salary', 500),
    salarySource: choice(input.salarySource, 'salarySource', [
      'listed',
      'estimated',
    ]),
    seniority: string(input.seniority, 'seniority', 500),
    experience: string(input.experience, 'experience', 1000),
    requirements,
  };
}
export function validateJobUpdate(
  value: unknown,
): Pick<JobOpportunity, 'notes' | 'trackingStatus'> {
  const input = object(value);
  return {
    notes: string(input.notes, 'notes', 10000),
    trackingStatus: choice(input.trackingStatus, 'trackingStatus', [
      'saved',
      'applied',
      'archived',
    ]),
  };
}

export function validateExtraction(value: unknown) {
  const extracted = object(value);
  const requirements = list(extracted.requirements, 'requirements', 100).map(
    (entry) => ({ ...object(entry), id: randomUUID() }),
  );
  return validateConfirmation({ ...extracted, requirements });
}
