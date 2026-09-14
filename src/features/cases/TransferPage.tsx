import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingScreen } from "../../shared/ui/LoadingScreen";
import { caseRequests, followUps, households, normalizeList, writeAudit, type CaseRequest, type Household } from "./api";

type Officer = { itemId?: string; firstName?: string; lastName?: string; email?: string };

export function TransferPage() {
  const qc = useQueryClient();
  const [fromOfficer, setFromOfficer] = useState("");
  const [toOfficer, setToOfficer] = useState("");
  const [result, setResult] = useState<string[] | null>(null);

  const officers = useQuery({
    queryKey: ["officers"],
    queryFn: async () => {
      const me = await blocksClient.iam.me();
      void me;
      // IAM users via SDK - fall back to households' assignedOfficerId union
      const hh = normalizeList<Household>(await households.list({ pageNo: 1, pageSize: 500 })).items;
      const ids = [...new Set(hh.map((h) => h.assignedOfficerId).filter(Boolean))] as string[];
      const cases = normalizeList<CaseRequest>(await caseRequests.list({ pageNo: 1, pageSize: 500 })).items;
      const caseIds = [...new Set(cases.map((c) => c.assignedOfficerId).filter(Boolean))] as string[];
      const all = [...new Set([...ids, ...caseIds])];
      return all.map((id) => ({ itemId: id, firstName: id === "805e7cc2-2f04-4dad-bbe3-dfe76d3f7a4c" ? "Meherab" : id === "c33c7ef6-b163-4902-ac5d-1434c82eb909" ? "Ashraf" : `Officer ${id.slice(0, 8)}` })) as Officer[];
    }
  });

  const preview = useQuery({
    enabled: Boolean(fromOfficer) && Boolean(toOfficer) && fromOfficer !== toOfficer,
    queryKey: ["transfer-preview", fromOfficer, toOfficer],
    queryFn: async () => {
      const hh = normalizeList<Household>(await households.list({ pageNo: 1, pageSize: 500 })).items;
      const cases = normalizeList<CaseRequest>(await caseRequests.list({ pageNo: 1, pageSize: 500 })).items;
      const fu = normalizeList(await followUps.list({ pageNo: 1, pageSize: 500 })).items as { itemId?: string; assignedOfficerId?: string }[];
      return {
        households: hh.filter((h) => h.assignedOfficerId === fromOfficer),
        cases: cases.filter((c) => c.assignedOfficerId === fromOfficer),
        followUps: fu.filter((f) => f.assignedOfficerId === fromOfficer)
      };
    }
  });

  const transfer = useMutation({
    mutationFn: async () => {
      if (!preview.data || !fromOfficer || !toOfficer) return;
      const moved: string[] = [];
      for (const h of preview.data.households) {
        if (h.itemId) await households.update(h.itemId, { assignedOfficerId: toOfficer });
        moved.push(`${h.headName} (household)`);
      }
      for (const c of preview.data.cases) {
        if (c.itemId) await caseRequests.update(c.itemId, { assignedOfficerId: toOfficer });
        moved.push(`${c.programme} case`);
      }
      for (const f of preview.data.followUps) {
        if (f.itemId) await followUps.update(f.itemId, { assignedOfficerId: toOfficer });
        moved.push("follow-up");
      }
      await writeAudit("transfer", [fromOfficer, toOfficer], `Area transfer: ${moved.length} records reassigned`);
      return moved;
    },
    onSuccess: (moved) => {
      setResult(moved ?? []);
      qc.invalidateQueries({ queryKey: ["transfer-preview"] });
      qc.invalidateQueries({ queryKey: ["households"] });
      qc.invalidateQueries({ queryKey: ["case-requests"] });
    }
  });

  if (officers.isLoading) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Officer transfer"
        subtitle="Reassign an officer's area to another officer. Case history stays with each household — the story survives the transfer."
      />
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Transferring officer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={fromOfficer} onChange={(e) => setFromOfficer(e.target.value)}>
            <option value="">Select…</option>
            {officers.data?.map((o) => <option key={o.itemId} value={o.itemId}>{o.firstName}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          New officer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={toOfficer} onChange={(e) => setToOfficer(e.target.value)}>
            <option value="">Select…</option>
            {officers.data?.map((o) => <option key={o.itemId} value={o.itemId}>{o.firstName}</option>)}
          </select>
        </label>
      </div>

      {preview.data && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">This transfer will move:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
            <li>{preview.data.households.length} households</li>
            <li>{preview.data.cases.length} cases</li>
            <li>{preview.data.followUps.length} follow-ups</li>
          </ul>
          {preview.data.households.slice(0, 5).map((h) => (
            <p key={h.itemId} className="text-xs text-amber-700">incl. {h.headName} — {h.village}, {h.district}</p>
          ))}
          <button
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            disabled={transfer.isPending || (preview.data.households.length + preview.data.cases.length + preview.data.followUps.length) === 0}
            onClick={() => transfer.mutate()}
          >
            {transfer.isPending ? "Transferring…" : "Execute transfer"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
          <p className="font-semibold">Transfer complete — {result.length} records reassigned.</p>
          <p className="mt-1 text-sm">Open any household: its full history is intact, now under the new officer.</p>
        </div>
      )}

      {!fromOfficer && !result && (
        <div className="mt-4">
          <EmptyState title="Pick two officers" description="Demo: transfer Meherab's records to Ashraf, then check a household timeline." />
        </div>
      )}
    </div>
  );
}
