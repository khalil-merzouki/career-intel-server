import { ServiceUnavailableException } from '@nestjs/common';
import { JobExtractorClient } from './job-extractor.client.js';

const input = {
  url: '',
  description:
    'A valid job description of sufficient length for this test. It describes software engineering work and required experience in development.',
};

describe('JobExtractorClient', () => {
  const originalToken = process.env.EXTRACTOR_TOKEN;
  const originalUrl = process.env.JOB_EXTRACTOR_URL;
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalToken === undefined) delete process.env.EXTRACTOR_TOKEN;
    else process.env.EXTRACTOR_TOKEN = originalToken;
    if (originalUrl === undefined) delete process.env.JOB_EXTRACTOR_URL;
    else process.env.JOB_EXTRACTOR_URL = originalUrl;
  });
  it('sends authenticated data to the configured extractor', async () => {
    process.env.EXTRACTOR_TOKEN = 'test-token';
    process.env.JOB_EXTRACTOR_URL = 'http://127.0.0.1:3001';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'Engineer' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await new JobExtractorClient().extract(input)).toEqual({
      role: 'Engineer',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:3001/extract-job'),
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
      }),
    );
  });
  it('fails closed without credentials or on upstream errors', async () => {
    delete process.env.EXTRACTOR_TOKEN;
    await expect(
      new JobExtractorClient().extract(input),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    process.env.EXTRACTOR_TOKEN = 'test-token';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('private failure')),
    );
    await expect(new JobExtractorClient().extract(input)).rejects.toThrow(
      'Job extraction is unavailable.',
    );
  });
});
