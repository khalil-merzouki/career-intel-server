import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { Profile } from '../profile/types.js';
import type { JobOpportunity } from '../jobs/types.js';
import type { Application } from '../applications/types.js';

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  data: jsonb('data').$type<Profile>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey(),
  data: jsonb('data').$type<JobOpportunity>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id),
    data: jsonb('data').$type<Application>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('applications_job_id_unique').on(table.jobId)],
);
