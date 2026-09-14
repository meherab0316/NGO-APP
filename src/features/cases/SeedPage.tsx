import { useEffect, useState } from "react";
import seed from "../../../demo-seed.json";
import { assistance, caseRequests, followUps, households } from "./api";
import { blocksClient } from "../../lib/blocks/client";

// One-time demo seed page (manager-only). Idempotent: skips if households
// already exist. In a real deployment this would be an admin backend job.
export function SeedPage({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState("checking…");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const me = await blocksClient.iam.me();
        const roles = ((me as { data?: { roles?: unknown } })?.data?.roles ?? []) as unknown;
        const roleList = Array.isArray(roles) ? roles : Object.values(roles as Record<string, string[]>).flat();
        if (!roleList.includes("regional-manager")) {
          setStatus("blocked");
          setLog((l) => [...l, "Only regional-manager can seed demo data."]);
          return;
        }

        setStatus("seeding…");
        const existing = await households.list({ pageNo: 1, pageSize: 5 });
        const existingCount = (existing as { data?: { totalCount?: number } })?.data?.totalCount ?? 0;
        if (existingCount > 0) {
          setStatus("done");
          setLog((l) => [...l, `Skipped — ${existingCount} households already exist.`]);
          return;
        }

        const refToId = new Map<string, string>();

        for (const h of seed.households) {
          const created = (await households.create({
            headName: h.headName,
            district: h.district,
            upazila: h.upazila,
            village: h.village,
            memberCount: h.memberCount,
            povertyScore: h.povertyScore,
            healthNotes: h.healthNotes,
            entitlementCards: h.entitlementCards,
            assignedOfficerId: h.assignedOfficerId
          })) as { data?: { itemId?: string } };
          const id = created?.data?.itemId ?? (created as { itemId?: string })?.itemId;
          if (id) refToId.set(h.clientRef, id);
          setLog((l) => [...l, `household ${h.headName} ✓`]);
        }

        const caseIds: (string | undefined)[] = [];
        for (const c of seed.caseRequests) {
          const householdId = refToId.get(c.householdRef) ?? "";
          const created = (await caseRequests.create({
            householdId,
            programme: c.programme,
            rawNote: c.rawNote,
            aiSummary: c.aiSummary,
            urgency: c.urgency,
            status: c.status,
            assignedOfficerId: c.assignedOfficerId,
            amount: c.amount,
            donorLine: c.donorLine,
            dupRiskFlag: c.dupRiskFlag,
            district: c.district
          })) as { data?: { itemId?: string } };
          caseIds.push(created?.data?.itemId ?? (created as { itemId?: string })?.itemId);
          setLog((l) => [...l, `case ${c.programme}/${c.status} ✓`]);
        }

        for (const a of seed.assistances) {
          const src = seed.caseRequests[a.caseRefIndex];
          if (!src) continue;
          await assistance.create({
            caseRequestId: caseIds[a.caseRefIndex] ?? "",
            householdId: refToId.get(src.householdRef) ?? "",
            programme: a.programme,
            amount: a.amount,
            deliveredDate: a.deliveredDate,
            district: a.district
          });
          setLog((l) => [...l, `assistance ৳${a.amount} ✓`]);
        }

        for (const f of seed.followUps) {
          await followUps.create({
            caseRequestId: f.caseRefIndex != null ? caseIds[f.caseRefIndex] ?? "" : "",
            householdId: refToId.get(f.householdRef) ?? "",
            district: f.district,
            dueDate: f.dueDate,
            status: f.status,
            assignedOfficerId: f.assignedOfficerId,
            notes: f.notes
          });
          setLog((l) => [...l, `follow-up ${f.district} due ${f.dueDate.slice(0, 10)} ✓`]);
        }

        setStatus("done");
        setLog((l) => [...l, "Seed complete."]);
      } catch (e) {
        setStatus("error");
        setLog((l) => [...l, String(e)]);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Demo seed — {status}</h2>
      <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-emerald-300">
        {log.join("\n") || "…"}
      </pre>
      {status === "done" && (
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={onDone}>
          Go to district board →
        </button>
      )}
    </div>
  );
}
