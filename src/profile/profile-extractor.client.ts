import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ExtractedProfile } from './cv-import.js';

@Injectable()
export class ProfileExtractorClient {
  async extract(text: string): Promise<ExtractedProfile> {
    const token = process.env.EXTRACTOR_TOKEN;
    if (!token)
      throw new ServiceUnavailableException('CV extraction is unavailable.');
    const baseUrl =
      process.env.PROFILE_EXTRACTOR_URL ?? 'http://127.0.0.1:3001';
    let endpoint: URL;
    try {
      endpoint = new URL('/extract-profile', baseUrl);
      if (!['http:', 'https:'].includes(endpoint.protocol))
        throw new Error('Invalid protocol');
    } catch {
      throw new ServiceUnavailableException('CV extraction is unavailable.');
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text }),
        redirect: 'error',
        signal: AbortSignal.timeout(35_000),
      });
      if (!response.ok)
        throw new Error(`Extractor returned ${response.status}`);
      return (await response.json()) as ExtractedProfile;
    } catch {
      throw new ServiceUnavailableException('CV extraction is unavailable.');
    }
  }
}
