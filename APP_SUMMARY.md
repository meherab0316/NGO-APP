# NGOField — App Summary

**Beneficiary Request and Case Follow-up System for Bangladeshi NGOs**
Built end-to-end on SELISE Blocks · https://dbtolf-elhxt.slsblx.com

---

## The problem

An NGO running education stipends, livelihood grants, and health referrals across
Kurigram, Gaibandha, Jamalpur, and Cox's Bazar had 20 field officers tracking
beneficiary requests **on paper and memory**. The consequences:

- **Cases lost on transfer** — officers rotate every 6–12 months; their notebooks leave with them
- **Missed follow-ups** — promised verbally, forgotten in practice; a dropout child can lose a year for want of a ৳1,200 stipend
- **Duplicated assistance** — the same household served twice while another waits unseen; a donor-audit exception that threatens funding
- **No visibility** — coordinators see requests days late; managers can't see backlog; donors demand case trails
- **Privacy risk** — a beneficiary data leak is an existential programme risk

## The solution

NGOField gives every household a **permanent case record** that belongs to the
household and the area — never to an officer's notebook. Requests flow from
Banglish shorthand to structured case records to decisions to follow-ups, with
privacy enforced at every layer.

### Core capabilities

| Capability | How it works |
|---|---|
| **Rapid shorthand capture** | Officer types raw Banglish ("*swami na thaka, barite income nai, VGD card nai…*"); AI parses it live into a structured summary |
| **AI case summaries** | Need, household context, urgency, suggested actions, documents needed, and a one-line donor draft — before the officer even submits |
| **Household case history** | Full timeline (cases, assistance, follow-ups) joined per household; a new officer understands the story in one minute |
| **Transfer-proof records** | One-click officer transfer reassigns households, cases, and follow-ups together; history stays attached to the household |
| **Follow-up tracking** | Due dates on every approval; manager's district board surfaces everything overdue (the demo's "Kurigram: 7") |
| **Proactive duplicate detection** | Every request is cross-checked against the household's assistance history at submission; high risk **blocks approval** until the coordinator acknowledges it — caught before approval, not in an audit |
| **Need-to-know privacy** | PII fields flagged in the schema; officers scoped to their own records (server-enforced); coordinators see their queue; managers see aggregates only |
| **Audited actions** | Approvals, transfers, and individual-level access all write justification-bearing audit records |
| **Donor reporting** | Programme funnels and outcomes, aggregate-only — no individual ever exposed without stated reason |
| **Bilingual UI** | Full English and বাংলা interface via the Blocks Localization service |

### The AI layer (two engines, honest roles)

| Engine | What it does | Why |
|---|---|---|
| **Deterministic Banglish parser** | Structured JSON case record (need/context/urgency/actions/documents/donor line) + duplicate-risk scoring | The case record's shape must never depend on LLM variability |
| **Blocks Agents (LLM)** | Bangla advisory paragraph for the coordinator — what to verify, what to decide | Prose guidance is where an LLM genuinely helps; runs on the platform's own agents service (`agents.seliseblocks.com`) with the user's session token, degrading gracefully if unavailable |

## Architecture

```
React 18 + Vite SPA (blocks new web scaffold)
 ├── @seliseblocks/client — single client for all platform calls
 ├── Auth: hosted Blocks IAM login (public OIDC client, PKCE)
 ├── Data: 6 schemas via Data Gateway (GraphQL)
 │   Household · OfficerProfile · CaseRequest · FollowUp · Assistance · AuditLog
 ├── AI: Blocks Agents service (LLM advisory) + local parser
 └── Localization: en-US + bn-BD dictionaries
Cloud: IAM (roles: field-officer / programme-coordinator / regional-manager)
       Data Gateway (Blocks-managed storage, server-enforced write policies)
       Release (git-push deploys from GitHub dev branch)
```

- **Deploy loop**: push to `github.com/meherab0316/NGO-APP` → `blocks release deploy` → live at the project domain in ~2 minutes
- **Data model**: 6 schemas with denormalized district fields for rollups; PII flags on sensitive fields; server-side write policies scope creates/updates to the assigned officer
- **Access model**: data-layer write scoping + app-layer role gating (`useHasRole`) + audit logging on consequential actions

## Built with

- **SELISE Blocks**: IAM (OIDC login, roles, users), Data Gateway (schemas, policies), Localization, Release, Agents
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, lucide-react
- **CLI-driven ops**: every cloud mutation via `blocks` CLI with dry-run → approval discipline
- **~2,600 lines of app code** across 12 components/services

## Map to the case requirements

| Case requirement | Delivered |
|---|---|
| Record requests quickly in officer's own shorthand | ✅ Capture page with live AI preview |
| Full case history per household, no double-service | ✅ Household timeline + duplicate-risk gate |
| Survive officer transfers | ✅ Transfer screen with preview + audit |
| Follow-ups with due dates, overdue by district | ✅ District board (Kurigram: 7) |
| Privacy by design, need-to-know | ✅ PII flags, scoping policies, aggregate-only donor views |
| Donor reporting without exposing individuals | ✅ Aggregate funnels + justification-gated individual access |
| AI: summarize Banglish shorthand | ✅ Parser (structure) + Blocks Agent (advisory) |
| AI challenge: flag duplicates before approval | ✅ Score + reasons + acknowledgement gate at approval time |
| Demo: Rekha Bibi script incl. both complications | ✅ Seeded, reproducible in 3 minutes (see USER_MANUAL.md) |

## Try it

1. Open **https://dbtolf-elhxt.slsblx.com** — sign in with a demo account (see `JUDGE_CREDENTIALS.md`, gitignored)
2. Follow the 3-minute script in `USER_MANUAL.md` §8

**Artifacts**: `plan.md` (build plan) · `USER_MANUAL.md` (user guide) · `JUDGE_CREDENTIALS.md` (demo accounts, share directly) · `blocks/data/` (schemas + policies as code)
