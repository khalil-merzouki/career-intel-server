import {
  BadRequestException,
  ServiceUnavailableException,
  Controller,
  Get,
  Post,
  Put,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProfileService } from './profile.service.js';
import { extractCvText, profileFromCv, validateCvText } from './cv-import.js';
import { ProfileExtractorClient } from './profile-extractor.client.js';

@Controller('api/profile')
export class ProfileController {
  constructor(
    private readonly service: ProfileService,
    private readonly extractor: ProfileExtractorClient,
  ) {}
  @Get() get() {
    return this.service.get();
  }
  @Put() save(@Body() body: unknown) {
    return this.service.save(body);
  }
  @Post('reset') reset() {
    return this.service.reset();
  }
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) =>
        cb(null, /\.(pdf|docx)$/i.test(file.originalname)),
    }),
  )
  async importCv(@UploadedFile() file?: Express.Multer.File) {
    if (!file)
      throw new BadRequestException('Choose a PDF or DOCX CV to import.');
    const text = validateCvText(await extractCvText(file));
    const extracted = await this.extractor.extract(text);
    let profile;
    try {
      profile = profileFromCv(extracted, file.originalname);
    } catch {
      throw new ServiceUnavailableException('CV extraction is unavailable.');
    }
    return this.service.save(profile);
  }
}
