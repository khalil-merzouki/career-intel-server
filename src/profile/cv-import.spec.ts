import { profileFromCv } from './cv-import.js';

describe('CV import', () => {
  it('uses only an explicitly labeled role and marks the profile for review', () => {
    const profile = profileFromCv(
      'Jane Doe\nCurrent Role: Product Designer\nExperienced in research and prototypes.',
      'cv.pdf',
    );
    expect(profile.currentRole).toBe('Product Designer');
    expect(profile.complete).toBe(false);
    expect(profile.source).toBe('cv');
    expect(
      profileFromCv(
        'Jane Doe\nExperienced in product design for eight years.',
        'cv.pdf',
      ).currentRole,
    ).toBe('');
  });
  it('rejects empty CV text', () => {
    expect(() => profileFromCv(' ', 'cv.pdf')).toThrow();
  });
});
