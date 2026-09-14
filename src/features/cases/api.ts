import { blocksClient } from "../../lib/blocks/client";

export const DISTRICTS = ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"] as const;
export const PROGRAMMES = ["education", "livelihood", "health"] as const;
export type District = (typeof DISTRICTS)[number];
export type Programme = (typeof PROGRAMMES)[number];

export type Household = {
  itemId?: string;
  headName?: string;
  district?: string;
  upazila?: string;
  village?: string;
  memberCount?: number;
  povertyScore?: number;
  healthNotes?: string;
  entitlementCards?: string[];
  assignedOfficerId?: string;
};

export type CaseRequest = {
  itemId?: string;
  householdId?: string;
  programme?: string;
  rawNote?: string;
  aiSummary?: string;
  urgency?: string;
  status?: string;
  assignedOfficerId?: string;
  amount?: number;
  donorLine?: string;
  dupRiskFlag?: string;
  district?: string;
  createdDate?: string;
};

export type FollowUp = {
  itemId?: string;
  caseRequestId?: string;
  householdId?: string;
  district?: string;
  dueDate?: string;
  status?: string;
  assignedOfficerId?: string;
  notes?: string;
};

export type Assistance = {
  itemId?: string;
  caseRequestId?: string;
  householdId?: string;
  programme?: string;
  amount?: number;
  deliveredDate?: string;
  district?: string;
};

export type AuditLog = {
  itemId?: string;
  actorUserId?: string;
  action?: string;
  recordRefs?: string[];
  justification?: string;
  timestamp?: string;
};

export type AiSummary = {
  need: string;
  context: string;
  urgency: "low" | "medium" | "high";
  actions: string[];
  documents: string[];
  donorLine: string;
};

export type DupRisk = { score: number; reasons: string[] };

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const households = blocksClient.data.collection<Household>("Household", {
  fields: ["headName", "district", "upazila", "village", "memberCount", "povertyScore", "healthNotes", "entitlementCards", "assignedOfficerId"]
});

export const caseRequests = blocksClient.data.collection<CaseRequest>("CaseRequest", {
  fields: ["householdId", "programme", "rawNote", "aiSummary", "urgency", "status", "assignedOfficerId", "amount", "donorLine", "dupRiskFlag", "district", "createdDate"]
});

export const followUps = blocksClient.data.collection<FollowUp>("FollowUp", {
  fields: ["caseRequestId", "householdId", "district", "dueDate", "status", "assignedOfficerId", "notes"]
});

export const assistance = blocksClient.data.collection<Assistance>("Assistance", {
  fields: ["caseRequestId", "householdId", "programme", "amount", "deliveredDate", "district"]
});

export const auditLogs = blocksClient.data.collection<AuditLog>("AuditLog", {
  fields: ["actorUserId", "action", "recordRefs", "justification", "timestamp"]
});

export function normalizeList<T extends { itemId?: string }>(response: unknown): { items: T[]; totalCount: number } {
  const r = response as { data?: { items?: T[]; totalCount?: number }; items?: T[]; totalCount?: number } | null;
  const items = (r?.data?.items ?? r?.items ?? []) as T[];
  const totalCount = (r?.data?.totalCount ?? r?.totalCount ?? items.length) as number;
  return { items, totalCount };
}

export async function writeAudit(action: string, recordRefs: string[], justification: string) {
  const me = await blocksClient.iam.me();
  const userId = (me as { data?: { itemId?: string } })?.data?.itemId ?? "";
  return auditLogs.create({
    actorUserId: userId,
    action,
    recordRefs,
    justification,
    timestamp: new Date().toISOString()
  });
}
