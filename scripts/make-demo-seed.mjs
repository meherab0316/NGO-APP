#!/usr/bin/env node
// NGOField demo seed - runs GraphQL via the authenticated Blocks CLI session.
// Uses `blocks data graphql` equivalent: the CLI has no record-write command,
// so this script drives the app's own Data Gateway through @seliseblocks/client
// with the CLI-impersonated token is NOT available - instead it prints the
// mutations for the running app. Simplest reliable path: seed via the
// gateway's GraphQL endpoint using the officer session from the browser is
// manual; here we generate a seed JSON the app can import once.
// See seed-notes.md - actually, direct seeding uses the runtime gateway with
// a project token obtained via `blocks auth` is not exposed. This script
// instead produces demo-data.json consumed by the app's seed page (admin).

import { writeFileSync } from "node:fs";

const OFFICER_MEHERAB = "805e7cc2-2f04-4dad-bbe3-dfe76d3f7a4c"; // field-officer (Kurigram)
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString();

const seed = {
  households: [
    {
      clientRef: "rekha",
      headName: "Rekha Bibi",
      district: "Kurigram",
      upazila: "Nageshwari",
      village: "Charpara",
      memberCount: 3,
      povertyScore: 18,
      healthNotes: "Elder son has respiratory issues; referred to Upazila Health Complex May 2026.",
      entitlementCards: [],
      assignedOfficerId: OFFICER_MEHERAB
    },
    ...["Abdul Karim", "Jahanara Begum", "Mokbul Hossain", "Shahida Khatun", "Rustom Ali", "Ayesha Siddiqua", "Nural Islam", "Fatema Khatun"].map((name, i) => ({
      clientRef: `h${i + 2}`,
      headName: name,
      district: ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"][i % 4],
      upazila: "Sadar",
      village: `Village ${i + 1}`,
      memberCount: 4 + (i % 3),
      povertyScore: 15 + i,
      healthNotes: "",
      entitlementCards: i % 3 === 0 ? ["VGD"] : [],
      assignedOfficerId: OFFICER_MEHERAB
    }))
  ],
  caseRequests: [
    {
      householdRef: "rekha",
      programme: "health",
      rawNote: "Rekha bibi chele helen hobar chesta kosto, hospitol refer kora hoyechilo",
      aiSummary: JSON.stringify({
        need: "Health referral follow-up",
        context: "Child respiratory case; Upazila Health Complex referral",
        urgency: "medium",
        actions: ["Visit household to check referral completion"],
        documents: ["Medical prescription"],
        donorLine: "Health referral supported for a Kurigram household."
      }),
      urgency: "medium",
      status: "closed",
      assignedOfficerId: OFFICER_MEHERAB,
      amount: 800,
      donorLine: "Health referral supported for a Kurigram household.",
      dupRiskFlag: JSON.stringify({ score: 0, reasons: [] }),
      district: "Kurigram",
      createdDate: daysAgo(120)
    }
  ],
  assistances: [
    {
      caseRefIndex: 0,
      programme: "health",
      amount: 800,
      deliveredDate: daysAgo(115),
      district: "Kurigram"
    }
  ],
  followUps: [
    ...Array.from({ length: 7 }, (_, i) => ({
      householdRef: i === 0 ? "rekha" : `h${i + 2}`,
      caseRefIndex: null,
      district: "Kurigram",
      dueDate: daysAgo(10 - i),
      status: "pending",
      assignedOfficerId: OFFICER_MEHERAB,
      notes: "Seeded overdue follow-up (Kurigram backlog demo)"
    })),
    { householdRef: "h3", caseRefIndex: null, district: "Gaibandha", dueDate: daysAhead(14), status: "pending", assignedOfficerId: OFFICER_MEHERAB, notes: "" },
    { householdRef: "h5", caseRefIndex: null, district: "Jamalpur", dueDate: daysAhead(21), status: "pending", assignedOfficerId: OFFICER_MEHERAB, notes: "" }
  ]
};

writeFileSync("demo-seed.json", JSON.stringify(seed, null, 2));
console.log("demo-seed.json written:", seed.households.length, "households,", seed.caseRequests.length, "cases,", seed.followUps.length, "follow-ups");
