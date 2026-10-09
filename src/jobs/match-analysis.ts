import type { Profile } from '../profile/types.js';
import type { JobOpportunity, MatchAnalysis, MatchFinding } from './types.js';

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ');
const empty: Pick<
  MatchAnalysis,
  'strongMatches' | 'partialMatches' | 'missingSkills' | 'eligibilityGaps'
> = {
  strongMatches: [],
  partialMatches: [],
  missingSkills: [],
  eligibilityGaps: [],
};

function finding(
  id: string,
  title: string,
  category: string,
  jobEvidence: string,
  profileEvidence: string,
  explanation: string,
  priority?: MatchFinding['priority'],
): MatchFinding {
  return {
    id,
    title,
    category,
    jobEvidence,
    profileEvidence,
    explanation,
    priority,
  };
}

function documentedExperience(profile: Profile, term: string) {
  const needle = normalize(term);
  return profile.experience.find((item) =>
    normalize(`${item.role} ${item.description}`).includes(needle),
  );
}

function yearsOfExperience(profile: Profile): number | null {
  const intervals = profile.experience
    .map(({ period }) => {
      const match = period.match(
        /^(0[1-9]|1[0-2])\/(\d{4})\s*-\s*(?:(0[1-9]|1[0-2])\/(\d{4})|present)$/i,
      );
      if (!match) return null;
      const start = Number(match[2]) * 12 + Number(match[1]) - 1;
      const end = match[4]
        ? Number(match[4]) * 12 + Number(match[3]) - 1
        : new Date().getFullYear() * 12 + new Date().getMonth();
      return end >= start ? ([start, end] as const) : null;
    })
    .filter((item): item is readonly [number, number] => item !== null)
    .sort((a, b) => a[0] - b[0]);
  if (!intervals.length) return null;
  let months = 0;
  let [start, end] = intervals[0];
  for (const [nextStart, nextEnd] of intervals.slice(1)) {
    if (nextStart <= end + 1) end = Math.max(end, nextEnd);
    else {
      months += end - start + 1;
      start = nextStart;
      end = nextEnd;
    }
  }
  months += end - start + 1;
  return months / 12;
}

export function compareOpportunity(
  job: JobOpportunity,
  profile: Profile,
): MatchAnalysis {
  if (job.status !== 'confirmed') return { state: 'job-unconfirmed', ...empty };
  if (!profile.complete) return { state: 'profile-incomplete', ...empty };
  const result: MatchAnalysis = {
    state: 'ready',
    strongMatches: [],
    partialMatches: [],
    missingSkills: [],
    eligibilityGaps: [],
  };

  for (const requirement of job.requirements) {
    const title = requirement.text.trim();
    if (!title) continue;
    const basis = `Confirmed ${requirement.priority} ${requirement.category}: ${title}`;
    if (requirement.category === 'skill') {
      const skill = profile.skills.find(
        (item) => normalize(item.name) === normalize(title),
      );
      if (skill) {
        result.strongMatches.push(
          finding(
            requirement.id,
            title,
            'Skill',
            basis,
            `${skill.name} · ${skill.proficiency}`,
            'This skill is explicitly listed in your Career Profile.',
            requirement.priority,
          ),
        );
      } else {
        const experience = documentedExperience(profile, title);
        if (experience)
          result.partialMatches.push(
            finding(
              requirement.id,
              title,
              'Skill',
              basis,
              `${experience.role} at ${experience.company}: ${experience.description || 'role title'}`,
              'Your work history mentions this skill, but it is not in your skills list. Review the depth of experience.',
              requirement.priority,
            ),
          );
        else
          result.missingSkills.push(
            finding(
              requirement.id,
              title,
              'Skill',
              basis,
              'No matching skill or experience entry found.',
              'This skill is not documented in your Career Profile. Add it if you have it.',
              requirement.priority,
            ),
          );
      }
    } else if (requirement.category === 'language') {
      const language = profile.languages.find(
        (item) => normalize(item.name) === normalize(title),
      );
      if (language)
        result.strongMatches.push(
          finding(
            requirement.id,
            title,
            'Language',
            basis,
            `${language.name} · ${language.proficiency}`,
            'The language is listed in your profile; check that your level meets the job wording.',
            requirement.priority,
          ),
        );
      else
        result.eligibilityGaps.push(
          finding(
            requirement.id,
            title,
            'Language',
            basis,
            'No matching language is listed.',
            'The requested language is not documented in your profile.',
            requirement.priority,
          ),
        );
    } else if (requirement.category === 'education') {
      const education = profile.education.find(
        (item) =>
          normalize(item.qualification).includes(normalize(title)) ||
          normalize(title).includes(normalize(item.qualification)),
      );
      if (education)
        result.strongMatches.push(
          finding(
            requirement.id,
            title,
            'Education',
            basis,
            `${education.qualification} · ${education.institution}`,
            'This education is listed in your profile.',
            requirement.priority,
          ),
        );
      else
        result.eligibilityGaps.push(
          finding(
            requirement.id,
            title,
            'Education',
            basis,
            'No matching education is listed.',
            'The requested education is not documented in your profile.',
            requirement.priority,
          ),
        );
    } else if (requirement.category === 'certification') {
      const certification = profile.certifications.find(
        (item) => normalize(item.name) === normalize(title),
      );
      if (certification)
        result.strongMatches.push(
          finding(
            requirement.id,
            title,
            'Certification',
            basis,
            `${certification.name} · ${certification.issuer}`,
            'This certification is explicitly listed in your profile.',
            requirement.priority,
          ),
        );
      else
        result.eligibilityGaps.push(
          finding(
            requirement.id,
            title,
            'Certification',
            basis,
            'No matching certification is listed.',
            'This credential is not documented in your profile.',
            requirement.priority,
          ),
        );
    } else {
      result.eligibilityGaps.push(
        finding(
          requirement.id,
          title,
          requirement.category === 'location'
            ? 'Location constraint'
            : 'Work constraint',
          basis,
          profile.locations.length || profile.workModels.length
            ? `Locations: ${profile.locations.join(', ') || 'not set'}; work models: ${profile.workModels.join(', ') || 'not set'}`
            : 'Location and work preferences are not set.',
          'This constraint needs your review; preferences alone cannot verify eligibility.',
          requirement.priority,
        ),
      );
    }
  }

  if (job.workType !== 'unknown') {
    const models = profile.workModels.map(normalize);
    const label =
      job.workType === 'on-site'
        ? 'On-site'
        : job.workType === 'hybrid'
          ? 'Hybrid'
          : 'Remote';
    const item = finding(
      'work-type',
      `${label} work`,
      'Work model',
      `Job work type: ${label}`,
      profile.workModels.length
        ? `Preferred work models: ${profile.workModels.join(', ')}`
        : 'No work model preference recorded.',
      models.includes(normalize(label))
        ? 'The work model matches a stated preference.'
        : 'The work model is not among your stated preferences; review your flexibility.',
    );
    if (models.includes(normalize(label))) result.strongMatches.push(item);
    else result.eligibilityGaps.push(item);
  }
  if (job.location && !/^(worldwide|unknown)$/i.test(job.location.trim())) {
    const locations = profile.locations.map(normalize);
    const exact = locations.includes(normalize(job.location));
    const item = finding(
      'location',
      job.location,
      'Location',
      `Job location: ${job.location}`,
      profile.locations.length
        ? `Preferred locations: ${profile.locations.join(', ')}`
        : 'No preferred location recorded.',
      exact
        ? 'The location matches a stated preference.'
        : 'The job location is not listed among your preferences; location eligibility is unverified.',
    );
    if (exact) result.strongMatches.push(item);
    else result.eligibilityGaps.push(item);
  }
  const requiredYears = Number(
    job.experience.match(
      /\b(\d+)(?:\s*[-–]\s*\d+)?\s*(?:\+|or more)?\s*years?/i,
    )?.[1],
  );
  if (requiredYears > 0) {
    const years = yearsOfExperience(profile);
    const evidence =
      years === null
        ? 'No parseable dated experience entries.'
        : `${years.toFixed(1)} years across dated profile roles (overlap counted once).`;
    const item = finding(
      'experience',
      job.experience,
      'Experience',
      `Job expectation: ${job.experience}`,
      evidence,
      years === null
        ? 'The current profile does not provide enough dated work history to verify this expectation.'
        : years >= requiredYears
          ? 'Documented work history meets the stated minimum duration; relevance still needs review.'
          : 'Documented work history is shorter than the stated minimum; review any unlisted experience.',
    );
    if (years !== null && years >= requiredYears)
      result.strongMatches.push(item);
    else result.eligibilityGaps.push(item);
  }
  if (job.seniority.trim()) {
    const level = job.seniority.match(
      /\b(intern|junior|mid|senior|lead|staff|principal|director|head)\b/i,
    )?.[0];
    if (level) {
      const title = profile.currentRole || profile.experience[0]?.role || '';
      const same = new RegExp(`\\b${level}\\b`, 'i').test(title);
      const item = finding(
        'seniority',
        `${level} seniority`,
        'Seniority',
        `Job seniority: ${job.seniority}`,
        title ? `Current role: ${title}` : 'Current role is not listed.',
        same
          ? 'The seniority term appears in your current role; responsibilities still need review.'
          : 'Your current role does not explicitly establish this seniority level.',
      );
      if (same) result.strongMatches.push(item);
      else result.partialMatches.push(item);
    }
  }
  if (job.salary.trim() && (profile.salaryMinimum || profile.salaryTarget)) {
    const expectation = [profile.salaryMinimum, profile.salaryTarget]
      .filter(Boolean)
      .join('–');
    result.eligibilityGaps.push(
      finding(
        'salary',
        'Salary expectations',
        'Compensation',
        `${job.salarySource === 'estimated' ? 'Estimated' : 'Listed'} job salary: ${job.salary}`,
        `Your stated expectation: ${expectation} ${profile.salaryCurrency}`,
        job.salarySource === 'estimated'
          ? 'The job did not state a salary. This estimate cannot establish compensation fit.'
          : 'Compare currency, pay period, and total compensation before deciding whether this range fits.',
      ),
    );
  }
  return result;
}
