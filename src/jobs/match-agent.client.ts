import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Profile } from '../profile/types.js';
import type { JobOpportunity, RecruiterMatch } from './types.js';

export function validateRecruiterMatch(value: unknown): RecruiterMatch {
  if (!value || typeof value !== 'object')
    throw new ServiceUnavailableException('Match evaluation is unavailable.');
  const result = value as Partial<RecruiterMatch>;
  if (
    !['unscorable', 'below-threshold', 'recruiter-reviewed'].includes(
      result.stage ?? '',
    ) ||
    (result.score !== null &&
      (typeof result.score !== 'number' ||
        !Number.isFinite(result.score) ||
        result.score < 0 ||
        result.score > 100)) ||
    result.threshold !== 65 ||
    !Array.isArray(result.matchedSkills) ||
    !result.matchedSkills.every((v) => typeof v === 'string') ||
    !Array.isArray(result.missingSkills) ||
    !result.missingSkills.every((v) => typeof v === 'string') ||
    (result.recommendInterview !== null &&
      typeof result.recommendInterview !== 'boolean') ||
    typeof result.summary !== 'string' ||
    (result.stage === 'recruiter-reviewed' &&
      (result.score === null ||
        typeof result.recommendInterview !== 'boolean')) ||
    (result.stage !== 'recruiter-reviewed' &&
      result.recommendInterview !== null)
  )
    throw new ServiceUnavailableException('Match evaluation is unavailable.');
  return result as RecruiterMatch;
}

@Injectable()
export class MatchAgentClient {
  async evaluate(
    profile: Profile,
    job: JobOpportunity,
  ): Promise<RecruiterMatch> {
    const token = process.env.MATCH_AGENT_TOKEN;
    if (!token)
      throw new ServiceUnavailableException('Match evaluation is unavailable.');
    let endpoint: URL;
    try {
      endpoint = new URL(
        '/evaluate',
        process.env.MATCH_AGENT_URL ?? 'http://127.0.0.1:3003',
      );
      if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error();
    } catch {
      throw new ServiceUnavailableException('Match evaluation is unavailable.');
    }
    const {
      importedFile: _importedFile,
      source: _source,
      complete: _complete,
      ...profileContent
    } = profile;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          profile: profileContent,
          job: {
            role: job.role,
            description: job.description,
            requirements: job.requirements,
          },
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      throw new ServiceUnavailableException('Match evaluation is unavailable.');
    }
    if (!response.ok)
      throw new ServiceUnavailableException('Match evaluation is unavailable.');
    try {
      return validateRecruiterMatch(await response.json());
    } catch {
      throw new ServiceUnavailableException('Match evaluation is unavailable.');
    }
  }
}
