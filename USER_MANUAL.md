# NGOField — User Manual

**Beneficiary Request and Case Follow-up System**
Built on SELISE Blocks · https://dbtolf-elhxt.slsblx.com

---

## 1. About NGOField

NGOField lets field officers, programme coordinators, and regional managers track every
beneficiary request from field note to outcome. Each household keeps a permanent case
history — programmes, assistance, referrals, follow-ups — that survives officer transfers.
Sensitive details are need-to-know, and donor reporting is aggregate-only.

### The three roles

| Role | Who they are | What they see |
|---|---|---|
| **Field officer** | Records requests in the field | Own cases, households in their assignment, no sensitive PII |
| **Programme coordinator** | Approves and assigns cases | Their review queue, full case detail, household histories |
| **Regional manager** | Oversees districts and donors | Overdue board, donor aggregates, transfers, audit trail |

---

## 2. Getting started

### 2.1 Sign in

1. Open **https://dbtolf-elhxt.slsblx.com**
2. Click **Continue with Blocks** — you are redirected to the secure Blocks login page
3. Enter your email and password
4. After login you land on your **Profile** page

### 2.2 Demo accounts

| Person | Email | Password | Role |
|---|---|---|---|
| Meherab (officer) | `meherab0210@gmail.com` | `Ngofield1` | field-officer |
| Ashraf (officer 2) | `meherab0210+ashraf@gmail.com` | `Ngofield1` | field-officer |
| Farida (coordinator) | `meherab.hossain@selisegroup.com` | `Ngofield1` | programme-coordinator |
| Salma (manager) | `hossainmeherab157@gmail.com` | `Ngofield1` | regional-manager |

> Password policy: minimum 8 characters with at least one letter and one digit.

### 2.3 Navigation

The left sidebar shows only the screens your role can use. Use the language switcher
(top right) to switch the interface between **English** and **বাংলা**.

### 2.4 First-time setup (manager, once)

If the system has no data yet, sign in as the manager and open
**https://dbtolf-elhxt.slsblx.com/seed**. This one-time page creates the demo households,
Rekha Bibi's case history, and the district follow-up backlog. It is idempotent — running
it again when data exists does nothing.

---

## 3. Field officer guide

### 3.1 Record a request 　`Record request`

1. **Select household** — pick the beneficiary household from the dropdown
2. **Select programme** — education, livelihood, or health
3. **Type the field note** — plain Banglish shorthand is fine, e.g.:

   > *Rekha bibi, swami na thaka, chele helen class 8 drop 3 mas, meye class 5,
   > barite income nai, VGD card nai, school sir bole stipend lagbe.*

4. Watch the **AI case summary** panel on the right build itself as you type:
   need, household context, urgency, suggested actions, documents to collect, and a
   one-line donor-report draft
5. *(Optional)* Click **ask agent** — the Blocks AI agent adds a short Bangla advisory
   for the coordinator (what to verify, what to decide). This takes ~5–10 seconds
6. Click **Submit case**

The case is now `submitted` and waits in the coordinator's review queue. The duplicate-risk
check runs automatically at submission (see 4.2).

### 3.2 My cases 　`My cases`

All your cases with status (`submitted`, `approved`, `rejected`), approved amount, and a
duplicate-risk badge (0–100). Click **View household →** to open the household's full story.

### 3.3 Household timeline

Every household page shows the complete case history as a timeline:

- 🔵 **case** — requests with their summary
- 🟢 **assistance** — delivered amounts and dates
- 🟠 **follow-up** — due dates and status

A new officer opening a household understands its story in one minute — even if every entry
was recorded by a predecessor.

---

## 4. Programme coordinator guide

### 4.1 Review queue 　`Review queue`

Each submitted case card shows:

- The **AI case summary** (need, context, urgency, actions, documents)
- The **original field note** (expandable) — always the source of truth
- The **Blocks Agent advisory** in Bangla, if the officer requested one
- The **duplicate-risk banner** when the household has prior assistance

### 4.2 Duplicate-assistance risk

Before you approve, the system cross-checks the household's assistance history:

- **Score 0–49 (amber)**: informational — prior assistance exists, review the timeline
- **Score 50+ (red)**: approval is **blocked** until you tick
  *"I have reviewed the household history and confirm this is not a duplicate"*

Reasons are always listed (e.g. *"Household already received education assistance in the
last 6 months"*). Duplicate service is caught **before** approval — not in a donor audit.

### 4.3 Approve a case

1. Click **Edit & approve…**
2. Adjust the **amount** (e.g. ৳1,200 stipend) and the **donor report line**
3. Set the **follow-up due date** (default: 30 days)
4. Click **Approve ৳…**

Approval automatically:
- Records an **Assistance** entry on the household
- Creates a pending **FollowUp** for the assigned officer
- Writes an **audit log** entry

### 4.4 Reject a case

Click **Reject** — the case is marked `rejected` and stays in the household history.

---

## 5. Regional manager guide

### 5.1 District board 　`District board`

Cards per district showing **overdue** (past due, not done), pending, and completed
follow-up counts. Districts with overdue items are highlighted red. The demo seed produces
the signature view: **Kurigram backlog: 7**.

### 5.2 Donor report (aggregate)

The lower table shows programme funnels — requested → approved → delivered → total
delivered (৳) — with **no individual beneficiary data**, ever. Individual-level access
always requires a recorded justification.

### 5.3 Officer transfer 　`Officer transfer`

When an officer rotates districts (every 6–12 months):

1. Pick the **transferring officer** and the **new officer**
2. Review the preview: how many households, cases, and follow-ups will move
3. Click **Execute transfer**

Everything is reassigned in one action; the household histories stay attached to each
household. The transfer is written to the audit log. Beneficiaries never retell their
story to a new officer — the new officer reads it instead.

---

## 6. Privacy & access model

| Rule | Enforcement |
|---|---|
| Officers see their own cases | App scoping on `assignedOfficerId` |
| Officers cannot write others' records | Data-gateway policy (server-enforced) |
| Sensitive fields (poverty score, health notes, entitlements) flagged PII | Schema-level `isPIIData` |
| Case writes restricted to assigned officer | Server-side write policies |
| Approvals, transfers, individual access audited | `AuditLog` records with actor + justification |
| Donor views aggregate-only | No household PII in donor queries |

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| **Login button does nothing** | Confirm you opened the HTTPS URL (not `http://localhost`); clear cookies and retry |
| **Wrong password** | Password needs 8+ characters, ≥1 letter, ≥1 digit. After 5 wrong attempts the account locks for 5 minutes |
| **"You do not have access to this view"** | That screen belongs to another role — sign in with the matching demo account |
| **ask agent returns nothing** | The agent call failed (timeout or service busy); the structured summary is unaffected. Retry or submit without it |
| **Kurigram shows 0 overdue** | Run the seed page (§2.4) as the manager |
| **Blank page after deploy** | Hard refresh (⌘⇧R / Ctrl+F5) to bust the cached bundle |

---

## 8. The 3-minute demo script

1. **Meherab** (officer) — *Record request*: select Rekha Bibi → education → paste the
   Banglish note → **ask agent** → submit
2. **Farida** (coordinator) — *Review queue*: open the case → see the red duplicate-risk
   banner (prior health assistance 4 months ago) → open Rekha's household timeline → the
   linked story changes the decision → acknowledge → edit stipend to **৳1,200** → approve
3. **Salma** (manager) — *Officer transfer*: Meherab → Ashraf → execute → open Rekha's
   household: full history intact under the new officer
4. **Salma** — *District board*: Kurigram backlog and the donor aggregate table —
   field note to outcome, no individual exposed
