## Context

Two compounding gaps (playtest findings C4 + M1):

1. **Wizard roster is placeholder-only.** The creation wizard's roster step (`src/components/gameplay/pages/campaigns/create/CreateCampaignPage.RosterStep.tsx` + `.submit.ts`) builds `SelectedUnit`s from `UNIT_TEMPLATES` (`@/simulation/generator`) — generic weight-class stubs with no canonical `unitRef` — and `SelectedPilot`s that all default to "MechWarrior 1" and are stored only as campaign personnel, never registered with the pilot vault (Personnel detail shows "Pilot not found in vault"; Mech Bay shows "not cataloged"; encounter BV is 0).
2. **Materializer discards the selection.** `materializeCampaignMissionEncounter` (`src/lib/campaign/encounter/materializeCampaignMissionEncounter.ts`) validates the roster (`assertLaunchRoster`), then `selectPlayerUnitRef` (lines 109-123) reduces it to ONE unit keyword-mapped onto hardcoded `atlas-as7-d`/`marauder-mad-3r` (`CANONICAL_UNIT_REFS`, lines 51-57); `createAssignedForce` (143-186) assigns only `assignments[0]`; the OpFor is always one `marauder-mad-3r` (line 317-321). Pilot assignments never appear in any payload. Diagnostics already log the full selection (`selectedRosterUnitIds`, line 356) — the data survives to the doorstep and is dropped there.

The quick-game path already plays 4v4 with canonical units, so the session/engine layer downstream of the encounter handles multi-unit forces; the gap is confined to wizard data quality and the materializer.

## Goals / Non-Goals

**Goals:**
- Every roster unit created by the wizard carries a real canonical `unitRef`; every wizard pilot is vault-registered with a distinct name.
- Every unit selected at Mission Launch lands in the player force with its pilot; OpFor size matches player deployment.
- Unresolvable roster units block launch visibly instead of being silently substituted.

**Non-Goals:**
- Full canonical unit picker in the wizard (representative default mapping now; picker is follow-up UX).
- OpFor composition intelligence beyond count + BV floor (force-generator deep integration is its own change).
- Phase progression fixes (in-flight change `fix-battle-phase-progression`).
- Migrating pre-existing campaigns' placeholder rosters (see Migration).

## Decisions

**D1 — Representative canonical mapping at template selection, stored on the roster entry.**
Extend the wizard's weight-class templates with a `canonicalUnitRef` (one well-known, intro-tech unit per class, chosen from the canonical DB at build time — e.g. a 25t light, 50t medium, 75t heavy, 100t assault; implementer picks refs that exist in `public`/SQLite canonical data and validates at test time). `SelectedUnit` → roster entry → `IRosterUnitProjection` all carry `unitRef`. Alternative: resolve at launch time by weight class. Rejected: launch-time guessing recreates the current keyword hack; creation-time binding makes Mech Bay/BV/refit correct immediately.

**D2 — Wizard pilots become vault pilots with distinct names.**
Submit path suffixes default names per index ("MechWarrior 1"…"MechWarrior 4") and registers each pilot through the same persistence the Personnel detail panel reads (the vault-backed pilot store the panel queries when it currently reports "Pilot not found in vault"). Campaign personnel entries keep a `pilotRef` to the vault record. Alternative: keep campaign-local pilots and teach the panel to read them. Rejected: two pilot sources of truth; the vault is the spec'd home (pilot detail, progression, GM reload's `pilotRef` all assume it).

**D3 — Materializer maps the whole selection; no fallback refs.**
Delete `selectPlayerUnitRef`, `DEFAULT_PLAYER_UNIT_REF` keyword logic, and `CANONICAL_UNIT_REFS`. Player force creation becomes: create force, then one assignment per selected roster unit (`unitRef` + pilot). Extend `assertLaunchRoster` to reject any selected unit lacking a resolvable `unitRef` with a per-unit reason surfaced on the Mission Launch readiness card (existing eligibility badge slot). `createAssignedForce` generalizes to `createAssignedForceWithUnits(units: {unitRef, pilotRef?}[])` — add assignment slots as needed via the existing `/api/forces` assignment API rather than only `assignments[0]`. Alternative: keep a fallback for legacy rosters. Rejected: silent substitution is the bug; legacy rosters are handled by migration messaging (below).

**D4 — OpFor sized to player force with deterministic canonical picks.**
Opponent force gets N units where N = player deployment size. Selection: if the force-generator service exposes a BV-window pick, use it with the player force BV as target; otherwise a deterministic rotation over a small curated canonical list (seeded by encounter id for replayability). Hardcoded single-Marauder path is removed. Determinism matters: the auto-resolve/simulate paths must stay reproducible.

**D5 — Pilot data flows to the session as pilotRef, not copies.**
Force assignments carry `pilotRef`; the encounter launch snapshot resolves gunnery/piloting from the vault pilot at session creation (same resolution the GM unit-reload reconciliation spec assumes via `unitRef`/`pilotRef`). No pilot stat duplication in the roster entry. In-battle status panel then shows the pilot name instead of "Unknown Pilot" for assigned crews.

## Risks / Trade-offs

- [Existing campaigns hold placeholder rosters with no `unitRef` → their launches would now block] → Migration messaging: launch readiness card explains "unit has no canonical record — recreate the campaign or edit the unit in Mech Bay"; ALSO ship a one-time roster upgrade helper that backfills `unitRef` on placeholder entries using the same representative mapping (pure additive field write, reversible). Task-gated so the playtest campaigns keep working.
- [Representative refs may not exist in a trimmed canonical DB] → tests assert each mapped ref resolves against the shipped canonical dataset; build fails loudly if the data moves.
- [Multi-assignment force API may cap lance size] → verify `/api/forces` assignment semantics for >1 slot early (task 1.1); if the Lance type enforces 4 slots that matches the wizard cap (4 units) — assert, don't assume.
- [OpFor determinism vs variety] → seeded selection documented in code comment; variety improvements deferred to force-generator change.

## Migration Plan

Additive schema fields (`unitRef` on roster entries, `pilotRef` on personnel/assignments) — no destructive migration. Legacy placeholder rosters: backfill helper (D3/risk 1) runs on campaign load, logs what it mapped. Rollback = revert PR; backfilled fields are inert to old code.

## Open Questions

- None blocking. If the vault pilot registration API turns out to be client-unreachable at wizard-submit time (SSR/route timing), fallback is registering on first Personnel page load — implementer notes the deviation in the PR if taken.
