import {
  profileFromCv,
  validateCvText,
  type ExtractedProfile,
} from './cv-import.js';

const extraction: ExtractedProfile = {
  currentRole: 'Product Designer',
  experience: [
    {
      role: 'Product Designer',
      company: 'Acme',
      period: '2022–present',
      description: 'Designed products.',
    },
  ],
  skills: [{ name: 'Figma', proficiency: 'Unspecified' }],
  education: [],
  certifications: [],
  languages: [],
  interests: [],
  workModels: [],
  locations: [],
  salaryCurrency: '',
  salaryMinimum: '',
  salaryTarget: '',
};

describe('CV import', () => {
  it('maps extracted fields to a reviewable profile with IDs', () => {
    const profile = profileFromCv(extraction, 'cv.pdf');
    expect(profile.currentRole).toBe('Product Designer');
    expect(profile.experience[0]).toMatchObject({
      role: 'Product Designer',
      id: expect.any(String),
    });
    expect(profile.skills[0]).toMatchObject({
      name: 'Figma',
      proficiency: 'Unspecified',
      id: expect.any(String),
    });
    expect(profile.salaryCurrency).toBe('EUR');
    expect(profile.complete).toBe(false);
    expect(profile.source).toBe('cv');
  });
  it('rejects invalid extraction', () => {
    expect(() =>
      profileFromCv(
        { ...extraction, skills: null } as unknown as ExtractedProfile,
        'cv.pdf',
      ),
    ).toThrow();
    expect(() =>
      profileFromCv(
        { ...extraction, currentRole: 5 } as unknown as ExtractedProfile,
        'cv.pdf',
      ),
    ).toThrow();
  });
  it('validates CV text before extraction', () => {
    expect(validateCvText('  Current Role: Product Designer  ')).toBe(
      'Current Role: Product Designer',
    );
    expect(() => validateCvText(' ')).toThrow();
    expect(() => validateCvText('x'.repeat(100_001))).toThrow();
  });
});
