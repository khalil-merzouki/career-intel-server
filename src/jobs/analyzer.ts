import { randomUUID } from 'node:crypto';
import type {
  JobOpportunity,
  JobOpportunityInput,
  JobRequirement,
  RequirementCategory,
  RequirementPriority,
} from './types.js';

function matchedPriority(
  description: string,
  term: string,
): RequirementPriority {
  const index = description.toLowerCase().indexOf(term.toLowerCase());
  const context = description
    .slice(
      Math.max(0, index - 70),
      Math.min(description.length, index + term.length + 70),
    )
    .toLowerCase();
  if (/preferred|nice.to.have|bonus|desirable|a plus/.test(context))
    return 'preferred';
  return 'required';
}

function sentenceFor(description: string, expressions: RegExp[]) {
  const sentence = description
    .split(/[\n.!?;]+/)
    .map((part) => part.trim())
    .find((part) => expressions.some((expression) => expression.test(part)));
  return sentence ?? '';
}

function uniqueRequirement(
  requirements: JobRequirement[],
  category: RequirementCategory,
  text: string,
  priority: RequirementPriority,
) {
  if (
    requirements.some(
      (item) =>
        item.category === category &&
        item.text.toLowerCase() === text.toLowerCase(),
    )
  )
    return;
  requirements.push({
    id: randomUUID(),
    category,
    text,
    priority,
  });
}

function extractRequirements(input: JobOpportunityInput) {
  const description = input.description;
  const requirements: JobRequirement[] = [];
  const skills = [
    'React',
    'TypeScript',
    'JavaScript',
    'Python',
    'SQL',
    'AWS',
    'Azure',
    'Figma',
    'Product design',
    'User research',
    'Data analysis',
    'Agile',
    'Communication',
    'Leadership',
    'Node.js',
    'Docker',
    'Kubernetes',
    'Machine learning',
    'Project management',
    'Excel',
  ];
  for (const skill of skills) {
    if (
      new RegExp(
        `\\b${skill.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`,
        'i',
      ).test(description)
    ) {
      uniqueRequirement(
        requirements,
        'skill',
        skill,
        matchedPriority(description, skill),
      );
    }
  }

  const languages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Arabic',
    'Dutch',
    'Portuguese',
    'Italian',
    'Japanese',
    'Mandarin',
  ];
  for (const language of languages) {
    if (new RegExp(`\\b${language}\\b`, 'i').test(description)) {
      uniqueRequirement(
        requirements,
        'language',
        language,
        matchedPriority(description, language),
      );
    }
  }

  const certificationPatterns = [
    /(?:PMP|CISSP|CPA|CFA|AWS Certified [A-Za-z ]+|Google Cloud [A-Za-z ]+|professional certification)/gi,
  ];
  for (const expression of certificationPatterns) {
    for (const match of description.matchAll(expression)) {
      uniqueRequirement(
        requirements,
        'certification',
        match[0].trim(),
        matchedPriority(description, match[0]),
      );
    }
  }

  const workSentence = sentenceFor(description, [
    /work authorization/i,
    /eligible to work/i,
    /time zone/i,
    /travel up to/i,
    /relocation required/i,
  ]);
  if (workSentence) {
    uniqueRequirement(
      requirements,
      'work',
      workSentence,
      matchedPriority(description, workSentence),
    );
  }
  const locationSentence = sentenceFor(description, [
    /located in/i,
    /based in/i,
    /relocate/i,
    /must be in/i,
  ]);
  if (locationSentence && locationSentence !== workSentence) {
    uniqueRequirement(
      requirements,
      'location',
      locationSentence,
      matchedPriority(description, locationSentence),
    );
  }
  return requirements;
}

function getJobDetails(description: string, url: string) {
  const lines = description
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labeledRole = description
    .match(/^(?:role|job title|position)\s*:\s*(.+)$/im)?.[1]
    ?.trim();
  const firstLine = lines[0]?.replace(/^[-*#\s]+/, '').trim() ?? '';
  const role = labeledRole ?? firstLine.split(/\s+(?:at|@|[—|])\s+/i)[0].trim();
  const company =
    description.match(/^(?:company|employer)\s*:\s*(.+)$/im)?.[1]?.trim() ??
    description
      .match(/\bat\s+([A-Z][\w&.' -]{1,50})(?:\s*[,.\n]|$)/)?.[1]
      ?.trim() ??
    '';

  let workType: JobOpportunity['workType'] = 'unknown';
  if (/\bremote\b/i.test(description)) workType = 'remote';
  else if (/\bhybrid\b/i.test(description)) workType = 'hybrid';
  else if (/on[ -]site|in.office|office.based/i.test(description))
    workType = 'on-site';

  const labeledLocation = description
    .match(/^(?:location|based in|located in)\s*:\s*(.+)$/im)?.[1]
    ?.trim();
  const remoteLocation = description
    .match(/\bremote\s+(?:in|from)\s+([A-Z][\w ,'-]{1,45})/i)?.[1]
    ?.trim();
  const specifiedLocation =
    labeledLocation && !/^(remote|hybrid|on[ -]?site)$/i.test(labeledLocation)
      ? labeledLocation
      : undefined;
  const location =
    specifiedLocation ??
    remoteLocation ??
    (workType === 'remote' ? 'Worldwide' : 'Unknown');

  const salaryLine = sentenceFor(description, [
    /salary/i,
    /compensation/i,
    /pay range/i,
    /[$€£]/,
  ]);
  const listedSalary = salaryLine
    .match(
      /(?:[$€£]\s?\d[\d,.]*(?:\s?(?:-|–|to)\s?[$€£]?\s?\d[\d,.]*)?(?:\s?(?:k|K|per year|annually|\/year))?)/i,
    )?.[0]
    ?.trim();
  const seniority =
    role.match(
      /\b(intern|junior|mid[- ]level|senior|lead|staff|principal|director|head)\b/i,
    )?.[0] ??
    sentenceFor(description, [
      /\b(intern|junior|mid[- ]level|senior|lead|staff|principal|director|head)\b/i,
    ]);
  const experience =
    description.match(
      /\b(?:at least |minimum of )?\d+(?:\s*[-–+]\s*\d+)?\s+years?\s+(?:of\s+)?(?:relevant\s+)?experience\b/i,
    )?.[0] ?? sentenceFor(description, [/years? of experience/i]);
  const currency = /£|\b(?:UK|United Kingdom|London)\b/i.test(description)
    ? '£'
    : /\$|\b(?:US|USA|United States|New York|California)\b/i.test(description)
      ? '$'
      : '€';
  const normalizedSeniority = `${role} ${seniority}`.toLowerCase();
  const [estimateMin, estimateMax] =
    /senior|lead|staff|principal|director|head/.test(normalizedSeniority)
      ? [75000, 105000]
      : /junior|intern/.test(normalizedSeniority)
        ? [35000, 50000]
        : [50000, 75000];
  const estimatedSalary = `${currency}${estimateMin.toLocaleString('en-US')}–${currency}${estimateMax.toLocaleString('en-US')} / year`;

  return {
    role,
    company,
    location,
    workType,
    salary: listedSalary ?? estimatedSalary,
    salarySource: listedSalary ? ('listed' as const) : ('estimated' as const),
    seniority,
    experience,
    url,
  };
}

export function analyze(input: JobOpportunityInput): JobOpportunity {
  const details = getJobDetails(input.description, input.url);
  return {
    id: randomUUID(),
    ...input,
    ...details,
    requirements: extractRequirements(input),
    status: 'draft',
    trackingStatus: 'saved',
    notes: '',
    createdAt: new Date().toISOString(),
  };
}
