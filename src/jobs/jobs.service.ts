import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { jobs } from '../database/schema.js';
import { ProfileService } from '../profile/profile.service.js';
import { randomUUID } from 'node:crypto';
import { JobAgentClient } from './job-agent.client.js';
import { compareOpportunity } from './match-analysis.js';
import {
  validateCapture,
  validateConfirmation,
  validateJobUpdate,
} from './validation.js';
import type { JobOpportunity } from './types.js';

@Injectable()
export class JobsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly profile: ProfileService,
    private readonly agent: JobAgentClient,
  ) {}
  async list(): Promise<JobOpportunity[]> {
    return (
      await this.database.db.select().from(jobs).orderBy(desc(jobs.createdAt))
    ).map((row) => row.data);
  }
  async get(id: string): Promise<JobOpportunity> {
    const [row] = await this.database.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));
    if (!row) throw new NotFoundException('Job opportunity not found.');
    return row.data;
  }
  async analyze(value: unknown): Promise<JobOpportunity> {
    const details = await this.agent.analyze(validateCapture(value));
    const job: JobOpportunity = {
      id: randomUUID(),
      ...details,
      status: 'draft',
      trackingStatus: 'saved',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    await this.database.db.insert(jobs).values({ id: job.id, data: job });
    return job;
  }
  async confirm(id: string, value: unknown): Promise<JobOpportunity> {
    const previous = await this.get(id);
    const job: JobOpportunity = {
      ...previous,
      ...validateConfirmation(value),
      status: 'confirmed',
    };
    await this.database.db
      .update(jobs)
      .set({ data: job })
      .where(eq(jobs.id, id));
    return job;
  }
  async update(id: string, value: unknown): Promise<JobOpportunity> {
    const job = { ...(await this.get(id)), ...validateJobUpdate(value) };
    await this.database.db
      .update(jobs)
      .set({ data: job })
      .where(eq(jobs.id, id));
    return job;
  }
  async match(id: string) {
    return compareOpportunity(await this.get(id), await this.profile.get());
  }
  async markApplied(id: string) {
    const job = await this.get(id);
    await this.database.db
      .update(jobs)
      .set({ data: { ...job, trackingStatus: 'applied' } })
      .where(eq(jobs.id, id));
  }
}
