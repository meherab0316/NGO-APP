import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingScreen } from "../../shared/ui/LoadingScreen";
import { useHouseholds, useHouseholdTimeline } from "./hooks";

const KIND_STYLE: Record<string, string> = {
  case: "bg-indigo-100 text-indigo-800",
  assistance: "bg-emerald-100 text-emerald-800",
  followup: "bg-amber-100 text-amber-800"
};

export function HouseholdPage({ householdId, onNavigate }: { householdId: string; onNavigate: (path: string) => void }) {
  const households = useHouseholds();
  const household = households.data?.find((h) => h.itemId === householdId);
  const timeline = useHouseholdTimeline(householdId);

  if (households.isLoading) return <LoadingScreen />;
  if (!household) return <EmptyState title="Household not found" description="It may belong to another officer's area." />;

  return (
    <div>
      <PageHeader
        title={household.headName ?? "Household"}
        subtitle={`${household.village ?? ""}, ${household.upazila ?? ""}, ${household.district ?? ""} — ${household.memberCount ?? "?"} members`}
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-slate-500">Entitlements: </span>
          <span className="font-medium">{household.entitlementCards?.join(", ") || "none recorded"}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-slate-500">Cases: </span>
          <span className="font-medium">{timeline.data?.filter((e) => e.kind === "case").length ?? 0}</span>
        </div>
      </div>

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Full case history</h3>
      {timeline.isLoading ? (
        <LoadingScreen />
      ) : (timeline.data?.length ?? 0) === 0 ? (
        <EmptyState title="No history yet" description="This household has no recorded cases." />
      ) : (
        <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
          {timeline.data?.map((e, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[31px] top-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_STYLE[e.kind]}`}>
                {e.kind}
              </span>
              <p className="font-medium text-slate-900">{e.title}</p>
              {e.date && <p className="text-xs text-slate-500">{new Date(e.date).toLocaleString()}</p>}
              {e.detail && <p className="mt-1 text-sm text-slate-600">{e.detail}</p>}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-6">
        <button className="text-sm font-medium text-indigo-600 hover:underline" onClick={() => onNavigate("/officer/capture")}>
          ← Record new request
        </button>
      </div>
    </div>
  );
}
