# NGOField — Beneficiary Request and Case Follow-up System
## Complete Build Plan on SELISE Blocks

> Source case: `08-NGOField.pdf` — an NGO running education stipends, livelihood grants, and health
> referrals across Kurigram, Gaibandha, Jamalpur, and Cox's Bazar with 20 field officers.
> Build target: case records survive officer transfers, follow-ups are tracked, privacy is
> need-to-know, donors get aggregate reporting, and AI turns Banglish shorthand into case records.

---

## 1. Current State (probed 2026-09-14)

| Area | State | Action needed |
|---|---|---|
| Project | **NGO App** selected (`Df2bf226ee89d4af788795582df3bfbd2`), dev env | None |
| App domain | `https://dbtolf-elhxt.slsblx.com` (verified) | None |
| CLI | 0.5.0 (latest), auth valid, project mode | None |
| OIDC clients | **0** | Phase 1 |
| Identity providers | **0** | Phase 1 |
| `isOidcEnabled` | **false** | Phase 1 |
| Users | **0** | Phase 3 |
| Roles | **0** (beyond built-ins) | Phase 3 |
| Data schemas | **0**; gateway on Blocks-managed storage | Phase 4 |
| Mail | Pre-configured (SES SMTP, sender `blocks@selise.io`) | None |
| Storage | Pre-configured (Azure) | None |
| Localization | `en-US` default; several languages exist | Phase 6 |
| App scaffold | **Not created** | Phase 2 |

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React 18 + Vite SPA (blocks new web scaffold)              │
│  https://dbtolf-elhxt.slsblx.com  /  local :5173 HTTPS      │
├─────────────────────────────────────────────────────────────┤
│  @seliseblocks/client (single createBlocksClient)           │
│  ├── auth (hosted login, refresh, guards)                   │
│  ├── data.collection / data.graphql (all records)           │
│  ├── data.files (beneficiary documents)                     │
│  ├── notifier (in-app alerts)   ├── mail (donor reports)    │
│  └── localization (en-US / bn-BD)                           │
├─────────────────────────────────────────────────────────────┤
│  Blocks Cloud (project Df2bf226…)                           │
│  IAM (roles, users, OIDC) · Data Gateway (6 schemas)        │
│  Storage (Azure) · Mail (SES) · Notifier · Localization     │
└─────────────────────────────────────────────────────────────┘
```

**Personas → roles:**

| Role | IAM slug | Sees |
|---|---|---|
| Field officer | `field-officer` | Households in assigned districts only; no PII fields |
| Programme coordinator | `programme-coordinator` | Own programme's cases, full detail, approve/assign |
| Regional manager | `regional-manager` | District rollups, overdue board, aggregates only |

---

## 3. Phase-by-Phase Plan

### Phase 1 — App login (CLI, ~15 min)

```bash
# 1. Public OIDC client + linked identity provider in one call
blocks auth oidc-clients save \
  --client-display-name "NGOField" \
  --client-type public \
  --redirect-uris "https://dbtolf-elhxt.slsblx.com/login/callback" \
  --register-as-identity-provider \
  --active \
  --dry-run --json
# review, then rerun with --yes --json   → note the returned clientId

# 2. Verify provider health (authorizationUrl must be non-null)
blocks auth idp list --json

# 3. Enable OIDC login
blocks auth config save --oidc-enabled true --dry-run --json
# review, then --yes --json
```

**Gate:** client listed with `client-type public` · IdP `authorizationUrl` non-null ·
`isOidcEnabled: true`.

### Phase 2 — Scaffold + first login (~30 min)

```bash
blocks new web ngo-field \
  --x-blocks-key Df2bf226ee89d4af788795582df3bfbd2 \
  --app-domain https://dbtolf-elhxt.slsblx.com \
  --client-id <clientId-from-phase-1> \
  --yes

cd ngo-field
npm install
blocks init          # creates blocks.json + blocks/data/ INSIDE the app dir
npm run cert
```

1. Read `VITE_BLOCKS_DEV_HOST` from generated `.env`.
2. Add hosts entry: `echo "127.0.0.1 ${VITE_BLOCKS_DEV_HOST}" | sudo tee -a /etc/hosts`
3. Add dev redirect URI to the OIDC client (byte-for-byte, port included):
   `https://<VITE_BLOCKS_DEV_HOST>:5173/login/callback`
4. `npm run dev` → open `https://<VITE_BLOCKS_DEV_HOST>:5173` → complete a real login.

**Gate:** a real user logs in over HTTPS on the dev domain.

### Phase 3 — Roles + users (~30 min)

```bash
for r in field-officer programme-coordinator regional-manager; do
  blocks iam roles create --name "$r" --description "NGOField $r" --dry-run --json
  # review, then --yes --json
done

# Demo users (activation email flows through configured SES)
blocks iam users create --email rashid@ngo-field.test --first-name Rashid \
  --roles field-officer --dry-run --json        # then --yes
blocks iam users create --email coord@ngo-field.test --first-name Farida \
  --roles programme-coordinator --dry-run --json
blocks iam users create --email manager@ngo-field.test --first-name Salma \
  --roles regional-manager --dry-run --json
```

Feature-gate UI via `blocksClient.iam.roles` (access-control skill's read-only gating pattern).

**Gate:** 3 roles exist; each demo user activates via email and logs in.

### Phase 4 — Data model (~1–2 h)

Author `blocks/data/schemas/*.json` + `blocks/data/rules.json` (in `ngo-field/blocks/data/`),
then:

```bash
blocks data validate --json
blocks data sync --dry-run --json     # push schemas + deploy rules + reload
# review, then --yes --json
```

**Schemas:**

| Schema | Fields (type; flags) |
|---|---|
| `Household` | `headName` (string), `district` (string, enum: Kurigram/Gaibandha/Jamalpur/Cox's Bazar), `upazila`, `village`, `memberCount` (int), `povertyScore` (int; **PII**), `healthNotes` (string; **PII**), `entitlementCards` (string array) |
| `OfficerProfile` | `userId` (string, unique), `name`, `districts` (string array), `isActive` (bool) |
| `CaseRequest` | `householdId` (ref), `programme` (enum education/livelihood/health), `rawNote` (string), `aiSummary` (object: need/context/urgency/actions/documents), `urgency` (enum), `status` (enum draft/submitted/approved/rejected/closed), `assignedOfficerId` (ref), `amount` (decimal), `donorLine` (string), `dupRiskFlag` (object: score/reasons) |
| `FollowUp` | `caseRequestId` (ref), `householdId` (ref), `district` (string), `dueDate` (datetime), `status` (enum pending/done/overdue), `notes` |
| `Assistance` | `caseRequestId` (ref), `householdId` (ref), `programme`, `amount` (decimal), `deliveredDate` (datetime) — **duplicate-detection source of truth** |
| `AuditLog` | `actorUserId`, `action` (enum view-individual/export-individual/approve/assign/...), `recordRefs` (string array), `justification` (string, required for individual-level access), `timestamp` |

**Access rules (`rules.json`):**

- `field-officer`: create/read `CaseRequest`, `FollowUp` where `assignedOfficerId` is self or
  unassigned; read `Household` **excluding** `povertyScore` + `healthNotes`; read own `OfficerProfile`.
- `programme-coordinator`: full CRUD on own programme's `CaseRequest` (filter `programme`),
  read `Assistance`, read full `Household`.
- `regional-manager`: read aggregated `FollowUp`/`CaseRequest`/`Assistance` (no raw
  `Household` PII), read `AuditLog`.
- Every individual-level read/export of PII is app-gated: mandatory justification text →
  write `AuditLog` row before data is shown.

**Gate:** `data sync` succeeds; reload confirmed; test records via GraphQL round-trip.

### Phase 5 — App build (~1–2 days)

All data access through the scaffold's single `blocksClient` — `data.collection()` for CRUD,
`data.graphql()` for household-history joins and the overdue-by-district rollup.

**Screens:**

1. **Officer — quick capture**: textarea for raw Banglish shorthand → creates `CaseRequest`
   (status `submitted`), notifies coordinators via `notifier.notify()`.
2. **AI summarize** (`ai/summarize.ts` behind one function):
   - *Primary path*: `blocks localization assistant translation-suggestion`-equivalent SDK/LLM
     surface — pass raw note as `element-detail-context`, receive structured summary.
   - *Fallback path*: external LLM API with key in `.env` (never committed).
   - Output: case summary (need, household context, urgency, suggested follow-ups, documents
     needed) + one-line donor-report draft — shown to coordinator for edit before becoming the
     case of record.
3. **Coordinator — review queue**: AI summary editable → approve (set amount, assign officer)
   → creates `Assistance` + scheduled `FollowUp`.
4. **Duplicate-risk banner (challenge requirement)**: on submit AND before approval, query
   household's `Assistance` history via `data.graphql()`; flag likely double-service with
   reasons; coordinator must acknowledge before approving.
5. **Household timeline**: full case history (requests, assistance, follow-ups, referrals)
   joined on `householdId` — one minute to understand the story.
6. **Officer transfer**: reassign `assignedOfficerId` across all open records; history stays
   with the household. No data copied or lost.
7. **Manager — overdue board**: `FollowUp` where `dueDate < now && status = pending`, rolled
   up by district (e.g. Kurigram: 7), plus programme funnels and outcomes.
8. **Donor reports**: aggregate-only views (funnels, outcomes, case trails with household
   de-identified). Individual export requires justification → `AuditLog` → `notifier.notify()`
   to regional manager. Delivery via `mail.send()`.

**Notifications wiring:**

| Event | Notifier target |
|---|---|
| CaseRequest submitted | coordinators of that programme |
| Case approved/assigned | assigned officer |
| FollowUp overdue (daily check) | officer + manager |
| Individual-level export | regional manager (audit trail) |

**Gate:** full demo script (Phase 7) walks end-to-end with 3 personas logged in.

### Phase 6 — Localization + documents (~1 h)

```bash
# bn-BD + en-US dictionaries from local JSON
blocks localization push --module ngo-field --language bn-BD --file ./i18n/bn-BD.json --dry-run --json
blocks localization push --module ngo-field --language en-US --file ./i18n/en-US.json --dry-run --json
```

- Language switcher via scaffold's `localization.load` + `t()` pattern.
- Beneficiary documents: `data.files.upload` into per-district directories
  (`data.files.directory-create`), ACLs via `data.files.access-grant` (officer role: View;
  coordinator: Download).

**Gate:** UI renders fully in bn-BD; a document upload is visible only to permitted roles.

### Phase 7 — Demo data + script (~1 h)

Seed via CRUD (scripted or manual) matching the case PDF:

1. Rekha Bibi household (Kurigram) with prior **health referral 4 months ago** in history.
2. Officer Rashid captures: *"Rekha bibi, swami na thaka, chele helen class 8 drop 3 mas,
   meye class 5, barite income nai, VGD card nai, school sir bole stipend lagbe."*
3. AI summarizes → coordinator Farida edits stipend amount (৳1,200) → history check reveals
   the health referral → decision changes → approve + assign follow-up.
4. Transfer Rashid to Jamalpur (`OfficerProfile.districts` update) → open Kurigram cases
   reassign to new officer; household timeline intact.
5. Manager Salma opens overdue board: **Kurigram backlog: 7** (seed 7 pending follow-ups).

**Gate:** demo runs clean twice in a row.

### Phase 8 — Deploy (~30 min)

```bash
# commit + push to the repo linked to the project (dev env branch)
blocks release deploy --dry-run --json
blocks release deploy --wait --json
```

Verify login + core flows on `https://dbtolf-elhxt.slsblx.com`.

**Gate:** deployed app passes the Phase 7 demo on the public domain.

---

## 4. Rules of Engagement

- `--dry-run` → human approval → `--yes` on **every** mutating command. No exceptions.
- No raw `fetch`/`curl` against Blocks APIs — CLI for admin, `@seliseblocks/client` in app code.
- Never print/commit secrets, tokens, client secrets, or PII in logs.
- PII fields flagged `isPIIData` in schemas; sensitive reads always audit-logged.
- `data sync` (never bare `schema push`) so reload is guaranteed.
- Sequential CLI calls only (auth transitions are mutex-protected).

## 5. Schedule

| Phase | Effort | Cumulative |
|---|---|---|
| 1 App login | 15 min | 15 min |
| 2 Scaffold | 30 min | 45 min |
| 3 Roles + users | 30 min | 1.25 h |
| 4 Data model | 1–2 h | ~3 h |
| 5 App build | 1–2 days | ~2 days |
| 6 Localization + docs | 1 h | ~2.25 days |
| 7 Demo data + script | 1 h | ~2.5 days |
| 8 Deploy | 30 min | **~2.5–3 days** |

## 6. Open Decisions / Risks

| # | Item | Mitigation |
|---|---|---|
| 1 | AI engine: platform LLM surface vs. external API | Keep AI behind one function (`ai/summarize.ts`); swap is ≤ 30 min. Decide in Phase 5 after testing structured output quality. |
| 2 | Translation-suggestion endpoint may resist JSON-shaped output | Prompt for delimited plain text, parse locally; else fallback path. |
| 3 | Officer district-scoping is app-level (rules filter by assignment fields) | Enforce in GraphQL query layer + verify with negative tests in Phase 4 gate. |
| 4 | Redirect URI byte-mismatch breaks login | URI registered in both prod + dev forms during Phase 2; re-verify after any port change. |
| 5 | Donor reporting must never expose individuals | Aggregate-only queries; individual path hard-gated by justification + AuditLog. |
