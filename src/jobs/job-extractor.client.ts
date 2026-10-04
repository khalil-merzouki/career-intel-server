import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { JobOpportunityInput } from './types.js';

@Injectable()
export class JobExtractorClient {
  async extract(input: JobOpportunityInput): Promise<unknown> {
    const token = process.env.EXTRACTOR_TOKEN;
    if (!token)
      throw new ServiceUnavailableException(
        'Job extraction is not configured.',
      );
    const baseUrl = process.env.JOB_EXTRACTOR_URL ?? 'http://127.0.0.1:3001';
    let endpoint: URL;
    try {
      endpoint = new URL('/extract-job', baseUrl);
      if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'Job extraction is not configured.',
      );
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
        redirect: 'error',
        signal: AbortSignal.timeout(35_000),
      });
      if (!response.ok) throw new Error('Extractor failed');
      return await response.json();
    } catch {
      throw new ServiceUnavailableException('Job extraction is unavailable.');
    }
  }
}
