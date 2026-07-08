## 1. Groundwork & API verification

- [x] 1.1 Verify `/api/forces` multi-assignment semantics: create a Lance force and add/assign 4 unit slots via the assignment API; document whether slots are pre-created (assignments array) or added on demand. Assert Lance capacity ≥ 4. Record findings in the PR description before building on them.
- [x] 1.2 Pick 4 representative canonical `unitRef`s (one per weight class: 25t/50t/75t/100t, intro-tech) that resolve in the shipped canonical dataset; add a data test that fails if any ref stops resolving.
- [x] 1.3 Add `unitRef` to the wizard roster types (`SelectedUnit` in `CreateCampaignPage.types.ts`, campaign roster entry `ICampaignRosterEntry`, `IRosterUnitProjection`) as an additive field; `npm run typecheck` gates the ripple.

## 2. Wizard produces real entities (D1, D2)

- [x] 2.1 Extend the wizard roster step templates (`CreateCampaignPage.RosterStep.tsx`, `UNIT_TEMPLATES` usage) so each weight-class card carries its representative `canonicalUnitRef`; display the real unit name alongside the class (e.g. "Light — <unit name>").
- [x] 2.2 Submit path (`CreateCampaignPage.submit.ts`): store `unitRef` on each created roster unit; suffix default pilot names by index ("MechWarrior 1..N").
- [x] 2.3 Register wizard pilots in the pilot vault at submit (the same store the Personnel detail panel reads); campaign personnel entries carry `pilotRef`. If vault registration is unreachable at submit time, register on first Personnel load and note the deviation in the PR (design.md Open Questions).
- [x] 2.4 Tests: roster persistence test (`__tests__/CreateCampaignPage.rosterPersistence.test.ts`) asserts `unitRef` + distinct pilot names + vault registration; Personnel detail panel resolves a wizard pilot (no "Pilot not found in vault").
- [x] 2.5 Backfill helper: on campaign load, placeholder roster entries (no `unitRef`) get the representative mapping applied once, with a diagnostic log of what was mapped; unit test covers idempotency.

## 3. Materializer carries the full selection (D3, D4, D5)

- [x] 3.1 In `materializeCampaignMissionEncounter.ts`: delete `selectPlayerUnitRef`, `DEFAULT_PLAYER_UNIT_REF`/`DEFAULT_OPPONENT_UNIT_REF` fallback usage, and `CANONICAL_UNIT_REFS`; extend `assertLaunchRoster` to reject selected units lacking `unitRef` with per-unit reasons.
- [x] 3.2 Generalize force creation: `createAssignedForce` → multi-unit form that creates one assignment per selected roster unit with `{ unitRef, pilotRef }`, using the API semantics verified in 1.1.
- [x] 3.3 Surface launch blockers: Mission Launch readiness card shows the per-unit block reason from 3.1 in the existing eligibility badge slot (`missionLaunchPage.surfaces.tsx`); launch button disabled while blocked.
- [x] 3.4 OpFor sizing: opponent force gets N canonical units (N = player deployment size), selected deterministically (seed = encounter id); use force-generator BV-window selection if the service exposes one, else a curated rotation. Comment documents the seed contract.
- [x] 3.5 Pilot resolution into session: encounter launch snapshot resolves each assignment's `pilotRef` to vault pilot stats at session creation; in-battle status panel shows the pilot's name for assigned crews.
- [x] 3.6 Tests: materializer unit tests (4-unit selection → 4 player assignments with pilotRefs; unresolvable unit → block, zero API writes; OpFor count parity + determinism across repeat materialization); integration test launching a 4-unit mission into a session containing 4 player units with resolved pilots.

## 4. Verification

- [x] 4.1 `npm run typecheck && npm run lint` clean; touched-file suites pass; full `npm run test:stable` once at the end.
- [x] 4.2 Live smoke on `npm run dev`: create a fresh campaign via the wizard (4 units, 4 pilots, assignments), accept a contract, launch the mission — pre-battle shows 4 named player units with non-zero BV and an N-matched OpFor; Mech Bay shows real weights/BV; Personnel detail resolves pilots. Screenshot to `.sisyphus/evidence/playtest/` next to the 2026-07-07 baseline. (May be skipped by the implementing worker; the orchestrator runs it.)
- [x] 4.3 Regression: quick-game and encounter-create flows unaffected (their force paths don't route through the materializer); existing playtest campaign `campaign-1783459565382-uzpocfi` loads with the backfill helper applied and its mission launch unblocks.
