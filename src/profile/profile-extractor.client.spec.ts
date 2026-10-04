import { ProfileExtractorClient } from './profile-extractor.client.js';

describe('ProfileExtractorClient', () => {
  const client = new ProfileExtractorClient();
  const previous = { ...process.env };
  beforeEach(() => {
    process.env.EXTRACTOR_TOKEN = 'test-token';
    process.env.PROFILE_EXTRACTOR_URL = 'http://127.0.0.1:3001';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...previous };
  });
  it('sends CV text to the private extractor', async () => {
    const output = { currentRole: 'Designer' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => output });
    vi.stubGlobal('fetch', fetchMock);
    await expect(client.extract('CV text')).resolves.toEqual(output);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:3001/extract-profile'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ text: 'CV text' }),
      }),
    );
  });
  it('hides upstream errors and requires a token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('private failure')),
    );
    await expect(client.extract('CV text')).rejects.toThrow(
      'CV extraction is unavailable.',
    );
    delete process.env.EXTRACTOR_TOKEN;
    await expect(client.extract('CV text')).rejects.toThrow(
      'CV extraction is unavailable.',
    );
  });
});
