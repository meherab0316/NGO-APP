import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingScreen } from "../../shared/ui/LoadingScreen";
import { useDonorAggregates, useOverdueBoard } from "./hooks";

export function ManagerBoardPage() {
  const board = useOverdueBoard();
  const aggregates = useDonorAggregates();

  if (board.isLoading) return <LoadingScreen />;

  const districts = Object.entries(board.data ?? {}).sort((a, b) => b[1].overdue - a[1].overdue);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Overdue follow-ups by district" subtitle="Pending follow-ups past their due date, rolled up per district." />
        {districts.length === 0 ? (
          <EmptyState title="Nothing pending" description="No follow-ups recorded yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {districts.map(([district, counts]) => (
              <div
                key={district}
                className={`rounded-xl border p-5 ${counts.overdue > 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}
              >
                <h3 className="text-sm font-semibold text-slate-600">{district}</h3>
                <p className="mt-2 text-4xl font-bold text-slate-900">{counts.overdue}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">overdue</p>
                <p className="mt-2 text-sm text-slate-600">{counts.pending} pending · {counts.done} done</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <PageHeader title="Donor report (aggregate)" subtitle="Programme funnels and outcomes — no individual beneficiary data." />
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Total delivered (৳)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(aggregates.data ?? {}).map(([p, v]) => (
                <tr key={p} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium capitalize">{p}</td>
                  <td className="px-4 py-3">{v.requested}</td>
                  <td className="px-4 py-3">{v.approved}</td>
                  <td className="px-4 py-3">{v.delivered}</td>
                  <td className="px-4 py-3">{v.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
