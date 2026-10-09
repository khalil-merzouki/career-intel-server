import { Injectable } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service.js';
import type { Application } from '../applications/types.js';
import { JobsService } from '../jobs/jobs.service.js';
import { compareOpportunity } from '../jobs/match-analysis.js';
import type { JobOpportunity, JobRequirement } from '../jobs/types.js';
import { ProfileService } from '../profile/profile.service.js';
import type { Profile } from '../profile/types.js';

export interface RequirementInsight {
  name: string;
  category: JobRequirement['category'];
  opportunityCount: number;
  requiredCount: number;
  applicationCount: number;
  jobIds: string[];
}
export interface SkillInsight extends RequirementInsight {
  category: 'skill';
  alignment: 'strong' | 'partial' | 'gap' | 'unassessed';
  impact: string;
}
export interface CareerInsight {
  title: string;
  explanation: string;
  href: '/profile' | '/profile/setup/skills' | '/jobs';
}
export interface InsightsSummary {
  profileReady: boolean;
  analyzedOpportunityCount: number;
  applicationCount: number;
  skillDemand: SkillInsight[];
  skillGaps: SkillInsight[];
  highValueSkills: SkillInsight[];
  strongSkills: SkillInsight[];
  recurringRequirements: RequirementInsight[];
  careerInsights: CareerInsight[];
}

export function aggregateInsights(
  profile: Profile,
  jobs: JobOpportunity[],
  applications: Application[],
): InsightsSummary {
  const included = jobs.filter(
    (job) => job.status === 'confirmed' && job.trackingStatus !== 'archived',
  );
  const includedIds = new Set(included.map((job) => job.id));
  const appliedIds = new Set(
    applications
      .map((application) => application.jobId)
      .filter((id) => includedIds.has(id)),
  );
  const requirements = new Map<string, RequirementInsight>();
  const alignments = new Map<string, Set<SkillInsight['alignment']>>();
  for (const job of included) {
    const match = profile.complete ? compareOpportunity(job, profile) : null;
    const perJob = new Map<
      string,
      { requirement: JobRequirement; required: boolean }
    >();
    for (const requirement of job.requirements) {
      const name = requirement.text.trim();
      if (!name) continue;
      const key = `${requirement.category}:${name.toLocaleLowerCase().replace(/\s+/g, ' ')}`;
      const previous = perJob.get(key);
      perJob.set(key, {
        requirement: previous?.requirement ?? requirement,
        required:
          requirement.priority === 'required' || Boolean(previous?.required),
      });
      if (requirement.category === 'skill' && match?.state === 'ready') {
        const alignment: SkillInsight['alignment'] = match.strongMatches.some(
          (item) => item.id === requirement.id,
        )
          ? 'strong'
          : match.partialMatches.some((item) => item.id === requirement.id)
            ? 'partial'
            : 'gap';
        const values =
          alignments.get(key) ?? new Set<SkillInsight['alignment']>();
        values.add(alignment);
        alignments.set(key, values);
      }
    }
    for (const [key, { requirement, required }] of perJob) {
      const previous = requirements.get(key) ?? {
        name: requirement.text.trim(),
        category: requirement.category,
        opportunityCount: 0,
        requiredCount: 0,
        applicationCount: 0,
        jobIds: [],
      };
      previous.opportunityCount += 1;
      if (required) previous.requiredCount += 1;
      if (appliedIds.has(job.id)) previous.applicationCount += 1;
      previous.jobIds.push(job.id);
      requirements.set(key, previous);
    }
  }
  const skillDemand: SkillInsight[] = [...requirements]
    .filter(([, item]) => item.category === 'skill')
    .map(([key, item]) => {
      const values = alignments.get(key);
      const alignment: SkillInsight['alignment'] = !profile.complete
        ? 'unassessed'
        : values?.has('gap')
          ? 'gap'
          : values?.has('partial')
            ? 'partial'
            : values?.has('strong')
              ? 'strong'
              : 'unassessed';
      const demand = `${item.opportunityCount} confirmed ${item.opportunityCount === 1 ? 'opportunity' : 'opportunities'}`;
      const application = item.applicationCount
        ? `, including ${item.applicationCount} you applied to`
        : '';
      const impact =
        alignment === 'strong'
          ? `Documented in your profile and requested by ${demand}${application}.`
          : alignment === 'partial'
            ? `Your experience mentions this skill, but your skills list does not. Requested by ${demand}${application}.`
            : alignment === 'gap'
              ? `Not documented in your profile. Requested by ${demand}${application}; ${item.requiredCount} mark it required.`
              : `Requested by ${demand}${application}. Complete your profile to assess your evidence.`;
      return { ...item, category: 'skill' as const, alignment, impact };
    })
    .sort(
      (a, b) =>
        b.opportunityCount - a.opportunityCount ||
        b.requiredCount - a.requiredCount ||
        a.name.localeCompare(b.name),
    );
  const skillGaps = skillDemand.filter(
    (item) => item.alignment === 'gap' || item.alignment === 'partial',
  );
  const highValueSkills = [...skillGaps]
    .sort(
      (a, b) =>
        b.requiredCount * 2 +
          b.applicationCount * 3 +
          b.opportunityCount -
          (a.requiredCount * 2 + a.applicationCount * 3 + a.opportunityCount) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 5);
  const strongSkills = skillDemand.filter(
    (item) => item.alignment === 'strong',
  );
  const recurringRequirements = [...requirements.values()]
    .filter((item) => item.opportunityCount >= 2)
    .sort(
      (a, b) =>
        b.opportunityCount - a.opportunityCount ||
        b.requiredCount - a.requiredCount ||
        a.name.localeCompare(b.name),
    );
  const careerInsights: CareerInsight[] = [];
  if (!included.length)
    careerInsights.push({
      title: 'Confirm a job analysis',
      explanation:
        'Confirmed requirements from saved and applied opportunities create your market view.',
      href: '/jobs',
    });
  if (!profile.complete)
    careerInsights.push({
      title: 'Complete your Career Profile',
      explanation:
        'A completed profile lets us compare your documented skills with recurring requirements.',
      href: '/profile',
    });
  if (highValueSkills[0])
    careerInsights.push({
      title: `Review ${highValueSkills[0].name}`,
      explanation: `${highValueSkills[0].impact} Add evidence if you have it, or consider developing it.`,
      href: '/profile/setup/skills',
    });
  if (strongSkills[0])
    careerInsights.push({
      title: `Highlight ${strongSkills[0].name}`,
      explanation: `${strongSkills[0].impact} Consider emphasizing this evidence when applying.`,
      href: '/profile',
    });
  return {
    profileReady: profile.complete,
    analyzedOpportunityCount: included.length,
    applicationCount: appliedIds.size,
    skillDemand,
    skillGaps,
    highValueSkills,
    strongSkills,
    recurringRequirements,
    careerInsights,
  };
}

@Injectable()
export class InsightsService {
  constructor(
    private readonly profile: ProfileService,
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}
  async get(): Promise<InsightsSummary> {
    const [profile, jobs, applications] = await Promise.all([
      this.profile.get(),
      this.jobs.list(),
      this.applications.list(),
    ]);
    return aggregateInsights(profile, jobs, applications);
  }
}
