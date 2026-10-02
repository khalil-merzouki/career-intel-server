import { defineConfig } from 'drizzle-kit';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch { /* Use local development defaults when .env is absent. */ }
export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://admin:admin@127.0.0.1:5432/devdb' },
});
