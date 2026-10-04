import { BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';
import { randomUUID } from 'node:crypto';
import type { Profile } from './types.js';
import { emptyProfile } from './profile.service.js';
import { validateProfile } from './validation.js';

export interface ExtractedProfile {
  currentRole: string;
  experience: {
    role: string;
    company: string;
    period: string;
    description: string;
  }[];
  skills: {
    name: string;
    proficiency: Profile['skills'][number]['proficiency'];
  }[];
  education: { qualification: string; institution: string; year: string }[];
  certifications: { name: string; issuer: string }[];
  languages: { name: string; proficiency: string }[];
  interests: string[];
  workModels: string[];
  locations: string[];
  salaryCurrency: string;
  salaryMinimum: string;
  salaryTarget: string;
}

export function validateCvText(text: string): string {
  const cleaned = text.trim();
  if (cleaned.length < 20 || cleaned.length > 100_000)
    throw new BadRequestException('CV is empty or too long.');
  return cleaned;
}

export async function extractCvText(
  file: Express.Multer.File,
): Promise<string> {
  if (/\.docx$/i.test(file.originalname))
    return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  if (/\.pdf$/i.test(file.originalname)) {
    try {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const document = await getDocument({
        data: new Uint8Array(file.buffer),
        useSystemFonts: true,
      }).promise;
      if (document.numPages > 20)
        throw new BadRequestException('CV has too many pages.');
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(
          content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' '),
        );
      }
      return pages.join('\n');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not read this PDF.');
    }
  }
  throw new BadRequestException('Choose a PDF or DOCX CV.');
}
export function profileFromCv(
  extracted: ExtractedProfile,
  filename: string,
): Profile {
  if (
    !extracted ||
    ![
      extracted.experience,
      extracted.skills,
      extracted.education,
      extracted.certifications,
      extracted.languages,
      extracted.interests,
      extracted.workModels,
      extracted.locations,
    ].every(Array.isArray)
  )
    throw new BadRequestException('Invalid CV extraction.');
  return validateProfile({
    ...emptyProfile,
    ...extracted,
    experience: extracted.experience.map((item) => ({
      id: randomUUID(),
      ...item,
    })),
    skills: extracted.skills.map((item) => ({ id: randomUUID(), ...item })),
    education: extracted.education.map((item) => ({
      id: randomUUID(),
      ...item,
    })),
    certifications: extracted.certifications.map((item) => ({
      id: randomUUID(),
      ...item,
    })),
    languages: extracted.languages.map((item) => ({
      id: randomUUID(),
      ...item,
    })),
    salaryCurrency: extracted.salaryCurrency || emptyProfile.salaryCurrency,
    source: 'cv',
    importedFile: filename,
    complete: false,
  });
}
