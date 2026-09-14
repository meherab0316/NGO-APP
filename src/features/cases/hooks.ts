import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";
import {
  assistance,
  auditLogs,
  caseRequests,
  followUps,
  households,
  normalizeList,
  parseJsonField,
  writeAudit,
  type AiSummary,
  type AuditLog,
  type Assistance,
  type CaseRequest,
  type DupRisk,
  type FollowUp,
  type Household
} from "./api";

export function useHouseholds(district?: string) {
  return useQuery({
    queryKey: ["households", district ?? "all"],
    queryFn: async () => {
      const { items } = normalizeList<Household>(
        await households.list({ pageNo: 1, pageSize: 200 })
      );
      return district ? items.filter((h) => h.district === district) : items;
    }
  });
}

export function useHouseholdTimeline(householdId?: string) {
  return useQuery({
    enabled: Boolean(householdId),
    queryKey: ["household-timeline", householdId],
    queryFn: async () => {
      const cases = normalizeList<CaseRequest>(
        await caseRequests.list({ pageNo: 1, pageSize: 100, filter: { householdId } })
      ).items;
      const fu = normalizeList<FollowUp>(
        await followUps.list({ pageNo: 1, pageSize: 100, filter: { householdId } })
      ).items;
      const assist = normalizeList<Assistance>(
        await assistance.list({ pageNo: 1, pageSize: 100, filter: { householdId } })
      ).items;
      const events = [
        ...cases.map((c) => ({
          date: c.createdDate ?? "",
          kind: "case" as const,
          title: `${c.programme ?? "case"} request — ${c.status ?? ""}`,
          detail: c.aiSummary ? parseJsonField<AiSummary>(c.aiSummary, { need: "", context: "", urgency: "low", actions: [], documents: [], donorLine: "" }).need : c.rawNote ?? ""
        })),
        ...assist.map((a) => ({
          date: a.deliveredDate ?? "",
          kind: "assistance" as const,
          title: `${a.programme ?? ""} assistance ৳${a.amount ?? 0}`,
          detail: ""
        })),
        ...fu.map((f) => ({
          date: f.dueDate ?? "",
          kind: "followup" as const,
          title: `Follow-up ${f.status ?? ""} (due ${new Date(f.dueDate ?? "").toLocaleDateString()})`,
          detail: f.notes ?? ""
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return events;
    }
  });
}

export function useSubmitCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      householdId: string;
      programme: string;
      rawNote: string;
      district: string;
    }) => {
      const me = await blocksClient.iam.me();
      const userId = (me as { data?: { itemId?: string } })?.data?.itemId ?? "";
      const dup = await assessDuplicateRisk(input.householdId, input.programme);
      return caseRequests.create({
        householdId: input.householdId,
        programme: input.programme,
        rawNote: input.rawNote,
        district: input.district,
        status: "submitted",
        urgency: "medium",
        assignedOfficerId: userId,
        dupRiskFlag: JSON.stringify(dup)
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case-requests"] })
  });
}

export async function assessDuplicateRisk(householdId: string, programme: string): Promise<DupRisk> {
  const prior = normalizeList<Assistance>(
    await assistance.list({ pageNo: 1, pageSize: 50, filter: { householdId } })
  ).items;
  const open = normalizeList<CaseRequest>(
    await caseRequests.list({ pageNo: 1, pageSize: 50, filter: { householdId, status: "approved" } })
  ).items;
  const reasons: string[] = [];
  let score = 0;
  const sameProgramme = prior.filter((a) => a.programme === programme);
  if (sameProgramme.length > 0) {
    score += 60;
    const last = sameProgramme
      .map((a) => new Date(a.deliveredDate ?? 0).getTime())
      .reduce((m, t) => Math.max(m, t), 0);
    if (Date.now() - last < 1000 * 60 * 60 * 24 * 180) {
      score += 20;
      reasons.push(`Household already received ${programme} assistance in the last 6 months`);
    } else {
      reasons.push(`Household has prior ${programme} assistance on record`);
    }
  }
  if (open.length > 0) {
    score += 30;
    reasons.push(`${open.length} approved case(s) already exist for this household`);
  }
  return { score: Math.min(score, 100), reasons };
}

export function useCaseRequests(status?: string) {
  return useQuery({
    queryKey: ["case-requests", status ?? "all"],
    queryFn: async () => {
      const { items } = normalizeList<CaseRequest>(
        await caseRequests.list({ pageNo: 1, pageSize: 200 })
      );
      return status ? items.filter((c) => c.status === status) : items;
    }
  });
}

export function useMyCaseRequests() {
  return useQuery({
    queryKey: ["case-requests", "mine"],
    queryFn: async () => {
      const me = await blocksClient.iam.me();
      const userId = (me as { data?: { itemId?: string } })?.data?.itemId ?? "";
      const { items } = normalizeList<CaseRequest>(
        await caseRequests.list({ pageNo: 1, pageSize: 200 })
      );
      // App-layer scoping: officers see only cases assigned to them.
      return items.filter((c) => c.assignedOfficerId === userId);
    }
  });
}

export function useApproveCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { caseId: string; amount: number; donorLine: string; followUpDue: string; programme: string; householdId: string; district: string }) => {
      const me = await blocksClient.iam.me();
      const userId = (me as { data?: { itemId?: string } })?.data?.itemId ?? "";
      const updated = await caseRequests.update(input.caseId, {
        status: "approved",
        amount: input.amount,
        donorLine: input.donorLine
      });
      await assistance.create({
        caseRequestId: input.caseId,
        householdId: input.householdId,
        programme: input.programme,
        amount: input.amount,
        deliveredDate: new Date().toISOString(),
        district: input.district
      });
      await followUps.create({
        caseRequestId: input.caseId,
        householdId: input.householdId,
        district: input.district,
        dueDate: input.followUpDue,
        status: "pending",
        assignedOfficerId: userId
      });
      await writeAudit("approve", [input.caseId, input.householdId], `Approved ${input.programme} case, ৳${input.amount}`);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-requests"] });
      qc.invalidateQueries({ queryKey: ["overdue-board"] });
    }
  });
}

export function useRejectCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => caseRequests.update(caseId, { status: "rejected" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case-requests"] })
  });
}

export function useOverdueBoard() {
  return useQuery({
    queryKey: ["overdue-board"],
    queryFn: async () => {
      const { items } = normalizeList<FollowUp>(
        await followUps.list({ pageNo: 1, pageSize: 500 })
      );
      const now = Date.now();
      return DISTRICT_ROLLUP(items, now);
    }
  });
}

function DISTRICT_ROLLUP(items: FollowUp[], now: number) {
  const byDistrict: Record<string, { pending: number; overdue: number; done: number }> = {};
  for (const f of items) {
    const d = f.district ?? "Unknown";
    byDistrict[d] ??= { pending: 0, overdue: 0, done: 0 };
    if (f.status === "done") byDistrict[d].done += 1;
    else if (new Date(f.dueDate ?? 0).getTime() < now) byDistrict[d].overdue += 1;
    else byDistrict[d].pending += 1;
  }
  return byDistrict;
}

export function useDonorAggregates() {
  return useQuery({
    queryKey: ["donor-aggregates"],
    queryFn: async () => {
      const cases = normalizeList<CaseRequest>(await caseRequests.list({ pageNo: 1, pageSize: 500 })).items;
      const assist = normalizeList<Assistance>(await assistance.list({ pageNo: 1, pageSize: 500 })).items;
      const byProgramme: Record<string, { requested: number; approved: number; delivered: number; totalAmount: number }> = {};
      for (const c of cases) {
        const p = c.programme ?? "other";
        byProgramme[p] ??= { requested: 0, approved: 0, delivered: 0, totalAmount: 0 };
        byProgramme[p].requested += 1;
        if (c.status === "approved" || c.status === "closed") byProgramme[p].approved += 1;
      }
      for (const a of assist) {
        const p = a.programme ?? "other";
        byProgramme[p] ??= { requested: 0, approved: 0, delivered: 0, totalAmount: 0 };
        byProgramme[p].delivered += 1;
        byProgramme[p].totalAmount += a.amount ?? 0;
      }
      return byProgramme;
    }
  });
}

export function useAuditTrail() {
  return useQuery({
    queryKey: ["audit-trail"],
    queryFn: async () =>
      normalizeList<AuditLog>(await auditLogs.list({ pageNo: 1, pageSize: 100, sort: { timestamp: -1 } })).items
  });
}
