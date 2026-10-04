import { Injectable } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service.js';
import type { Application, ApplicationStage } from '../applications/types.js';
import { JobsService } from '../jobs/jobs.service.js';
import { compareOpportunity } from '../jobs/match-analysis.js';
import type { JobOpportunity, MatchAnalysis } from '../jobs/types.js';
import { ProfileService } from '../profile/profile.service.js';
import type { Profile } from '../profile/types.js';

const stageLabels: Record<ApplicationStage, string> = {
  applied: 'Applied',
  'recruiter-screening': 'Recruiter screening',
  'technical-interview': 'Technical interview',
  'final-interview': 'Final interview',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};
const activeStages = new Set<ApplicationStage>([
  'applied',
  'recruiter-screening',
  'technical-interview',
  'final-interview',
  'offer',
]);

export function buildDashboard(
  profile: Profile,
  jobs: JobOpportunity[],
  applications: Application[],
  today = new Date().toISOString().slice(0, 10),
) {
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const activeApplications = applications
    .filter((application) => activeStages.has(application.stage))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const upcomingInterviews = activeApplications
    .flatMap((application) => {
      const job = jobById.get(application.jobId);
      return application.interviews
        .filter(
          (interview) =>
            interview.status === 'scheduled' && interview.date >= today,
        )
        .map((interview) => ({
          id: interview.id,
          applicationId: application.id,
          role: job?.role || application.role,
          company: job?.company || application.company,
          title: interview.title,
          date: interview.date,
        }));
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
    );
  const confirmedJobs = jobs.filter(
    (job) => job.status === 'confirmed' && job.trackingStatus !== 'archived',
  );
  const matches = new Map<string, MatchAnalysis>();
  if (profile.complete) {
    for (const job of confirmedJobs) {
      const match = compareOpportunity(job, profile);
      if (match.state === 'ready') matches.set(job.id, match);
    }
  }
  const bestAlignedOpportunities = confirmedJobs
    .filter((job) => job.trackingStatus === 'saved')
    .map((job) => {
      const match = matches.get(job.id);
      const documentedMatches = match?.strongMatches.length ?? 0;
      const partialMatches = match?.partialMatches.length ?? 0;
      const reviewItems =
        (match?.missingSkills.length ?? 0) +
        (match?.eligibilityGaps.length ?? 0);
      return {
        id: job.id,
        role: job.role,
        company: job.company,
        location: job.location,
        documentedMatches,
        partialMatches,
        reviewItems,
        comparedItems: documentedMatches + partialMatches + reviewItems,
      };
    })
    .filter((job) => job.comparedItems > 0)
    .sort(
      (a, b) =>
        b.documentedMatches / b.comparedItems -
          a.documentedMatches / a.comparedItems ||
        b.documentedMatches - a.documentedMatches ||
        b.partialMatches - a.partialMatches ||
        a.role.localeCompare(b.role),
    )
    .slice(0, 3);
  const gaps = new Map<
    string,
    { name: string; opportunityCount: number; requiredCount: number }
  >();
  for (const match of matches.values()) {
    const oncePerJob = new Map<string, { name: string; required: boolean }>();
    for (const finding of match.missingSkills) {
      const name = finding.title.trim();
      const key = name.toLocaleLowerCase();
      if (!key) continue;
      const previous = oncePerJob.get(key);
      oncePerJob.set(key, {
        name,
        required:
          finding.priority === 'required' || Boolean(previous?.required),
      });
    }
    for (const [key, finding] of oncePerJob) {
      const gap = gaps.get(key) ?? {
        name: finding.name,
        opportunityCount: 0,
        requiredCount: 0,
      };
      gap.opportunityCount += 1;
      if (finding.required) gap.requiredCount += 1;
      gaps.set(key, gap);
    }
  }
  const recurringGaps = [...gaps.values()]
    .filter((gap) => gap.opportunityCount >= 2)
    .sort(
      (a, b) =>
        b.opportunityCount - a.opportunityCount ||
        b.requiredCount - a.requiredCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 4);
  const firstInterview = upcomingInterviews[0];
  const firstGap = recurringGaps[0];
  const focus = firstInterview
    ? {
        kind: 'application' as const,
        title: `Prepare for ${firstInterview.title}`,
        description: `${firstInterview.role} · ${firstInterview.date}`,
        applicationId: firstInterview.applicationId,
      }
    : !profile.complete
      ? {
          kind: 'link' as const,
          title: 'Complete your Career Profile',
          description:
            'A confirmed profile unlocks opportunity alignment and recurring skill gaps.',
          href: '/profile' as const,
        }
      : firstGap
        ? {
            kind: 'link' as const,
            title: `Review ${firstGap.name} in your profile`,
            description: `This skill is undocumented across ${firstGap.opportunityCount} confirmed opportunities.`,
            href: '/profile/setup/skills' as const,
          }
        : jobs.every((job) => job.trackingStatus !== 'saved')
          ? {
              kind: 'link' as const,
              title: 'Save an opportunity to compare',
              description:
                'Start with a job description and review its extracted requirements.',
              href: '/jobs/new' as const,
            }
          : activeApplications.length
            ? {
                kind: 'link' as const,
                title: 'Review your applications',
                description:
                  'Keep stages, dates, and notes current as the process moves forward.',
                href: '/applications' as const,
              }
            : {
                kind: 'link' as const,
                title: 'Review your opportunities',
                description:
                  'Compare saved roles with your Career Profile before deciding what comes next.',
                href: '/jobs' as const,
              };
  return {
    profileReady: profile.complete,
    activeApplicationCount: activeApplications.length,
    savedOpportunityCount: jobs.filter((job) => job.trackingStatus === 'saved')
      .length,
    upcomingInterviewCount: upcomingInterviews.length,
    analyzedOpportunityCount: confirmedJobs.length,
    activeApplications: activeApplications.slice(0, 3).map((application) => {
      const job = jobById.get(application.jobId);
      return {
        id: application.id,
        role: job?.role || application.role,
        company: job?.company || application.company,
        stage: application.stage,
        stageLabel: stageLabels[application.stage],
        updatedAt: application.updatedAt,
      };
    }),
    upcomingInterviews: upcomingInterviews.slice(0, 3),
    bestAlignedOpportunities,
    recurringGaps,
    focus,
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly profile: ProfileService,
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}
  async get() {
    const [profile, jobs, applications] = await Promise.all([
      this.profile.get(),
      this.jobs.list(),
      this.applications.list(),
    ]);
    return buildDashboard(profile, jobs, applications);
  }
}
