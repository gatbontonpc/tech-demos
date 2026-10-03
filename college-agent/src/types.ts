export type Confidence = "high" | "medium" | "low";
export type TierName = "reach" | "stretch" | "target" | "fit";
export type FactId = "gpa" | "rigor" | "scores" | "activities" | "awards" | "major";
export type FactStatus = "unreviewed" | "confirmed" | "fixed";
export type ConnectorId = "gmail" | "drive" | "photos";
export type SlotId =
  | "transcript"
  | "scores"
  | "activities"
  | "awards"
  | "essays"
  | "photos"
  | "fall-grades";
export type Mode = "unset" | "demo" | "live";
export type DecisionId = "tidewater" | "ridgeview";
export type DecisionStatus = "approve" | "keep" | "counselor";
export type Audience = "student" | "parent";

export interface Provenance {
  source: string;
  detail: string;
  when: string;
  confidence: Confidence;
}

export interface Fact {
  id: FactId;
  label: string;
  value: string;
  hint: string;
  provenance: Provenance;
  status: FactStatus;
}

export interface FoundHit {
  id: string;
  slot: SlotId;
  source: "Gmail" | "Drive" | "Google Photos" | "Upload";
  title: string;
  when: string;
  from?: string;
}

export interface UploadSlot {
  id: SlotId;
  label: string;
  why: string;
  fileName?: string;
}

export interface QuestionChoice {
  id: string;
  label: string;
  effect: string;
}

export interface Question {
  id: "geo" | "cost" | "coop";
  impact: string;
  prompt: string;
  why: string;
  choices: QuestionChoice[];
}

export interface School {
  id: string;
  name: string;
  place: string;
  tier: TierName;
  proposedTier?: TierName;
  range: [number, number];
  cost: [number, number];
  grad: string;
  earn: string;
  coast: "west" | "other";
  coop: boolean;
  why: string[];
  notFit: string[];
  sources: Provenance[];
  onList: boolean;
  suggested?: boolean;
}

export interface ChangeLine {
  mark: string;
  text: string;
  provenance: string;
}

export interface AgentJob {
  id: string;
  label: string;
  result: string;
}

export interface PastMemo {
  id: string;
  date: string;
  title: string;
  summary: string;
}

export interface ConnectorState {
  status: "idle" | "working" | "ready" | "error" | "demo";
  detail: string;
  email?: string;
  hits: FoundHit[];
}

export interface AppState {
  mode: Mode;
  connectors: Record<ConnectorId, ConnectorState>;
  facts: Fact[];
  uploads: UploadSlot[];
  answers: Partial<Record<Question["id"], string>>;
  decisions: Partial<Record<DecisionId, DecisionStatus>>;
  searchedSlots: SlotId[];
  oauthError: string;
}
