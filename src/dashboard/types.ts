export interface DashboardApplication {
  id: string;
  role: string;
  company: string;
  stage: string;
  stageLabel: string;
  updatedAt: string;
}

export interface DashboardInterview {
  id: string;
  applicationId: string;
  role: string;
  company: string;
  title: string;
  date: string;
}

export interface DashboardOpportunity {
  id: string;
  role: string;
  company: string;
  location: string;
  documentedMatches: number;
  partialMatches: number;
  reviewItems: number;
  comparedItems: number;
}

export interface DashboardGap {
  name: string;
  opportunityCount: number;
  requiredCount: number;
}

export type DashboardFocus =
  | {
      kind: 'application';
      title: string;
      description: string;
      applicationId: string;
    }
  | {
      kind: 'link';
      title: string;
      description: string;
      href:
        | '/profile'
        | '/jobs/new'
        | '/jobs'
        | '/applications'
        | '/profile/setup/skills';
    };

export interface DashboardSummary {
  profileReady: boolean;
  activeApplicationCount: number;
  savedOpportunityCount: number;
  upcomingInterviewCount: number;
  analyzedOpportunityCount: number;
  activeApplications: DashboardApplication[];
  upcomingInterviews: DashboardInterview[];
  bestAlignedOpportunities: DashboardOpportunity[];
  recurringGaps: DashboardGap[];
  focus: DashboardFocus;
}
