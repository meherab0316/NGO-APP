import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { parseJsonField, type CaseRequest, type DupRisk } from "./api";
import { useCaseRequests, useMyCaseRequests } from "./hooks";

export function OfficerCasesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const submitted = useCaseRequests("submitted");
  const mine = useMyCaseRequests();

  const rows = mine.data ?? [];

  return (
    <div>
      <PageHeader
        title="My cases"
        subtitle={`${submitted.data?.length ?? 0} awaiting coordinator review`}
      />
      {rows.length === 0 ? (
        <EmptyState title="No cases yet" description="Record a request from the field to see it here." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Dup risk</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <CaseRow key={c.itemId} c={c} onNavigate={onNavigate} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CaseRow({ c, onNavigate }: { c: CaseRequest; onNavigate: (path: string) => void }) {
  const dup = parseJsonField<DupRisk>(c.dupRiskFlag, { score: 0, reasons: [] });
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 font-medium">{c.programme}</td>
      <td className="px-4 py-3">{c.district}</td>
      <td className="px-4 py-3">{c.status}</td>
      <td className="px-4 py-3">{c.amount ? `৳${c.amount}` : "—"}</td>
      <td className="px-4 py-3">
        {dup.score > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {dup.score}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          className="text-sm font-medium text-indigo-600 hover:underline"
          onClick={() => onNavigate(`/household/${c.householdId}`)}
        >
          View household →
        </button>
      </td>
    </tr>
  );
}
