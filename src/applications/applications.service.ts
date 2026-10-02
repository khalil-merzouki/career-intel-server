import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { applications, jobs } from '../database/schema.js';
import { JobsService } from '../jobs/jobs.service.js';
import { validateCreate, validateUpdate } from './validation.js';
import type { Application } from './types.js';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jobsService: JobsService,
  ) {}
  private async current(application: Application): Promise<Application> {
    const job = await this.jobsService.get(application.jobId);
    return {
      ...application,
      role: job.role,
      company: job.company,
      location: job.location,
    };
  }
  async list(): Promise<Application[]> {
    const rows = await this.database.db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt));
    const allJobs = await this.database.db.select().from(jobs);
    const byId = new Map(allJobs.map((row) => [row.id, row.data]));
    return rows.map(({ data }) => {
      const job = byId.get(data.jobId);
      return job
        ? {
            ...data,
            role: job.role,
            company: job.company,
            location: job.location,
          }
        : data;
    });
  }
  async get(id: string): Promise<Application> {
    const [row] = await this.database.db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    if (!row) throw new NotFoundException('Application not found.');
    return this.current(row.data);
  }
  async forJob(jobId: string): Promise<Application | null> {
    const [row] = await this.database.db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId));
    return row ? this.current(row.data) : null;
  }
  async source(jobId: string) {
    return this.jobsService.get(jobId);
  }
  async create(value: unknown): Promise<Application> {
    const input = validateCreate(value);
    const job = await this.jobsService.get(input.jobId);
    const existing = await this.forJob(job.id);
    if (existing)
      throw new ConflictException({
        message: 'This opportunity already has an application.',
        applicationId: existing.id,
      });
    const now = new Date().toISOString();
    const application: Application = {
      id: randomUUID(),
      jobId: job.id,
      role: job.role,
      company: job.company,
      location: job.location,
      stage: 'applied',
      appliedOn: input.appliedOn,
      notes: '',
      importantDates: [],
      interviews: [],
      stageHistory: [
        { id: randomUUID(), stage: 'applied', date: input.appliedOn },
      ],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.database.db.transaction(async (tx) => {
        await tx
          .insert(applications)
          .values({ id: application.id, jobId: job.id, data: application });
        await tx
          .update(jobs)
          .set({ data: { ...job, trackingStatus: 'applied' } })
          .where(eq(jobs.id, job.id));
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException(
          'This opportunity already has an application.',
        );
      throw error;
    }
    return application;
  }
  async update(id: string, value: unknown): Promise<Application> {
    const previous = await this.get(id);
    const input = validateUpdate(value);
    const history = previous.stageHistory.map((event, index) =>
      index === 0 && event.stage === 'applied'
        ? { ...event, date: input.appliedOn }
        : event,
    );
    const application: Application = {
      ...previous,
      ...input,
      stageHistory:
        input.stage === previous.stage
          ? history
          : [
              ...history,
              {
                id: randomUUID(),
                stage: input.stage,
                date: new Date().toISOString().slice(0, 10),
              },
            ],
      updatedAt: new Date().toISOString(),
    };
    await this.database.db
      .update(applications)
      .set({ data: application })
      .where(eq(applications.id, id));
    return application;
  }
}
