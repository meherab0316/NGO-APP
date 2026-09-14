import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ActionButton } from "../../shared/ui/ActionButton";
import { EmptyState } from "../../shared/ui/EmptyState";
import { DISTRICTS, PROGRAMMES } from "./api";
import { summarizeNote } from "./ai";
import { agentAdvisory } from "./agent";
import { useHouseholds, useSubmitCase } from "./hooks";

export function CapturePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const qc = useQueryClient();
  const [householdId, setHouseholdId] = useState("");
  const [programme, setProgramme] = useState<string>("education");
  const [rawNote, setRawNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);

  const households = useHouseholds();
  const submit = useSubmitCase();

  const preview = useMemo(() => (rawNote.trim() ? summarizeNote(rawNote) : null), [rawNote]);

  const selectedHousehold = households.data?.find((h) => h.itemId === householdId);

  async function handleSubmit() {
    if (!householdId || !rawNote.trim() || !selectedHousehold) return;
    await submit.mutateAsync({
      householdId,
      programme,
      rawNote: rawNote.trim(),
      district: selectedHousehold.district ?? "",
      advisory
    });
    setSubmitted(true);
    qc.invalidateQueries({ queryKey: ["case-requests"] });
    setTimeout(() => onNavigate("/officer/cases"), 900);
  }

  if (submitted) {
    return (
      <div>
        <PageHeader title="Request recorded" subtitle="Case submitted for coordinator review." />
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900">
          The household's case history is preserved — the case now appears in the coordinator queue.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Record a request" subtitle="Capture the officer's field note now, in your own shorthand — AI will summarize it for the coordinator." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <label className="block text-sm font-semibold text-slate-700">Household

            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
            >
              <option value="">Select household…</option>
              {households.data?.map((h) => (
                <option key={h.itemId} value={h.itemId}>
                  {h.headName} — {h.village}, {h.district}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Programme

            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
            >
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Field note (Banglish shorthand OK)

            <textarea
              className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="Rekha bibi, swami na thaka, chele helen class 8 drop 3 mas, meye class 5, barite income nai, VGD card nai, school sir bole stipend lagbe."
              value={rawNote}
              onChange={(e) => setRawNote(e.target.value)}
            />
          </label>
          <ActionButton
            onClick={handleSubmit}
            disabled={!householdId || !rawNote.trim() || submit.isPending}
          >
            Submit case
          </ActionButton>
        </div>

        <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">AI case summary (draft)</h3>
          {preview ? (
            <div className="space-y-3 text-sm text-slate-800">
              <p><span className="font-semibold">Need:</span> {preview.need}</p>
              <p><span className="font-semibold">Context:</span> {preview.context}</p>
              <p><span className="font-semibold">Urgency:</span> <span className="font-mono">{preview.urgency}</span></p>
              <div>
                <span className="font-semibold">Suggested actions:</span>
                <ul className="list-disc pl-5">
                  {preview.actions.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
              <div>
                <span className="font-semibold">Documents needed:</span>
                <ul className="list-disc pl-5">
                  {preview.documents.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
              <p className="rounded-lg bg-white p-3 italic text-slate-600">"{preview.donorLine}"</p>
              <div className="border-t border-indigo-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Blocks Agent advisory (Bangla)</span>
                  <button
                    className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
                    disabled={advisoryLoading || !rawNote.trim()}
                    onClick={async () => {
                      setAdvisoryLoading(true);
                      setAdvisory(null);
                      setAdvisory(await agentAdvisory(rawNote.trim()));
                      setAdvisoryLoading(false);
                    }}
                  >
                    {advisoryLoading ? "asking…" : advisory ? "refresh" : "ask agent"}
                  </button>
                </div>
                {advisory ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-slate-700">{advisory}</p>
                ) : (
                  <p className="mt-1 text-xs text-indigo-400">Optional: get an LLM advisory paragraph for this note.</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Start typing" description="The AI summary appears here as you type the field note." />
          )}
        </div>
      </div>
    </div>
  );
}
