import { BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';
import type { Profile } from './types.js';
import { emptyProfile } from './profile.service.js';

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
export function profileFromCv(text: string, filename: string): Profile {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (text.trim().length < 20 || text.length > 100000)
    throw new BadRequestException('CV is empty or too long.');
  const currentRole =
    lines
      .map((line) =>
        line
          .match(
            /^(?:current role|job title|profession|position)\s*:\s*(.{2,120})$/i,
          )?.[1]
          ?.trim(),
      )
      .find(Boolean) ?? '';
  return {
    ...emptyProfile,
    currentRole,
    source: 'cv',
    importedFile: filename,
    complete: false,
  };
}
