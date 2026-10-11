import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { jobs } from '../database/schema.js';
import { ProfileService } from '../profile/profile.service.js';
import { randomUUID } from 'node:crypto';
import { JobAgentClient } from './job-agent.client.js';
import { MatchAgentClient } from './match-agent.client.js';
import { compareOpportunity } from './match-analysis.js';
import {
  validateCapture,
  validateConfirmation,
  validateJobUpdate,
} from './validation.js';
import type { JobOpportunity } from './types.js';

const normalizedUrl = (value: string) => {
  if (!value.trim()) return '';
  const url = new URL(value.trim());
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};
const normalizedName = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();
const duplicate = (
  code: 'duplicate_url' | 'similar_job',
  existing: JobOpportunity,
) =>
  new ConflictException({
    code,
    message:
      code === 'duplicate_url'
        ? 'This job URL is already in your opportunities.'
        : 'A job with the same role and company already exists at another URL.',
    existing: {
      id: existing.id,
      role: existing.role,
      company: existing.company,
      url: existing.url,
    },
  });

@Injectable()
export class JobsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly profile: ProfileService,
    private readonly agent: JobAgentClient,
    private readonly matchAgent: MatchAgentClient,
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
    const input = validateCapture(value);
    const existingJobs = await this.list();
    const url = normalizedUrl(input.url);
    const sameUrl =
      url && existingJobs.find((job) => normalizedUrl(job.url) === url);
    if (sameUrl) throw duplicate('duplicate_url', sameUrl);
    const details = await this.agent.analyze({
      description: input.description,
      url: input.url,
    });
    const role = normalizedName(details.role);
    const company = normalizedName(details.company);
    const sameRoleAndCompany =
      role &&
      company &&
      existingJobs.find(
        (job) =>
          normalizedName(job.role) === role &&
          normalizedName(job.company) === company,
      );
    if (sameRoleAndCompany && !input.allowSimilar)
      throw duplicate('similar_job', sameRoleAndCompany);
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
  async evaluateMatch(id: string) {
    const job = await this.get(id);
    if (job.status !== 'confirmed')
      throw new ConflictException(
        'Confirm the job analysis before evaluation.',
      );
    const profile = await this.profile.get();
    if (!profile.complete)
      throw new ConflictException(
        'Complete your Career Profile before evaluation.',
      );
    return this.matchAgent.evaluate(profile, job);
  }
  async markApplied(id: string) {
    const job = await this.get(id);
    await this.database.db
      .update(jobs)
      .set({ data: { ...job, trackingStatus: 'applied' } })
      .where(eq(jobs.id, id));
  }
}
