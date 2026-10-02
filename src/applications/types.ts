export type ApplicationStage =
  | 'applied'
  | 'recruiter-screening'
  | 'technical-interview'
  | 'final-interview'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ImportantDate {
  id: string;
  label: string;
  date: string;
}

export interface InterviewRecord {
  id: string;
  title: string;
  date: string;
  status: InterviewStatus;
  notes: string;
}

export interface StageEvent {
  id: string;
  stage: ApplicationStage;
  date: string;
}

export interface Application {
  id: string;
  jobId: string;
  role: string;
  company: string;
  location: string;
  stage: ApplicationStage;
  appliedOn: string;
  notes: string;
  importantDates: ImportantDate[];
  interviews: InterviewRecord[];
  stageHistory: StageEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSource {
  id: string;
  role: string;
  company: string;
  location: string;
  description: string;
  status: 'draft' | 'confirmed';
  trackingStatus: 'saved' | 'applied' | 'archived';
}

export interface CreateApplicationInput {
  jobId: string;
  appliedOn: string;
}

export interface UpdateApplicationInput {
  stage: ApplicationStage;
  appliedOn: string;
  notes: string;
  importantDates: ImportantDate[];
  interviews: InterviewRecord[];
}
