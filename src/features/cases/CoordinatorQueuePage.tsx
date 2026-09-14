import { useState } from "react";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { parseJsonField, type AiSummary, type CaseRequest, type DupRisk } from "./api";
import { useApproveCase, useCaseRequests, useHouseholds, useRejectCase } from "./hooks";

export function CoordinatorQueuePage() {
  const queue = useCaseRequests("submitted");
  const households = useHouseholds();
  const approve = useApproveCase();
  const reject = useRejectCase();

  return (
    <div>
      <PageHeader
        title="Review queue"
        subtitle={`${queue.data?.length ?? 0} submitted case(s) awaiting decision`}
      />
      {(queue.data?.length ?? 0) === 0 ? (
        <EmptyState title="Queue clear" description="No submitted cases right now." />
      ) : (
        <div className="space-y-5">
          {queue.data?.map((c) => {
            const h = households.data?.find((x) => x.itemId === c.householdId);
            return (
              <CaseReview
                key={c.itemId}
                c={c}
                householdName={h?.headName ?? "Household"}
                onApprove={(amount, donorLine, due) =>
                  approve.mutateAsync({
                    caseId: c.itemId!,
                    amount,
                    donorLine,
                    followUpDue: due,
                    programme: c.programme ?? "education",
                    householdId: c.householdId!,
                    district: c.district ?? h?.district ?? ""
                  })
                }
                onReject={() => reject.mutateAsync(c.itemId!)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CaseReview({
  c,
  householdName,
  onApprove,
  onReject
}: {
  c: CaseRequest;
  householdName: string;
  onApprove: (amount: number, donorLine: string, followUpDue: string) => Promise<unknown>;
  onReject: () => Promise<unknown>;
}) {
  const ai = parseJsonField<AiSummary & { advisory?: string }>(c.aiSummary, {
    need: "", context: "", urgency: "low", actions: [], documents: [], donorLine: ""
  });
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("1200");
  const [donorLine, setDonorLine] = useState(ai.donorLine);
  const [due, setDue] = useState(defaultDue());
  const [dupAck, setDupAck] = useState(false);

  const dup = parseJsonField<DupRisk>(c.dupRiskFlag, { score: 0, reasons: [] });
  const dupBlocked = dup.score >= 50 && !dupAck;

  async function handleApprove() {
    await onApprove(Number(amount), donorLine, due);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{householdName} — {c.programme}</h3>
          <p className="text-sm text-slate-500">{c.district} · urgency {ai.urgency || c.urgency}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
          {c.status}
        </span>
      </div>

      <details className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium">Original field note</summary>
        <p className="mt-2 font-mono">{c.rawNote}</p>
      </details>

      {ai.advisory && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Blocks Agent advisory</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{ai.advisory}</p>
        </div>
      )}

      <div className="mb-4 grid gap-3 text-sm md:grid-cols-2">
        <div><span className="font-semibold">Need:</span> {editing ? "(edit below)" : ai.need}</div>
        <div><span className="font-semibold">Context:</span> {editing ? "(edit below)" : ai.context}</div>
        <div>
          <span className="font-semibold">Actions:</span>
          <ul className="list-disc pl-5">{ai.actions.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
        <div>
          <span className="font-semibold">Documents:</span>
          <ul className="list-disc pl-5">{ai.documents.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      </div>

      {dup.score > 0 && (
        <div className={`mb-4 rounded-lg border p-4 ${dup.score >= 50 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
          <p className="font-semibold text-red-900">
            ⚠ Duplicate-assistance risk: {dup.score}/100
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-red-800">
            {dup.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {dup.score >= 50 && (
            <label className="mt-2 flex items-center gap-2 text-sm text-red-900">
              <input type="checkbox" checked={dupAck} onChange={(e) => setDupAck(e.target.checked)} />
              I have reviewed the household history and confirm this is not a duplicate
            </label>
          )}
        </div>
      )}

      {editing ? (
        <div className="mb-4 grid gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="font-semibold">Amount (৳)</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="font-semibold">Donor report line</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={donorLine} onChange={(e) => setDonorLine(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-3">
            <span className="font-semibold">Follow-up due</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {!editing ? (
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onClick={() => setEditing(true)}>
            Edit & approve…
          </button>
        ) : (
          <>
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={dupBlocked || !amount}
              onClick={handleApprove}
            >
              Approve ৳{amount}
            </button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        )}
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50" onClick={onReject}>
          Reject
        </button>
      </div>
    </div>
  );
}

function defaultDue() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
