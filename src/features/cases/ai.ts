import type { AiSummary } from "./api";

// NGOField AI case summarizer.
//
// Turns a field officer's shorthand Banglish note into a structured case
// summary for coordinator review. The base implementation is a deterministic
// Banglish parser (keyword -> signal mapping), which keeps the demo fully
// offline-predictable and avoids shipping an external AI dependency.
//
// Upgrade path: replace `summarizeNote` with a call to the Blocks
// localization assistant translation-suggestion endpoint (LLM-backed, CLI
// today) or an external LLM — the function signature is the contract.

const KEYWORDS: { pattern: RegExp; signal: string }[] = [
  { pattern: /\bstipend\b|\bstipend lagbe\b/i, signal: "stipend requested" },
  { pattern: /drop(?:out)?|skole jay na|school bondho/i, signal: "school dropout" },
  { pattern: /class (\d+)/i, signal: "school-age child" },
  { pattern: /\bmerge\b|bie|kbi|grep|granthi/i, signal: "medical referral likely" },
  { pattern: /operation| IOC\b/i, signal: "medical referral likely" },
  { pattern: /\bswami na thaka\b|\bswami na\b|widow/i, signal: "no spouse / widow" },
  { pattern: /barite income nai|income nai|ay nai/i, signal: "no household income" },
  { pattern: /VGD card nai|vgd nai|card nai/i, signal: "missing entitlement card" },
  { pattern: /meye|chele|bacc?a/i, signal: "children in household" },
  { pattern: /bharti|hospitol|hospital|clinic/i, signal: "health facility mentioned" },
  { pattern: /\bgrant\b|\bloan\b|byabsha|byabsa/i, signal: "livelihood support requested" },
  { pattern: /boi|kitab|khati?a|khata/i, signal: "education materials" }
];

const URGENT_PATTERNS = [/dropout/i, /\bmerge\b|operation|IOC\b/i, /income nai/i, /stipend lagbe/i];
const MEDIUM_PATTERNS = [/card nai/i, /meye|chele/i, /boi|khata/i];

const DOCS_BY_SIGNAL: Record<string, string[]> = {
  "stipend requested": ["School certificate", "Student ID"],
  "school dropout": ["Dropout certificate from school"],
  "medical referral likely": ["Medical prescription / diagnosis"],
  "missing entitlement card": ["Union parishad certificate"],
  "no household income": ["Income certificate"]
};

export function summarizeNote(rawNote: string): AiSummary {
  const text = rawNote.trim();
  const signals = KEYWORDS.filter((k) => k.pattern.test(text)).map((k) => k.signal);
  const uniqueSignals = [...new Set(signals)];

  const urgency = scoreUrgency(text, uniqueSignals);

  const need = deriveNeed(uniqueSignals);
  const context = deriveContext(text, uniqueSignals);

  const actions = deriveActions(uniqueSignals);
  const documents = uniqueSignals
    .flatMap((s) => DOCS_BY_SIGNAL[s] ?? [])
    .slice(0, 4);

  const donorLine = buildDonorLine(need, urgency, uniqueSignals);

  return { need, context, urgency, actions, documents, donorLine };
}

function scoreUrgency(text: string, signals: string[]): "low" | "medium" | "high" {
  if (URGENT_PATTERNS.some((p) => p.test(text)) || signals.includes("no household income")) {
    return "high";
  }
  if (MEDIUM_PATTERNS.some((p) => p.test(text)) || signals.length >= 3) return "medium";
  return "low";
}

function deriveNeed(signals: string[]): string {
  if (signals.includes("stipend requested")) return "Education stipend for school-age child";
  if (signals.includes("medical referral likely")) return "Health referral and assistance";
  if (signals.includes("livelihood support requested")) return "Livelihood grant";
  if (signals.length === 0) return "General assistance assessment";
  return "Programme assistance based on flagged needs";
}

function deriveContext(text: string, signals: string[]): string {
  const cls = text.match(/class (\d+)/i);
  const parts: string[] = [];
  if (signals.includes("no spouse / widow")) parts.push("female-headed household");
  if (signals.includes("no household income")) parts.push("no income source");
  if (cls) parts.push(`child in class ${cls[1]}`);
  if (signals.includes("missing entitlement card")) parts.push("lacks entitlement card (e.g. VGD)");
  return parts.length ? parts.join("; ") : "Household context as per officer note";
}

function deriveActions(signals: string[]): string[] {
  const actions: string[] = [];
  if (signals.includes("stipend requested")) actions.push("Verify school enrollment with head teacher");
  if (signals.includes("school dropout")) actions.push("Visit school to confirm dropout status");
  if (signals.includes("medical referral likely")) actions.push("Schedule health referral follow-up");
  if (signals.includes("missing entitlement card")) actions.push("Check VGD/entitlement card eligibility with UP");
  if (signals.includes("no household income")) actions.push("Confirm income status via neighbour reference");
  if (actions.length === 0) actions.push("Household visit to verify need");
  return actions;
}

function buildDonorLine(need: string, urgency: string, signals: string[]): string {
  const urgencyWord = urgency === "high" ? "urgent" : urgency;
  return `${need} requested (${urgencyWord})${signals.includes("no household income") ? " for an income-less household" : ""}.`;
}
