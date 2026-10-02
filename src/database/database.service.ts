import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://admin:admin@127.0.0.1:5432/devdb',
    max: 10,
    connectionTimeoutMillis: 5000,
  });
  readonly db = drizzle(this.pool, { schema });

  async onModuleDestroy() {
    await this.pool.end();
  }
}
