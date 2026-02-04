
export type DebateSide = 'Affirmative' | 'Negative';

export interface Substantive {
  thesis: string;
  mechanisms: string[];
}

export interface CaseData {
  topic: string;
  side: DebateSide;
  includeFramework: boolean;
  numSubstantives: number;
  rhetoricFramework: string;
  definitions: string;
  clarifications: string;
  stakeholders: string;
  burden: string;
  substantive1: Substantive;
  substantive2: Substantive;
  substantive3: Substantive;
  topicAnalysis: string;
  sources: string;
}

export interface FeedbackData {
  existingCase: string;
  focusArea: string;
}

export interface LearnedIdea {
  id: string;
  type: 'mechanism' | 'rhetoric' | 'sub-idea' | 'source';
  content: string;
  timestamp: number;
}
