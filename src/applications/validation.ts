import {
  choice,
  date,
  id,
  list,
  object,
  string,
} from '../common/validation.js';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ImportantDate,
  InterviewRecord,
} from './types.js';

export function validateCreate(value: unknown): CreateApplicationInput {
  const input = object(value);
  return {
    jobId: id(string(input.jobId, 'jobId', 40)),
    appliedOn: date(input.appliedOn, 'appliedOn'),
  };
}
export function validateUpdate(value: unknown): UpdateApplicationInput {
  const input = object(value);
  const importantDates: ImportantDate[] = list(
    input.importantDates,
    'importantDates',
    50,
  ).map((value) => {
    const item = object(value);
    return {
      id: string(item.id, 'date.id', 100),
      label: string(item.label, 'date.label', 500).trim(),
      date: date(item.date, 'date.date'),
    };
  });
  const interviews: InterviewRecord[] = list(
    input.interviews,
    'interviews',
    50,
  ).map((value) => {
    const item = object(value);
    return {
      id: string(item.id, 'interview.id', 100),
      title: string(item.title, 'interview.title', 500).trim(),
      date: date(item.date, 'interview.date'),
      status: choice(item.status, 'interview.status', [
        'scheduled',
        'completed',
        'cancelled',
      ]),
      notes: string(item.notes, 'interview.notes', 10000),
    };
  });
  return {
    stage: choice(input.stage, 'stage', [
      'applied',
      'recruiter-screening',
      'technical-interview',
      'final-interview',
      'offer',
      'accepted',
      'rejected',
      'withdrawn',
    ]),
    appliedOn: date(input.appliedOn, 'appliedOn'),
    notes: string(input.notes, 'notes', 10000),
    importantDates,
    interviews,
  };
}
