import type { Profile } from '../profile/types.js';
import type { JobOpportunity, MatchAnalysis } from '../jobs/types.js';
import type { Application, ApplicationStage } from '../applications/types.js';
import { compareOpportunity } from '../jobs/match-analysis.js';
import type {
  DashboardGap,
  DashboardOpportunity,
  DashboardSummary,
} from './types.js';

const stages: Record<ApplicationStage, { label: string; active: boolean }> = {
  applied: { label: 'Applied', active: true },
  'recruiter-screening': { label: 'Recruiter screening', active: true },
  'technical-interview': { label: 'Technical interview', active: true },
  'final-interview': { label: 'Final interview', active: true },
  offer: { label: 'Offer', active: true },
  accepted: { label: 'Accepted', active: false },
  rejected: { label: 'Rejected', active: false },
  withdrawn: { label: 'Withdrawn', active: false },
};

export function buildDashboardSummary(
  profile: Profile,
  jobs: JobOpportunity[],
  applications: Application[],
  today: string,
): DashboardSummary {
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const activeApplications = applications
    .filter((application) => stages[application.stage]?.active)
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
  const profileReady = profile.complete;
  const confirmedJobs = jobs.filter(
    (job) => job.status === 'confirmed' && job.trackingStatus !== 'archived',
  );
  const matches = new Map<string, MatchAnalysis>();
  if (profileReady) {
    for (const job of confirmedJobs) {
      const match = compareOpportunity(job, profile);
      if (match.state === 'ready') matches.set(job.id, match);
    }
  }
  const bestAlignedOpportunities: DashboardOpportunity[] = confirmedJobs
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
  const gaps = new Map<string, DashboardGap>();
  for (const match of matches.values()) {
    const oncePerJob = new Map<string, { name: string; required: boolean }>();
    for (const finding of match.missingSkills) {
      const key = finding.title.trim().toLocaleLowerCase();
      if (!key) continue;
      const previous = oncePerJob.get(key);
      oncePerJob.set(key, {
        name: finding.title.trim(),
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
  const focus: DashboardSummary['focus'] = upcomingInterviews[0]
    ? {
        title: `Prepare for ${upcomingInterviews[0].title}`,
        description: `${upcomingInterviews[0].role} · ${upcomingInterviews[0].date}`,
        kind: 'application',
        applicationId: upcomingInterviews[0].applicationId,
      }
    : !profileReady
      ? {
          title: 'Complete your Career Profile',
          description:
            'A confirmed profile unlocks opportunity alignment and recurring skill gaps.',
          kind: 'link',
          href: '/profile',
        }
      : recurringGaps[0]
        ? {
            title: `Review ${recurringGaps[0].name} in your profile`,
            description: `This skill is undocumented across ${recurringGaps[0].opportunityCount} confirmed opportunities.`,
            kind: 'link',
            href: '/profile/setup/skills',
          }
        : jobs.every((job) => job.trackingStatus !== 'saved')
          ? {
              title: 'Save an opportunity to compare',
              description:
                'Start with a job description and review its extracted requirements.',
              kind: 'link',
              href: '/jobs/new',
            }
          : activeApplications.length
            ? {
                title: 'Review your applications',
                description:
                  'Keep stages, dates, and notes current as the process moves forward.',
                kind: 'link',
                href: '/applications',
              }
            : {
                title: 'Review your opportunities',
                description:
                  'Compare saved roles with your Career Profile before deciding what comes next.',
                kind: 'link',
                href: '/jobs',
              };
  return {
    profileReady,
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
        stageLabel: stages[application.stage]?.label ?? application.stage,
        updatedAt: application.updatedAt,
      };
    }),
    upcomingInterviews: upcomingInterviews.slice(0, 3),
    bestAlignedOpportunities,
    recurringGaps,
    focus,
  };
}
