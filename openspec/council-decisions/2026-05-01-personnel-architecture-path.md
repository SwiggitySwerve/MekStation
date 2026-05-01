# Council Decision — Personnel Architecture Path

**Date:** 2026-05-01
**Convened by:** `/council` on the question "based on these findings debate on the best path"
**Variant:** Lean+ (5-agent fan-out — Hephaestus + Oracle + Librarian dropped + Explore-Deep + Momus, plus Phase 0 Metis)
**Decision status:** Synthesis verified by Haiku (revision applied to Survival Score)

## Headline

Hephaestus withdrew his Path B in cross-attack; both proposers agreed on **C → D → synthesis** with two concrete patches and one new spike — but the entire sequence is gated on a single empirical fact about saved-campaign data that nobody has checked yet.

## Brief

Is `IPerson` / `usePersonnelStore` unfinished-but-intended architecture (must seed before any UI ships) or superseded design (must migrate consumers first)?

## What triggered the council

The change at `openspec/changes/add-campaign-roster-action-flows/` was paused after 3 review rounds (Codex × 2, OMO Council × 1) revealed structural problems. The third Codex review surfaced two HIGH findings beyond the spec patches: (a) `CampaignInstanceAssignmentOperations` is server-side with no API route, and (b) the proposed hook syncs `IPerson` projections but the panels render `IPilot`, leaving the rendered DOM stale even when assertions pass. Subsequent investigations revealed the system has **four parallel data layers**, only two are wired, and `IPerson` is load-bearing for **13 silently-broken production features**.

## Option space (post-Phase-0 Metis reframe)

| Option | Mechanism |
|---|---|
| **A** | Seed `IPerson` at campaign creation via `pilotToPerson()`. Fix the 13 broken features. Ship original spec against `IPerson`. |
| **B** | Migrate Layer 3 consumers to `ICampaignPilotState`. Drop `IPerson` / `usePersonnelStore` outright. Ship action-flows against Layer 2. |
| **C** | Path 0: ship XP-spend wiring on existing pilot detail page only. No roster panel, no assignment panel. Defer architecture. |
| **D** | Pause the PR. Open `decide-campaign-personnel-architecture` design-only change first. |
| **Synthesis** (Oracle, novel) | Split identity (vault `IPilot`) from employment (single roster type replacing Layer 2 + Layer 3). Retire Layer 4 entirely. |

## Decision (4-step sequence)

| Step | Effort | What it ships |
|---|---|---|
| **1.** Cancel current `add-campaign-roster-action-flows` PR. Mark superseded. | XS | Honest reset |
| **2.** 1-day spike: load 3 representative saved campaigns; diff `IPerson` fields against `pilotToPerson(IPilot)`. Output: empirical answer to "is `IPerson` carrying unique persisted data?" | XS | Decision input |
| **3.** New change `add-pilot-xp-spend-from-campaign` (Path C narrowed). Wires existing `usePilotStore.improveGunnery/improvePiloting/purchaseSPA` into a campaign entry point via vault join. NO `IPerson` writes, NO coordinator, NO `usePersonnelStore` touched. Drop integration test 6.1; replace with unit test on the wiring. | XS-S | Player can spend XP from inside a campaign |
| **4.** New change `decide-campaign-personnel-architecture` (D-fenced). Design-only spec change. **Hard scope fence:** decide substrate shape only — defer all role-expansion (techs/doctors/admins/etc.). Output: ADR for synthesis (vault = identity, roster = employment). | S | ADR + migration plan |
| **5.** New change `migrate-personnel-to-roster-employment` (synthesis). Repoint 13 enumerated features to the new substrate. Delete `IPerson`, `usePersonnelStore`, `ICampaignPilotInstance`, `pilotToPerson()`. Lock scope to those 13 features. | M (3d) | 13 broken subsystems start working |

**Conditional branch:** if step-2 spike reveals `IPerson` carries persisted user-state divergence, **revive Path B** with a real migration plan. Steps 3-5 collapse into a single B-PR.

## Survival Score

**Conditionally withdrawn pending spike result.** Hephaestus's Phase-2 Path B was withdrawn in cross-attack but explicitly conditioned on the spike: *"if CRUX resolves 'yes' [IPerson is persisted in main], I withdraw to Path B without further argument."* The spike at step 2 is the deciding instrument.

## Trade-offs accepted

- **The 13 broken subsystems stay broken for 1-2 PR cycles.** Salary, healing, turnover, vocational training, awards, life events, prisoner events, food/housing tax, daily cost summary, day-pipeline salary deduction, personnel roster UI, post-battle wound sync — all remain silent no-ops until step 5 ships.
- **3 review rounds on the canceled PR are sunk cost.** The value retained is the domain understanding now baked into this decision document.
- **Synthesis commits before non-pilot roles are designed.** Step 4 (D-fenced) explicitly defers techs/doctors/admins.

## Second-order consequences (6-month view)

- Once synthesis ships, every future OpenSpec change writing to "personnel" has a single canonical type to target. The "which personnel record?" cognitive tax disappears.
- `add-support-personnel-types` becomes a clean follow-up after step 5.
- Cross-campaign character continuity (user's stated vision: "PCs vault-wide, NPCs campaign-scoped") becomes naturally expressible.

## Open risks

- **Spike outcome flips the decision.** Track explicitly: if 3-saved-campaign diff reveals `IPerson` carries persisted user state diverging from vault, switch to Hephaestus's Path B with real migration plan.
- **D scope creep** (Hephaestus's risk). Mitigation: hard out-of-scope list at the top of D's proposal.
- **Synthesis scope creep** (Oracle's risk). Mitigation: lock to the 13 enumerated features; defer any 14th to a separate change.
- **`addPerson` upsert collision** is a live correctness risk in any path that includes the coordinator. Skipping the coordinator (Oracle's patch) eliminates this for step 3.

## Decision crux

Does saved-campaign user data persist `IPerson` character-sheet fields that diverge from vault `IPilot`? Spike answers this in one day.

## Context anchors (for future readers)

### The 13 silently-broken features

| Feature | File:Line |
|---|---|
| Salary calculation | `src/lib/finances/salaryService.ts:420` |
| Food & housing tax | `src/lib/finances/taxService.ts:215` |
| Daily cost summary | `src/lib/finances/FinanceService.ts:155` |
| Day-pipeline salary deduction | `src/lib/campaign/dayAdvancement.ts:329` |
| Injury healing | `src/lib/campaign/processors/healingProcessor.ts:18` |
| Turnover rolls | `src/lib/campaign/turnover/turnoverCheck.ts:257` |
| Turnover departures | `src/lib/campaign/processors/turnoverProcessor.ts:64` |
| Life events | `src/lib/campaign/processors/randomEventsProcessor.ts:49` |
| Prisoner events | `src/lib/campaign/processors/randomEventsProcessor.ts:63` |
| Vocational training XP | `src/lib/campaign/processors/vocationalTrainingProcessor.ts:136` |
| Auto-awards | `src/lib/campaign/awards/autoAwardEngine.ts:55` |
| Personnel roster UI | `src/pages/gameplay/campaigns/[id]/personnel.tsx:249` |
| Post-battle wound sync | `src/stores/campaign/useCampaignStore.ts:752` |

### The four data layers

1. **Vault** (`IPilot`, `IUnit`, `usePilotStore`, `/api/pilots/*`, `/api/forces/assignments/*`) — ✅ FULLY WIRED. Source of truth for PC progression.
2. **Lightweight roster** (`ICampaignPilotState`, `useCampaignRosterStore`) — ✅ WIRED. Created by campaign-creation flow.
3. **Heavyweight personnel** (`IPerson`, `usePersonnelStore`) — ⚠️ HALF-WIRED. Store created but never seeded. `pilotToPerson()` migration helper has zero callers. `IPerson.unitId` never written in production.
4. **Campaign Instance** (`ICampaignPilotInstance`, `CampaignInstanceService`) — ❌ ZERO production callers. Service layer fully built and tested in isolation.

### User's domain rule (decided)

- Player Characters: vault-wide. Persist across campaigns.
- NPCs: campaign-scoped. Generated ad-hoc.
- XP-spend mechanic must follow game rules (existing `PilotService` is correct).
- Same character should be usable across multiple campaigns/sessions/spin-offs.

### Oracle's synthesis (the destination architecture)

- **Vault `IPilot`** = the *character* (identity, combat skills, career XP, traits, ability progression). PCs persist here cross-campaign. NPCs also live here but flagged campaign-scoped.
- **Single campaign roster entry** (replacing both Layer 2 and Layer 3) = the *employment relationship* (salary, recruitment date, contract terms, current injuries/recovery, kill counts THIS campaign, prisoner status, assignment to mech, vocational training in progress). Holds vault `pilotId` reference. Never duplicates skills/XP.
- **Layer 4 retired entirely.**

## Token cost

~250K total (Phase 0 Metis 51K + Phase 2 Hephaestus 74K + Oracle 36K + Explore-Deep 53K + Momus 40K + Phase 3 Hephaestus 43K + Oracle 36K). Within Lean+ band.

## Verifier

Synthesis verified by Haiku (Phase 4.5). One revision applied: Survival Score corrected from "Killed and replaced" to "Conditionally withdrawn pending spike result." Verifier flagged: 13-features claim ✓, Hephaestus withdrawal ✓, dissent honestly preserved (suspended pending spike) ✓.

---

*This decision document supersedes the proposal/design/tasks/specs in `openspec/changes/add-campaign-roster-action-flows/`. That change has been marked SUPERSEDED.*
