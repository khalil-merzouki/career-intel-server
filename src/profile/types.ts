export type Proficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  proficiency: Proficiency;
}

export interface Education {
  id: string;
  qualification: string;
  institution: string;
  year: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
}

export interface Profile {
  currentRole: string;
  experience: Experience[];
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  languages: Language[];
  interests: string[];
  workModels: string[];
  locations: string[];
  salaryCurrency: string;
  salaryMinimum: string;
  salaryTarget: string;
  source: 'manual' | 'cv' | null;
  importedFile: string | null;
  complete: boolean;
}
