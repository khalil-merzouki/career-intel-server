import { BadRequestException } from '@nestjs/common';
import { choice, list, object, string } from '../common/validation.js';
import type { Profile } from './types.js';

const strings = (value: unknown, name: string) =>
  list(value, name, 100).map((item) => string(item, name, 200));
const records = (value: unknown, name: string, fields: string[]) =>
  list(value, name, 100).map((item) => {
    const record = object(item);
    for (const field of fields) string(record[field], `${name}.${field}`, 2000);
    return record;
  });
export function validateProfile(value: unknown): Profile {
  const p = object(value);
  const experience = records(p.experience, 'experience', [
    'id',
    'role',
    'company',
    'period',
    'description',
  ]);
  const skills = records(p.skills, 'skills', ['id', 'name', 'proficiency']);
  skills.forEach((s) =>
    choice(s.proficiency, 'proficiency', [
      'Unspecified',
      'Beginner',
      'Intermediate',
      'Advanced',
      'Expert',
    ]),
  );
  const education = records(p.education, 'education', [
    'id',
    'qualification',
    'institution',
    'year',
  ]);
  const certifications = records(p.certifications, 'certifications', [
    'id',
    'name',
    'issuer',
  ]);
  const languages = records(p.languages, 'languages', [
    'id',
    'name',
    'proficiency',
  ]);
  if (typeof p.complete !== 'boolean')
    throw new BadRequestException('Invalid complete.');
  if (p.importedFile !== null) string(p.importedFile, 'importedFile', 255);
  return {
    currentRole: string(p.currentRole, 'currentRole', 500),
    experience: experience as unknown as Profile['experience'],
    skills: skills as unknown as Profile['skills'],
    education: education as unknown as Profile['education'],
    certifications: certifications as unknown as Profile['certifications'],
    languages: languages as unknown as Profile['languages'],
    interests: strings(p.interests, 'interests'),
    workModels: strings(p.workModels, 'workModels'),
    locations: strings(p.locations, 'locations'),
    salaryCurrency: string(p.salaryCurrency, 'salaryCurrency', 10),
    salaryMinimum: string(p.salaryMinimum, 'salaryMinimum', 50),
    salaryTarget: string(p.salaryTarget, 'salaryTarget', 50),
    source:
      p.source === null
        ? null
        : choice(p.source, 'source', ['manual', 'cv'] as const),
    importedFile: p.importedFile as string | null,
    complete: p.complete,
  };
}
