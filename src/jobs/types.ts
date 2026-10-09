export type RequirementCategory =
  'skill' | 'language' | 'certification' | 'education' | 'location' | 'work';
export type RequirementPriority = 'required' | 'preferred';
export type OpportunityStatus = 'draft' | 'confirmed';
export type WorkType = 'remote' | 'hybrid' | 'on-site' | 'unknown';
export type SalarySource = 'listed' | 'estimated';
export type TrackingStatus = 'saved' | 'applied' | 'archived';

export interface JobRequirement {
  id: string;
  category: RequirementCategory;
  text: string;
  priority: RequirementPriority;
}

export interface JobOpportunity {
  id: string;
  role: string;
  company: string;
  location: string;
  workType: WorkType;
  salary: string;
  salarySource: SalarySource;
  url: string;
  description: string;
  seniority: string;
  experience: string;
  requirements: JobRequirement[];
  status: OpportunityStatus;
  trackingStatus: TrackingStatus;
  notes: string;
  createdAt: string;
}

export interface JobOpportunityInput {
  url: string;
  description: string;
}

export interface MatchFinding {
  id: string;
  title: string;
  priority?: RequirementPriority;
  category: string;
  explanation: string;
  jobEvidence: string;
  profileEvidence: string;
}

export interface MatchAnalysis {
  state: 'ready' | 'profile-incomplete' | 'job-unconfirmed';
  strongMatches: MatchFinding[];
  partialMatches: MatchFinding[];
  missingSkills: MatchFinding[];
  eligibilityGaps: MatchFinding[];
}

export interface RecruiterMatch {
  stage: 'unscorable' | 'below-threshold' | 'recruiter-reviewed';
  score: number | null;
  threshold: 65;
  matchedSkills: string[];
  missingSkills: string[];
  recommendInterview: boolean | null;
  summary: string;
}
