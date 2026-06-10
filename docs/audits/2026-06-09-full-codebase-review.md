# Full Codebase Review — 2026-06-09 (baseline `442f90855`)

Multi-agent adversarially-verified review of the merged tactical-map (PR #682) + combat-validation (PR #683 stack) baseline.

## Method

- **2 workflow waves, 20 reviewer dimensions, 228 subagents, ~21M tokens.** Wave 1: 13 scoped reviewers (tactical projection, movement rules, combat rules, simulation suite, isometric UI, react state, type safety, test quality, OpenSpec hygiene, architecture, dead/legacy, API/data, broad sweep) + dedup + completeness critic. Wave 2 (critic-driven): 3-shard silent-revert sweep of reconciliation merge `7f22e4f22` (`git diff 382cc0db5..442f90855`) + first audits of campaign engine, multiplayer API, services layer, BV/ETL.
- **Every medium+ finding adversarially verified** by 1–3 independent refuter agents (default stance: refuted). Game-rule claims cross-checked against MegaMek/MekHQ Java source at `E:/Projects/megamek` / `E:/Projects/mekhq` on both sides.
- **Tally:** 137 raw findings → 88 confirmed (58 wave 1 + 30 wave 2), 29 low-severity passthrough, 12 refuted.
- **Toolchain executed locally on `442f90855`** (not taken on faith from CI):

| Gate                                               | Result                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                     | PASS                                                                                                              |
| `oxlint`                                           | PASS (0 errors, 59 pre-existing max-lines warnings)                                                               |
| `oxfmt --check`                                    | PASS on repo content (9 local CRLF-churned working-tree files only; `.gitattributes` is `eol=lf`, index is clean) |
| Unit suite (CI-shard shape)                        | PASS — 1223/1223 suites, 27,482 tests, 4 skipped, 198 s                                                           |
| Perf-smoke lane (CI env shape)                     | PASS — 4 suites, 53 tests, 1 skipped, 202 s                                                                       |
| `tactical-map-visual-smoke.spec.ts` (live browser) | 58/60 PASS; 2 stale assertions (see E-1)                                                                          |
| GitHub branch protection                           | **UNVERIFIED** — `gh` credentials rejected (401)                                                                  |

---

## Headline: the reconciliation merge silently reverted shipped work

Merge `7f22e4f22` (combat-validation stack `382cc0db5` × tactical-map baseline `afc46bc0f`) resolved many conflicts by **wholesale side-checkout instead of 3-way merge**, in both directions. It also deleted ~150 map-era tests (`reachable.test.ts` 79→9 `it()` blocks; also terrainCover, weaponAttackBuilder, vehicleHitLocation, vehicleFiringArc, indirectFire test shrinkage) — which is exactly why CI stayed green through the damage. OpenSpec ledgers/tasks/specs still claim both sides' work shipped, so main now contradicts its own source of truth in multiple places.

### A. Confirmed silent reverts / merge-authored hacks (restore from `afc46bc0f` or stack side)

| #    | Sev               | What was lost                                                                                                                                                                      | Where                                                                                                                                  |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A-1  | **critical**      | ~1,400–2,165 lines of CompendiumAdapter motive/MP/water-capability work — consumers remain, compendium-adapted vehicles get **0 MP**; tests reverted alongside so CI stayed green  | `src/engine/adapters/CompendiumAdapter.ts:235`                                                                                         |
| A-2  | **critical**      | Fuel-tank vehicle critical reverted from MegaMek-correct destruction to "+1 engine hit"; OpenSpec change still checked off                                                         | `src/utils/gameplay/vehicleCriticalHitResolution.ts:211`                                                                               |
| A-3  | **critical→high** | Sprint/Evade/MASC/Supercharger tactical-dock commands dropped; tasks 4.3.164/4.3.165/3.2.11 still checked; MASC has no UI path at all                                              | `src/utils/gameplay/movementCommands.ts:50` + `CombatActionSupport.ts:1124` (catalog flipped to "unsupported" to match regressed code) |
| A-4  | high              | **Hardcoded boxcars (12) dice roll** in production stand-up PSR path — stand-up can never fail in non-interactive sessions                                                         | `src/stores/useGameplayStore.helpers.ts:150`                                                                                           |
| A-5  | high              | VTOL `rotor_damage` critical now a complete no-op (MP penalty + immobilization threshold lost)                                                                                     | `vehicleCriticalHitResolution.ts:256`                                                                                                  |
| A-6  | high              | `actuatorsByLocation` writer severed — hull-down exit surcharges, conversion gates, AirMek-landing gates read data nothing produces                                                | `src/utils/gameplay/criticalHitResolution/actuatorEffects.ts:34`                                                                       |
| A-7  | high              | Map-era test suites mass-deleted while their production code kept (reachable.test.ts 79→9 etc.)                                                                                    | `src/utils/gameplay/movement/__tests__/`                                                                                               |
| A-8  | high              | Generic +1 ECM to-hit helper **resurrected** after the stack deliberately deleted it as not source-backed; spec SHALL NOT + checked task contradict live code                      | `src/utils/gameplay/toHit/ecmModifier.ts:73` wired in `toHit/calculate.ts:83-88`                                                       |
| A-9  | high→med          | `toAIUnitState` lost `prone`/`unitType`/`abilities` — BotPlayer consumes fields the producer no longer populates                                                                   | `src/engine/GameEngine.helpers.ts:204`                                                                                                 |
| A-10 | high→med          | vehicleFiringArc chassis spans flipped vs MegaMek (Front/Rear should be 120°, sides 60°) + BODY→Front mapping dropped; rules-source ledger row 113 still claims correction shipped | `src/utils/gameplay/vehicleFiringArc.ts:35`                                                                                            |
| A-11 | high              | Physical-attack `REASON_COPY` shrank ~85→24 codes (+ lost exhaustiveness check) — ~60 validator reasons render blank in UI                                                         | `PhysicalAttackPanel.helpers.ts:22`                                                                                                    |
| A-12 | high→med          | Request-spot eligibility guard chain dropped — ineligible requests now throw uncaught instead of no-opping                                                                         | `useGameplayStore.helpers.ts:242`                                                                                                      |
| A-13 | med               | Public `hexAngle` reverted to "Simplified" non-hex geometry; correct MegaMek version privately duplicated in `firingArcs.ts:33-48`                                                 | `src/utils/gameplay/hexMath.ts:296`                                                                                                    |
| A-14 | med               | Orphaned `vehicleCriticalReplay.ts` — zero importers, already-diverged duplicate of live reducer                                                                                   | `src/utils/gameplay/gameState/vehicleCriticalReplay.ts`                                                                                |
| A-15 | low               | Heat-phase "continue" lost non-interactive advancePhase fallback — dock `heat.continue` no-ops in local sessions                                                                   | `useGameplayStore.helpers.ts`                                                                                                          |

**Recommended recovery:** treat `afc46bc0f` (map side) and `382cc0db5` (stack side) as recovery sources; restore per-file rather than re-merging. The revert-sweep agents flagged the detection signature (stack-untouched file + main==merge-base) — a full `afc46bc0f`-vs-main sweep with that signature is cheap insurance against stragglers beyond these 15.

### B. Projection vs engine drift (the project's #1 stated invariant, violated)

| #   | Sev          | Finding                                                                                                                                                                                                                                                                   | Where                                                                 |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| B-1 | **critical** | Projection to-hit state omits attacker damage (sensor hits, pilot wounds, actuator damage), SPAs, quirks, and target evasion — **and the commit path overwrites the engine's fully-hydrated to-hit with the projection's poorer number**, so resolution uses the wrong TN | `combatProjection.toHit.ts:150` (vs `stateHydration.ts:38-73`)        |
| B-2 | high         | Projection never rejects evading/sprinting attackers; engine commit rejects with AttackInvalid — preview/commit disagree                                                                                                                                                  | `combatProjection.targeting.ts:226` (vs `gameSessionCore.ts:510-524`) |
| B-3 | high         | `calculateMovementHeat`'s union 3rd param split call sites: projection drops Partial-Wing jump-heat bonus; validateMovement/MoveAI drop motive-mode gate (Mek heat charged to non-Meks)                                                                                   | `movement/modifiers.ts:60`                                            |
| B-4 | high→med     | `validateMovement` vs reachability projection disagree (turning MP, movementMode); `validateCommittedMovement` silently resolves to whichever is **more permissive**                                                                                                      | `movement/commitValidation.ts:221`                                    |
| B-5 | high→med     | `targetPartialCover` passed positionally into `applyLocalCalledShotAbilityReduction` slot in declareAttack                                                                                                                                                                | `gameSessionCore.ts:577`                                              |
| B-6 | high         | Min-range modifier: projection/commit drift + off-by-one at exactly minimum range (MegaMek: `distance <= minRange`)                                                                                                                                                       | `combatProjection.targeting.ts:137`                                   |

Fix pattern for all of B: hydrate projection through the engine's shared `buildWeaponAttack*ToHitState` helpers (the movement channel already does this correctly via `deriveMovementRangeHexForDestination` — copy that architecture).

### C. MegaMek rules divergences (both sides read this session; none in gap ledgers)

| #    | Sev               | Finding                                                                                                                                                                | Where                                    |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| C-1  | **critical→high** | Run/Sprint MP under heat subtracts penalty from pre-derived run MP; MegaMek: `run = ceil((walk − floor(heat/5)) × 1.5)` — hot units get wrong run envelopes everywhere | `movement/calculations.ts:222`           |
| C-2  | high              | Jump MP reduced by heat penalty; MegaMek never applies heat to jump MP                                                                                                 | `movement/calculations.ts:687`           |
| C-3  | high              | Static terrain entry-cost table wrong for sand/mud/swamp/snow/ice/high-level rough+rubble per motive type (vs `Terrain.movementCost`)                                  | `types/gameplay/TerrainTypes.ts:321-401` |
| C-4  | med               | Multi-feature hexes charge only primary terrain feature; MegaMek sums all (`Hex.movementCost`)                                                                         | `movement/calculations.ts:387`           |
| C-5  | high              | Artillery-only spotter-gunnery modifier `(gunnery−4)/2` applied to every LRM indirect-fire shot; missing +1 spotter-attacked modifier                                  | `indirectFire.ts:484`                    |
| C-6  | high→med          | Semi-guided TAG keeps spotter movement/gunnery modifiers MegaMek skips (net indirect penalty should be 0)                                                              | `indirectFire.ts:667`                    |
| C-7  | high              | Swamp grants target-hex partial cover (+1 and leg-hit conversion) — not a TW/MegaMek rule; contradicts own spec                                                        | `terrainCover.ts:55`                     |
| C-8  | high→low          | Arm-mounted weapons hydrate Front-only; MegaMek arms get 180° front+side arcs                                                                                          | `simulation/runner/UnitHydration.ts:559` |
| C-9  | high→med          | BA trooper hit selection d6-modulo biases damage 2× onto specific troopers in 4/5-trooper squads (MegaMek re-rolls)                                                    | `battlearmor/damage.ts:63`               |
| C-10 | med               | BA crit-slot mechanic uses index-match instead of second confirmation d6 (TO:AR p.108)                                                                                 | `lib/combat/baCombat.ts:163`             |
| C-11 | med               | `BATrooperKilled.squadId` populated with HOST mech id or empty string                                                                                                  | `lib/combat/baCombat.ts:177`             |
| C-12 | med               | Wreck-LOS engine path + old-behavior tests remain after `align-wreck-los-with-megamek` checked off (call-site-only fix)                                                | `lineOfSight.ts:253`                     |
| C-13 | high→med          | Simulation-runner movement validation has no jump elevation/clearance gate (projection has it; catalog says "integrated")                                              | `movement/validation.ts:107`             |
| C-14 | med               | Vehicle flank MP rounds down; MegaMek + own Python converter round up                                                                                                  | `services/.../VehicleUnitHandler.ts:108` |
| C-15 | med               | Isometric rotation composes rotate-after-shear; depth/occlusion model assumes rotate-before-shear (distortion at steps 2–4)                                            | `HexMapDisplay/projection.ts:22`         |

Borderline (refuted on a technicality, worth a look): indirect-fire spotter eligibility rejects running/jumping spotters — refuter confirmed the MegaMek divergence is real (`canSpot()` bars only off-board/sprint/evade; run +2/jump +3 modifiers) but judged context differently. Re-adjudicate when touching `indirectFire.ts`.

### D. Campaign engine: shipped but unwired (Waves 1–5 verified by unit tests, not end-to-end flows)

| #    | Sev          | Finding                                                                                                  | Where                                 |
| ---- | ------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| D-1  | **critical** | Store persistence **wipes unit battle damage and the loan ledger on every reload** (keeps borrowed cash) | `useCampaignStore.persistence.ts:160` |
| D-2  | high         | financial / turnover / factionStanding / vocationalTraining processors never registered in production    | `processorRegistration.ts:49`         |
| D-3  | high         | Campaign preset selection is cosmetic — `applyPreset` has no production caller                           | `CreateCampaignPage.tsx:118`          |
| D-4  | high→low     | `reconcileCoopBattle` (co-op post-battle reconciliation) is dead code — zero callers                     | `reconcileCoopBattle.ts:113`          |
| D-5  | high→med     | postBattleProcessor retry double-applies pilot XP/wounds after partial failure                           | `postBattleProcessor.ts:109`          |
| D-6  | med          | Review-page Apply never updates `processedBattleIds` — next advanceDay erases dedup ledger               | `useCampaignStore.outcomes.ts:86`     |
| D-7  | med          | Market processors generate offers and discard them; day report claims refresh happened                   | `marketProcessors.ts:52`              |
| D-8  | med          | `campaignKills`/`campaignMissions` never increment — kill/mission auto-awards permanently zero           | `postBattleProcessor.helpers.ts:129`  |
| D-9  | med          | AtB scenario generation unreachable: `campaign.combatTeams` never populated                              | `scenarioGenerationProcessor.ts:90`   |
| D-10 | med→low      | All daily outcome rolls use raw unseeded RNG — campaign days unreplayable                                | `healingProcessor.ts:109`             |

### E. Test/CI enforcement holes (why the reverts went unseen)

| #    | Sev      | Finding                                                                                                                                                                                                                                                                                                                                               | Where                                       |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| E-1  | high     | **Entire Playwright suite runs in no CI workflow** while new specs claim CI enforcement. Live-run proof: 58/60 pass; 2 assertions already stale from drift (`touch-rotate` camera-controls list at spec line 1178; dead `combat:mekstation:…water attack helper` provenance label at line 3323) — production code + unit tests updated, e2e never was | `e2e/*`, `.github/workflows/pr-checks.yml`  |
| E-2  | high→med | Perf assertions in `simulation.test.ts` excluded from shards and absent from perf-smoke lane — never executed in CI                                                                                                                                                                                                                                   | `simulation.test.ts:15`                     |
| E-3  | high→med | Stale `it.skip` on same-seed determinism test whose blocking follow-up completed; skip untracked                                                                                                                                                                                                                                                      | `integration.test.ts:301`                   |
| E-4  | high→med | Statistical existence tests assert nothing if the event never occurs (UnitFell, pilot death, win-rate, misses) — and CI runs them at N=3–5                                                                                                                                                                                                            | `simulation-combat-integration.test.ts:307` |
| E-5  | med      | CI shrinks pilot-skill SHALL proof to N=5 (near-vacuous); no scheduled full-size lane exists anywhere                                                                                                                                                                                                                                                 | `pr-checks.yml:175`                         |
| E-6  | med      | Perf guard neutered: swarm-throughput 25 seeds @600ms/run vs spec'd 1000 @60ms/run                                                                                                                                                                                                                                                                    | `pr-checks.yml:180`                         |
| E-7  | high→med | Swarm/preset CLI runs **zero registered invariants** — `createInvariantRunner` dead, violation exit-gate hollow                                                                                                                                                                                                                                       | `scripts/run-simulation.ts:153`             |
| E-8  | high     | Swarm runner records phantom participants + inflated bvTotal on force-generator count+1 retry                                                                                                                                                                                                                                                         | `scripts/run-simulation.ts:687`             |
| E-9  | med      | Coverage thresholds in jest.config.js never enforced (no CI coverage run)                                                                                                                                                                                                                                                                             | `jest.config.js:128`                        |
| E-10 | med      | `known-limitations.md`/`knownLimitations.ts` claim implemented features are unimplemented (stale legacy ledger; the new CombatValidationGapInventory is honest)                                                                                                                                                                                       | `src/simulation/known-limitations.md`       |

Positive: the 4-file perf-sensitive exclusion maps 1:1 onto the perf-smoke lane (verified by hand + agent) — no suite is silently dropped by that mechanism.

### F. OpenSpec pipeline (implementation honesty good; merge pipeline broken)

- **202 of 203 unarchived changes are complete** (sampling of 20+ found zero fabricated checkboxes) but deltas were never merged → `openspec/specs/` **actively contradicts shipped behavior** (PSR/gyro, movement) and can't serve as a behavior reference.
- **79 MODIFIED deltas across 70 changes target phantom requirements** that exist nowhere (35 rewrite nonexistent "Movement Projection Detail Surface") — a naive bulk archive would corrupt the SoT.
- Two changes carry mutually conflicting full-replacement deltas of the heavy-duty-gyro stand-up requirement; 6 deltas have heading punctuation drift; 2 target nonexistent capability `game-state`; ~37 archive-order dependencies.
- Recent commits hand-edited SoT specs directly (9a54d62ca, 479c5cbf3, e82725666) bypassing the delta workflow.
- **Archive remediation must be a deliberate project**: fix phantom/conflicting deltas first, then archive in dependency order.

### G. UI / state correctness (confirmed)

- Fog "last known" ghost tokens track the enemy's **live** position every render (fog leak) — `GameplayLayout.viewModel.ts:97` (high)
- `centerOn`/double-click/minimap centering ignore the isometric transform — `useMapInteraction.ts:337` (high)
- Lens effect re-runs every render and reverts manual overlay toggles (A/L hotkeys dead) — `GameplayLayout.tsx:253` (high)
- Replay tokens never go prone for posture-as-movement events — `useHexMapStateFromEvents.ts:204` (high→med)
- `rear-arc-hit` key moment can never fire (`attackerFacing` vs `attackerArc`) — `tier2Moments.ts:120`; root enabler is unconstrained `getPayload<T>` cast — `getPayload.ts:29` (med)
- Inline arrow props defeat HexCell memo; pan/zoom re-renders GameplayLayout per event — `HexMapDisplay.state.tsx:341` (med); duplicate occlusion sweep runs twice (low)
- `preventDefault` no-op in passive React wheel/touch handlers — `useMapInteraction.ts:479` (med)
- Game-page dispatcher drops `TacticalActionPayload` for non-special-cased commands — `pages/gameplay/games/[id].tsx:219` (med→low)

### H. Multiplayer + persistence

- **Intent/lobby authorization trusts self-asserted `envelope.playerId`** — never bound to authenticated socket identity (impersonation/host-takeover hole in the design) — `ServerMatchHostLobbyIntents.ts:70` (high→med; mitigated only by H-2)
- Authoritative WS transport is a permanent stub (`server.js:277`) — fog redaction, rate limiting, replay protection, crypto dice are **dead code at runtime**; TRANSPORT.md security claims don't match reality (high)
- Spectator registration lost-update race on match meta blob — `spectate.ts:154` (med)
- Replay persist POSTs have no body-size override; real event logs already brush Next's 1MB default → long games silently fail to persist — `api/replay-library/encounter.ts:232` (high)
- `campaigns.current_date` column shadowed by SQLite builtin `CURRENT_DATE` — queries return today, not stored value — `SQLiteService.ts:309` (med)
- Migration runner: non-idempotent v4 ALTERs + swallowed record failures can brick startup — `SQLiteService.ts:486` + `:254` (med)
- Vault `SyncEngine` conflict resolution marks resolved before lookup → accept-remote never applies; mocked tests hide it — `SyncEngine.conflictResolution.ts:80` (high→med)
- Campaign JSON.parse without try/catch; one corrupt row 500s list endpoint — `CampaignPersistenceService.ts:62` (med→low)

### I. BV / ETL (good news)

BV 2.0 core untouched since 2026-05-15 and verified intact (MGA additive bonus, torso-cockpit CT doubling, speed-factor 2dp). Schema bridge is a real CI corpus gate, but its write-time choke points are dead code (`blk_common.py:385`) and `index.json` (incl. a `bv` field) is exempt on both sides.

### Architecture notes

- Movement channel is the model: preview/commit share one core by construction. Combat to-hit channel must copy it (see B).
- Only **one** module cycle across 885 files (brushOffEligibility ↔ damage.ts) — excellent for a +195K-line merge.
- Boundary regressions: `types/` imports runtime from `utils/` again (`Protocol.ts:27`); `utils/gameplay` imports upward from engine/simulation (4 sites); `UnitHydration.ts` is a 1,991-line god-file.
- Engine commit path recomputes full-grid combat projection per declared attack — `InteractiveSession.actions.ts:840` (med perf).

### Refuted findings worth knowing about (verified-NOT-bugs)

Torso-twist mapping (matches documented convention), fog ghost staleness in viewModel path (by design at that layer), centerOn in top-down mode, day-pipeline failure swallowing (intentional + logged), brute-force/rate-limit gaps (refuted on local-first deployment reality), turn-limit `matchTerminalState` mismatch (cosmetic only). Full refutation reasoning in the workflow outputs.

### Unverified / needs credentials

- GitHub branch-protection required checks (gh 401 — run `gh auth login` and re-check `Lint and Test` + `Build Test /` matrix are still required).
- The bv-etl reviewer asserted the final reconciliation commits reached main without a PR-checks run before auto-tag v1.4.323; the refuter disputed it. Local toolchain on the current tree is fully green (table above), so current-tree health is not in question — but the release-gating question deserves a look once gh works.

---

## Recommended action order

1. **Restore the silent reverts (A)** — fastest large win; recovery sources exist (`afc46bc0f` / `382cc0db5`); restore tests first (A-7) so the rest is locked by red→green.
2. **Fix B-1** (projection overwrites engine to-hit) — single worst correctness defect in the combat loop; then B-2/B-5/B-6.
3. **Fix C-1/C-2** (heat→MP formulas) — affects every hot unit globally; mechanical, well-evidenced fixes.
4. **D-1** (campaign persistence wipe) — data loss on a core loop; then register D-2 processors.
5. **Wire the e2e suite into CI** (E-1) + fix the 2 stale assertions — prevents this whole class recurring.
6. **OpenSpec remediation project (F)** — phantom deltas → ordered archive; until then treat `openspec/specs/` as untrusted.
7. Remaining C/G/H items as PR-sized slices per the existing workflow.
