import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { profiles } from '../database/schema.js';
import type { Profile } from './types.js';
import { validateProfile } from './validation.js';

export const emptyProfile: Profile = {
  currentRole: '',
  experience: [],
  skills: [],
  education: [],
  certifications: [],
  languages: [],
  interests: [],
  workModels: [],
  locations: [],
  salaryCurrency: 'EUR',
  salaryMinimum: '',
  salaryTarget: '',
  source: null,
  importedFile: null,
  complete: false,
};
@Injectable()
export class ProfileService {
  constructor(private readonly database: DatabaseService) {}
  async get(): Promise<Profile> {
    const [row] = await this.database.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, 'default'));
    return row?.data ?? emptyProfile;
  }
  async save(value: unknown): Promise<Profile> {
    const profile = validateProfile(value);
    await this.database.db
      .insert(profiles)
      .values({ id: 'default', data: profile })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { data: profile, updatedAt: new Date() },
      });
    return profile;
  }
  async reset(): Promise<Profile> {
    return this.save(emptyProfile);
  }
}
