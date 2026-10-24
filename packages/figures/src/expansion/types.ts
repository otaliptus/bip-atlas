import type { PacketField } from "../kit";
import type { BaseFixture } from "../types";

export interface ExpansionStage {
  id: string;
  title: string;
  status: "pass" | "fail" | "not-reached";
  detail: string;
}

export interface ExpansionPanel {
  title: string;
  role?: "secret" | "public" | "hash" | "sig" | "check" | "net" | "time" | "hidden" | "plain";
  fields: Array<{ label: string; value: string }>;
}

export type ExpansionMotifKind = "records" | "relay" | "replacement" | "instruction" | "network";

export interface ExpansionView {
  layout: "flow" | "packet" | "gates" | "comparison";
  motif?: ExpansionMotifKind;
  summary: string;
  panels: ExpansionPanel[];
  stages: ExpansionStage[];
  packet?: { fields: PacketField[]; perRow: number };
  comparison?: Array<{ label: string; left: string; right: string }>;
  notes?: string[];
  source: string;
}

export interface ExpansionLab {
  scenarios: Array<{ id: string; label: string }>;
  stages: Array<{ id: string; label: string }>;
  initialKey: string;
  noJsId: string;
  staticNote: string;
}

export interface ExpansionDerived {
  views: Record<string, ExpansionView>;
  lab?: ExpansionLab;
}

export type DerivedExpansionFixture = BaseFixture & { derived: ExpansionDerived };
