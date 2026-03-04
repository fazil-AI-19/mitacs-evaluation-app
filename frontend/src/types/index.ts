export type ProposalStatus =
  | 'pending'
  | 'processing'
  | 'awaiting_review'
  | 'decided'
  | 'error';

export type Recommendation = 'accept' | 'reject' | 'revise_and_resubmit';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'applicant' | 'reviewer';
}

export interface Proposal {
  id: number;
  applicant_id: number;
  title: string;
  applicant_name: string;
  institution: string;
  original_filename: string;
  status: ProposalStatus;
  submitted_at: string;
  updated_at: string;
  decision?: DecisionSummary | null;
}

export interface DecisionSummary {
  ai_score: number;
  ai_recommendation: Recommendation;
  final_recommendation: Recommendation | null;
  is_overridden: boolean;
}

export interface ProposalStatus_ {
  id: number;
  status: ProposalStatus;
  updated_at: string;
}

export interface PreliminaryReview {
  sections_present: Record<string, boolean>;
  eligibility_issues: string[];
  formatting_issues: string[];
  completeness_score: number;
  summary: string;
}

export interface ResearchReview {
  // Dynamic per-criterion score fields, e.g. technical_merit_score, custom_criterion_score
  [key: string]: unknown;
  criteria_comments: Record<string, string>;
  overall_scientific_score: number;
  summary: string;
}

export interface AgentReview {
  id: number;
  proposal_id: number;
  review_type: 'preliminary' | 'research';
  structured_output: PreliminaryReview | ResearchReview | null;
  created_at: string;
}

export interface Decision {
  id: number;
  proposal_id: number;
  ai_score: number;
  ai_recommendation: Recommendation;
  ai_justification: string;
  strengths: string[];
  weaknesses: string[];
  action_items: string[];
  final_recommendation: Recommendation | null;
  reviewer_id: number | null;
  reviewer_comments: string | null;
  is_overridden: boolean;
  decided_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface SectionConfig {
  key: string;
  label: string;
  enabled: boolean;
  is_custom?: boolean;
}

export interface CriterionConfig {
  key: string;
  label: string;
  enabled: boolean;
  is_policy?: boolean;
  is_custom?: boolean;
  description?: string;
}

export interface EvaluationConfig {
  preliminary: {
    required_sections: SectionConfig[];
    prompt_additions: string;
  };
  research_review: {
    criteria: CriterionConfig[];
    prompt_additions: string;
  };
  decision: {
    weights: {
      completeness: number;
      scientific: number;
    };
    thresholds: {
      accept: number;
      revise_and_resubmit: number;
    };
  };
}
