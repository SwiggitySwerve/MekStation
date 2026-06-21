# Full Codebase Critical Review — 2026-06-12 (baseline `669905353` = `origin/main`)

Fresh, multi-agent, adversarially-verified review judging the whole repository against **four lenses**: MegaMek/MekHQ rules parity, roadmap adherence, shippable product quality, and codebase health for velocity. This is **not** a delta against the 2026-06-09 review — it is an independent full sweep of current `main`. Where it touches the same surfaces, every claim was re-verified against current code.

## Method

- **144 agents, ~13.8M tokens, 2,833 tool calls** across 3 phases. Phase 1: 12 scoped reviewers (to-hit/projection, damage/crits, movement, tactical-map UI, engine/state, campaign, multiplayer/co-op, construction/BV/data, UX playability, test quality, architecture health, spec/roadmap integrity). Phase 2: adversarial verification — every medium+ finding refuted by 1–2 independent skeptics (default stance: refuted) with mandatory MegaMek/MekHQ Java cross-check for parity claims. Phase 3: completeness critic naming unowned subsystems and systemic themes.
- **Tally:** 109 unique findings → **80 confirmed** (9 critical, 28 high, 35 medium, 8 low), 6 refuted, 23 low-severity passthrough. 2 confirmed findings are "contested" (one verifier dissented) and are flagged inline.
- **Java sources of truth:** `E:/Projects/megamek`, `E:/Projects/mekhq`. Every parity finding cites the Java file it diverges from.
- **Local toolchain on `669905353`** (run, not taken on faith):

| Gate                          | Result                                                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit --skipLibCheck` | PASS                                                                                                                                                                        |
| `oxlint`                      | PASS — 0 errors, 62 pre-existing `max-lines` warnings                                                                                                                       |
| `oxfmt --check`               | PASS on repo content (one untracked `src/simulation/__snapshots__/test-failed/` artifact a sim test dumps to a dir `.gitignore` does not cover — removed; see M-CI cluster) |
| Unit suite (`jest`)           | PASS — exit 0                                                                                                                                                               |

CI being green is consistent with all of the above **and** with most of the findings below — that is itself one of the headline results.

---

## Headline: an excellent rules library wearing the costume of a finished game

The original mission — BV 2.0 calculation, hit-location/damage-transfer math, the PSR catalog, event-sourced replay, the equipment catalog + cross-language schema bridge — is **real, clean, and tested against MegaMek Java oracles**. The server-authoritative multiplayer _core_ and the campaign day-pipeline are well-engineered in isolation.

But nearly every feature added in the Wave 5+ expansion is **connected on paper and disconnected in practice**: the integration wire is a stub, the data is absent, the navigation entry is missing, or the persistence is dropped. A new player following the advertised path:

- **cannot finish a networked match** (the WebSocket handler closes every socket; no production server boots it at all),
- **cannot run a co-op campaign** (create never registers server-side, guest proposals hit a permanent `pending` stub, the launch button is hardcoded-disabled),
- **cannot repair a damaged mech** (repair tickets are created but never worked to completion; salvage and purchased parts never become assets),
- **previously lost an in-progress battle on refresh**; this is closed on the `persist-and-recover-interactive-battles` branch by loading real ids from the persisted match log,
- **cannot field 3 of 6 unit types** (no vehicle/aerospace/protomech data ships at all),
- **cannot learn the rules tactically** (Quick Game is auto-resolve only; there is no onboarding),
- and **commits attacks with a to-hit number that can disagree with what resolves** on specific paths.

Underneath, the **verification and metrics layer actively conceals this drift**: the "99.8% BV parity" headline no longer reproduces (reference caches deleted, harness exits green on zero coverage), statistical combat proofs are `it.skip`'d on PR CI, an invariant suppression net downgrades whole rule categories to non-failures, the desktop Jest suite never runs in CI, and 125 of 199 capability specs still carry `TBD — Update Purpose after archive`.

**The central risk is roadmap honesty, not any single bug.** The path forward is _integration and truth-in-reporting_ — wire the existing cores to live transports/persistence/data/navigation, move the real correctness teeth back into the blocking CI lane, and reconcile spec/metric claims with shipped reality — **before adding more feature breadth**.

### Per-dimension verdicts

| Dimension                | Verdict     |
| ------------------------ | ----------- |
| multiplayer / co-op      | **failing** |
| to-hit / projection      | concerning  |
| damage / crits           | concerning  |
| movement rules           | concerning  |
| engine / state           | concerning  |
| campaign engine          | concerning  |
| UX / playability         | concerning  |
| tactical-map UI          | adequate    |
| construction / BV / data | adequate    |
| test quality             | adequate    |
| architecture health      | adequate    |
| spec / roadmap integrity | adequate    |

### Severity counts by lens

| Lens      | Critical | High   | Medium | Low   | Total  |
| --------- | -------- | ------ | ------ | ----- | ------ |
| parity    | 1        | 8      | 6      | 4     | 19     |
| product   | 6        | 11     | 8      | 0     | 25     |
| health    | 1        | 6      | 17     | 3     | 27     |
| roadmap   | 1        | 3      | 4      | 1     | 9      |
| **Total** | **9**    | **28** | **35** | **8** | **80** |

---

## Critical findings (9)

Each line: severity/lens · finding · `file` · MegaMek/MekHQ ref where applicable.

| #   | Lens    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Location                                                                                                                                                                                                                            |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | parity  | **Head damage capped at 3 pts per hit** — overflow discarded at _four_ sites (`resolve.ts:205`, `weaponAttackHitResolution.ts:373`, `physicalAttackDamage.ts:26`, `gameSessionAttackResolution.ts:229`). A 15-pt Gauss to the head strips 3 armor and the head survives; cockpit kills are **impossible** in both combat paths. The "Total Warfare p.41" justification is fabricated — `3` is the head's IS value, not a damage cap.                                                                                 | `src/utils/gameplay/damage/resolve.ts:34` · `TWDamageManager.java` (isHeadHit → 1 crew wound only, full damage to armor/IS)                                                                                                         |
| C-2 | health  | **Physical-attack UI commit desyncs engine from store** — `commitPhysicalAttack` calls the _pure_ `declarePhysicalAttack` and `setSession(next)` updates only the store snapshot; the engine's `this.session` is never updated and `applyPhysicalAttack` is bypassed. On `advancePhase`, resolution runs against the engine session, which lacks the declaration — every kick/punch/charge/DFA **silently no-ops** while the panel shows a false "Declared" summary. The lone outlier among all interactive actions. | `src/stores/useGameplayStore.combatFlows.ts:561`                                                                                                                                                                                    |
| C-3 | product | **Interactive + spectator turn loops stall in PhysicalAttack** — `runOneFullTurn` advances Movement→WeaponAttack→(now PhysicalAttack) then only tests Heat/End, so no branch fires, the AI physical phase never runs, `isGameOver` stays false, and the timer-paced loop livelocks forever — Heat/End/victory never resolve. Both interactive drivers affected; headless `runToCompletion` is fine.                                                                                                                  | `src/components/gameplay/SpectatorView.tsx:65` + `src/stores/useGameplayStore.helpers.ts:362`                                                                                                                                       |
| C-4 | product | **Repair tickets are never worked to completion** — `repairQueueBuilderProcessor` only _appends_ tickets; no registered processor ever advances ticket status or restores armor/structure/`combatReady`. The parallel `useRepairStore.advanceRepairs` that _would_ work them has zero production callers. Damaged units stay damaged forever.                                                                                                                                                                        | `src/lib/campaign/processors/repairQueueBuilderProcessor.ts:209` · `mekhq Part.succeed/Campaign.fixPart`                                                                                                                            |
| C-5 | product | **WebSocket transport is a permanent stub** — the `connection` handler sends a `Close{INTERNAL_ERROR, "Wave 2 stub"}` then `ws.close(1011)` for _every_ socket; `loadRegistry()` returns null. The fully-built `ServerMatchHost`/`MatchHostRegistry` are never wired to a live socket. No networked match can run.                                                                                                                                                                                                   | `server.js:242` · multiplayer-server spec SHALLs                                                                                                                                                                                    |
| C-6 | product | **No WebSocket server in production** — only `npm run dev` boots the custom `server.js`; the packaged Docker/Electron builds run Next's `output:'standalone'` auto-generated server (`Dockerfile:85`, `main.window.ts:162`), which _shadows_ the repo-root server and has no upgrade handler. Multiplayer is dev-only by construction.                                                                                                                                                                               | `package.json:12` + `next.config.ts:89`                                                                                                                                                                                             |
| C-7 | product | **Co-op create never registers a match server-side** — `handleCreateCoopCampaign` mints a room code in the browser and only writes local state; nothing calls `POST /api/multiplayer/matches`, so the guest's `/invites/:roomCode` lookup always 404s. `coopHostRegistry.ts` confirms the live host transport "never landed".                                                                                                                                                                                        | `src/pages/gameplay/campaigns/index.tsx:150`                                                                                                                                                                                        |
| C-8 | product | **Co-op guest proposals never reach the host** — `CampaignCoopRouteSurface` mounts at all 6 sites with no transport props, so every action hits `defaultPendingTransport` returning `{status:'pending'}` forever. `CampaignGmArbiter`/`CampaignSyncSession` are instantiated only in tests. Co-op is non-functional end-to-end.                                                                                                                                                                                      | `src/components/campaign/coop/CampaignCoopRouteSurface.tsx:216`                                                                                                                                                                     |
| C-9 | product | **Closed: in-progress battle recovery on refresh/deep-link** — `loadSessionLogic` now keeps the demo/idempotent fast paths, then recovers real non-`demo` ids from the persisted IndexedDB match log into a live `InteractiveSession`. Launch now flushes a recoverable `GameCreated` log plus metadata before navigation, corrupt vs not-found logs surface distinct errors with no demo fallback, and active interactive sessions register a refresh-loss warning.                                                 | `src/stores/useGameplayStore.session.ts`; `src/engine/InteractiveSession.persistence.ts`; `src/components/gameplay/pages/preBattle/usePreBattleLaunch.ts`; `src/components/gameplay/pages/gameSession/GameSessionPage.lifecycle.ts` |

**Resolved 2026-06-21 (cluster S):** the renderer-reachable Electron IPC file vector is now sandboxed to app-managed data/backup roots, desktop and Next share an enforcing CSP/security-header policy, `will-navigate` blocks non-app origins, and `shell.openExternal` is limited to parsed `https:`/`mailto:` URLs. Desktop typecheck/Jest now feed the `Lint and Test` PR aggregator.

---

## High findings (28), grouped by cluster

### Cluster A — Combat damage & critical-hit parity (`parity`/`health`)

- **A-1 (high)** Critical-slot selection uses `(d6-1) % availableSlots.length` — slots at index 6+ in any 12-slot torso/arm are **mathematically unreachable**; MegaMek uses uniform `randomInt(numSlots)` with rejection. Ammo/heat-sinks placed last can never be critted. `criticalHitResolution/selection.ts:88` · `TWGameManager.java:21731`.
- **A-2 (high)** Standard CASE caps ammo-explosion transfer at 10 pts instead of venting all excess after IS is consumed — under-destroys healthy CASE'd side torsos. `ammoTracking/caseProtection.ts:45` · `TWDamageManager.java:1689`.
- **A-3 (high)** Vehicle **engine crit auto-destroys on 2nd hit**; MegaMek `Tank.engineHit()` only immobilizes (destruction is a gated optional fusion-explosion rule, never deterministic). `vehicleCriticalHitResolution.ts:319` · `Tank.java:2180`.
- **A-4 (high)** Resolver **ammo-explosion crit applies no damage** — `applyAmmoHit` marks the slot destroyed but emits no explosion/IS/CASE/pilot damage; `processTAC → resolveCriticalHits → applyAmmoHit` in the live `resolveAttack` path silently drops the explosion. `criticalHitResolution/equipmentEffects.ts:70` · `TWGameManager.applyCriticalHit:19059`.

### Cluster B — To-hit & movement projection agreement (`parity`)

- **B-1 (high) — resolved by `extend-projection-agreement-tohit`** Projection now threads **semi-guided TAG** context through combat projection and forecast modal to-hit calculations, including TAG designation, ECM nullification, and indirect-fire status, so moving TAG-spotted targets cancel TMM the same way the engine and runner do. `ToHitForecastModal` now sources attacker/target state from the shared engine hydration builders instead of hand-built lossy state, and the attack-side agreement suite includes an independent engine recomputation anchor plus semi-guided TAG / non-TAG / ECM variants. This is the to-hit axis companion to `fix-tactical-projection-agreement-gaps`, which handled the movement-side B-cluster work. `combatProjection.toHit.ts` · `CombatPlanningPanel.model.ts` · `forecast.ts` · `InteractiveSession.attackProjectionAgreement.scenario.test-helpers.ts`.
- **B-2 (high)** **Turning MP omitted from the reachability projection** (the human commit-authoritative path) while `validateMovement` (bot path) charges it — humans and bots diverge and both differ from MegaMek on bent paths; `commitValidation` swallows the split as advisory `validatorDisagreement`. `movement/reachable.ts:778` · `MoveStep.java`/`TurnStep.java:76`.
- **B-3 (high)** Human (`validateCommittedMovement`) and bot (`validateMovement`) movement legality + `mpUsed` **diverge** for the same move. `simulation/runner/phases/movement.ts:208`.
- **B-4 (high, dup of B-2 from the map lens)** Reachable-hex overlay can show a hex reachable / under-cost a move once facing changes are required. `movement/commitValidation.ts:204`. _Correctly scoped by the active `fix-tactical-projection-agreement-gaps` change._

### Cluster T — Tactical-map perf & legibility (`product`)

- **T-1 (high)** **Every hover rebuilds the entire per-hex projection map** — `tacticalMapProjectionLookup` depends on `hoveredHex`; `buildTacticalMapHexProjectionLookup` mints fresh per-hex objects (incl. freshly-allocated arrays) for ~1000 hexes, defeating `HexCell`'s `React.memo`, so the whole board re-renders on every mouse-move. Uncovered by any active change. `HexMapDisplay/HexMapDisplay.state.tsx:183`.
- **T-2 (high)** **`ElevationBadge` renders on every hex unconditionally** including elevation-0 (white "0" on every flat tile), no zoom gate, no toggle, center-top anchor overlapping unit tokens. _The active `add-topdown-tactical-legibility` proposal's "Why" is factually wrong at HEAD_ — the badge exists; the work is to gate/anchor it, not add it. `HexCell.labels.tsx:359`.
- **T-3 (high)** **`FiringArcOverlay` stamps a fill + shape + text badge ("FRONT"/"L ARC") on every in-arc hex** out to weapon max range — a wall of labels (a 120° arc at range 18-23 covers 340-550 hexes). No active change touches it. `overlays/FiringArcOverlay.tsx:276`.

### Cluster E — Interactive engine wiring & state integrity (`health`)

- **E-1 (high)** **Combat-outcome bus swallows listener exceptions** with an empty catch and no logger; `outcomePublished` flips true even when the campaign subscriber threw (e.g. localStorage quota), permanently dropping the staged outcome with no retry. `engine/combatOutcomeBus.ts:78`.
- **E-2 (high, roadmap)** Bundled multiplayer server is the Wave-2 stub closing every socket (see C-5/C-6). `server.js:267`.

### Cluster M-CAMP — Campaign economic loop (`product`/`parity`)

- **M-1 (high)** **Salvage never converts to assets** — `setSalvageItemStatus` only flips `awarded`/`declined`; no unit/part enters any inventory. No `partsInventory`/`warehouse` field exists on `ICampaign`. `campaignBayActions.ts:191` · `mekhq ResolveScenarioTracker`.
- **M-2 (high)** **Acquired parts "delivered" into a void** — `processDeliveries` flips status to `delivered` and emits an event; no inventory increment, no parts pool fed. Buying a part costs C-bills and yields nothing usable. `acquisitionProcessor.ts:139` · `mekhq Quartermaster.addPart`.
- **M-3 (high)** **Morale ratchets monotonically** — `recentlyAppliedOutcomes` accumulates for the whole campaign and is read each day as "recent", so morale score gains +N every day forever, pinning to Elite. MekHQ uses a one-month sliding window. `prestige/gatherMoraleSignals.ts:48` · `MHQMorale.java:422`.
- **M-4 (high)** **Battle-aftermath state not persisted** — `serializeCampaign` omits `repairQueue`, `salvageAllocations/Reports`, `pendingBattleOutcomes`, `processedBattleIds`; created tickets and bay decisions vanish on a server-fetch reload (a parallel localStorage path saves some, masking it). `persistence/serializeCampaign.ts:126`.
- **M-5 (high)** **Doctor Medicine skill hardcoded to 7** — green and elite doctors heal identically; `getShorthandedModifier` always returns 0. The "future change" never landed. `medical/standardMedical.ts:47` · `mekhq MedicalController.healPerson`.

### Cluster MP — Multiplayer/co-op truthfulness (`roadmap`/`product`)

- **MP-1 (high)** **Specs claim a working networked/co-op system the code cannot deliver** — `multiplayer-server/spec.md` mandates the full transport as a SHALL; `coop-campaign-sync` marks the route surface Priority High; `@spec` annotations point at archived changes as if satisfied. A contributor trusting the SoT would conclude multiplayer works. `openspec/specs/multiplayer-server/spec.md:7`.
- **MP-2 (high→med)** **Co-op mission launch button permanently disabled** — `otherChoice` is a hardcoded `undefined` never synced, so `canLaunch` is always false; the page shows "Waiting for the other player" forever and `handleLaunch` routes to the single-player encounter route anyway. `…/missions/[missionId]/launch.tsx:58`.

### Cluster U — Navigation & playability dead-ends (`product`)

- **U-1 (high)** **`/gameplay` is a 404** — no index page, no redirect; the mobile bottom-nav "Gameplay" tab and 17 breadcrumbs route there. `components/common/MobileBottomNav.tsx:38`.
- **U-2 (high)** **Multiplayer hub `/multiplayer` is orphaned** — no nav surface links to it; reachable only by typing the URL. `components/common/TopBar.tsx:70`.
- **U-3 (high)** **Games list is a hardcoded DEMO stub** — renders `DEMO_GAMES` (1 fake entry); a real backend reader (`MatchLogService.listMatchLogs`) exists, unused. A player's real games never appear. `src/pages/gameplay/games/index.tsx:34`.
- **U-4 (high)** **Quick Game is auto-resolve only** — the advertised "learn mechanics" path runs `runToCompletion` then shows a results table; the only interactive option is "Watch AI Battle" (spectator). A learner never touches the hex board. `components/quickgame/QuickGamePlay.tsx:100`.

### Cluster D — Construction / BV / data integrity (`health`/`roadmap`)

- **D-1 (high)** **BV parity claim not reproducible** — pre-remediation, `scripts/data-migration/` (both reference caches) was absent; `index.json` dropped its `bv` field; `validate-bv.ts` excluded every unit as "No reference BV available" and **exited green on hollow coverage** (a full run validated only 389 hardcoded overrides at 85.9%, printed FAIL, exited 0). Remediation evidence from `restore-bv-parity-reproducibility`: the committed MegaMek cache restores `Calculated: 4196`, `Within 1%: 4188 (99.8%)`, `Within 3%: 4196 (100.0%)`, and a `4196/4196` coverage floor; missing reference data, below-floor coverage, and accuracy-gate failure now exit non-zero. `scripts/validate-bv.ts` · `Mek.java calculateBattleValue`.
- **D-2 (high)** **Non-mech BV calculators shipped with no data and no validation** — full vehicle/aerospace/protomech/BA/infantry calculators + archived spec deltas exist, but `public/data/units/` has _no_ vehicle/aerospace/protomech dir; aerospace report is `deferred`, infantry fixtures are `computedBV:0`. Mech BV is 99.8%; everything else is ~0% parity-validated yet archived-complete. `validation-output/aerospace-bv-validation-report.json`.

### Cluster H-ARCH — Load-bearing duplication (`health`)

- **[resolved 2026-06-21] H-1 (high)** **Four divergent `normalizeEquipmentId` implementations** were routed through the catalog-backed normalizer by `consolidate-equipment-and-hex-duplication`. MTF import, unit-loader resolution, sim-runner catalog hydration, and BV catalog normalization now agree on the ambiguous corpus (`'Ultra AC/5'`, `'Clan ER PPC'`, `'LB 10-X AC'`, `'Rotary AC/5'`, Streak SRM ammo), with `equipmentNormalizationAgreement.test.ts` pinning the shared catalog keys.

---

## Medium findings (35) and low findings (8)

The full set is below, grouped by cluster (severity in brackets; `CONTESTED` = one verifier dissented). These remediate alongside their cluster's highs.

### Combat parity (cluster A)

- [med] Through-armor-critical (location roll of 2) not applied in the simulation runner — interactive engine and sim diverge on every roll-of-2. `weaponAttackHitResolution.ts:372`.
- [med] Motive-damage motion-type modeled as heavy→immobilize escalation, not MegaMek's flat 2d6 roll modifiers (Hover +3, Wheeled +2, WiGE +4…). `motiveDamage.ts:115`.
- [med] `explosions.ts` encodes non-CASE pilot damage = 1, contradicting the canonical 2-wound rule (dead field, wrong value any future consumer inherits). `ammoTracking/explosions.ts:25`.
- [low/CONTESTED] Vehicle driver/commander crits modeled as 2-hit kill counters — _the production table layer already escalates faithfully; the buggy branch is reachable only via the BA leg-attack helper._ `vehicleCriticalHitResolution.ts:288`.
- [low] Vehicle crew-stunned tracked in "phases" (+2) vs MegaMek's turns. · [low] (passthrough)

### Movement (cluster B)

- [med] Per-hex MP cost understates bent-path cost to the player (turning omitted from displayed `mpCost`). `movement/reachable.ts:784`.
- [med] Skid/sideslip resolution unimplemented (PSR queued, displacement never resolved). `movement/calculations.ts:349` · `TWGameManager.processSkid`.
- [low] Sprint lacks gyro/hip/MASC-conflict gates (mostly mischaracterized vs MegaMek — only hip-crit cap-to-run is a genuine niche gap). `movementCommands.ts:156`.
- [low] TacOps leaping unimplemented; downhill >2 levels always illegal. (passthrough)

### Engine / state (cluster E)

- [med] Match-log event persistence is fire-and-forget; a failed append silently desyncs the recoverable log (detected, never repaired). `InteractiveSession.ts:671`.
- [med] Inconsistent `GameStatus.Active` guards across action methods — `applyMovement/applyAttack/applyPhysicalAttack/declareWithdrawal/applyRuntimeMovementState` can mutate a Completed session. `InteractiveSession.ts:398`.
- [low] P2P roll-capture / `ReplayDiceRoller` determinism machinery built, tested, unused by any live mirror. (passthrough)
- [low] Construction-editor autosave timers capture a stale save closure. (passthrough)

### Campaign (cluster M-CAMP)

- [med] Salary calculation omits the rank pay multiplier (the largest MekHQ salary driver) and secondary-role base — under-bills senior personnel. `lib/finances/salaryService.ts:158` · `Person.java:4733`.
- [med] Kill XP ignores actual kill count — flat 1 kill assumed; a 5-kill ace and a 0-kill survivor get identical XP (one-token fix: `1`→`killCount`). `postBattleProcessor.helpers.ts:113`.
- [med] Activity-log per-day entry IDs collide — `campaignDay` is always 0, so each day's daily-cost entry overwrites the prior; the log only ever shows the latest day. `useCampaignStore.ts:303`.
- [med] Unit market exists but buy/sell is an unimplemented stub — `purchaseUnit` validates then returns `{success:true}`, debiting nothing and adding no unit. `lib/campaign/markets/unitMarket.ts:203` · `mekhq AbstractUnitMarket`.
- [low/CONTESTED] `processedBattleIds` dedup guard not persisted on the server path — _refuted on the dominant localStorage path which persists it; server-fetch-path only._ `postBattleProcessor.ts:47`.
- [low] Standard medical heal is binary all-or-nothing vs MekHQ daily heal-rate. · [low] Captured (POW) pilots collapse to MIA — no prisoner lifecycle. · [low] Daily maintenance is a flat per-unit constant, not tonnage/quality-based. (passthrough)

### Multiplayer / co-op (cluster MP)

- [med] Composed co-op encounter logic orphaned — launch routes to single-player encounter, never `launchCoopMission`. `…/launch.tsx:62`.
- [med] Match-store in-memory in dev with no per-host cap / rate limit / TTL — unbounded match creation; `POST /auth/token` runs PBKDF2-100k with no throttle (KDF-cost DoS vector). `api/multiplayer/matches/index.ts:248`.
- [med] API-boundary validation is hand-rolled `typeof` checks — **zero** Zod usage across the 72 `src/pages/api` route files (one `safeParse` total, inside a hand-rolled guard). `api/multiplayer/matches/index.ts:84`.
- [med] Lobby reconnect loop hammers the stub WS server (30s-throttled) with no terminal "multiplayer unavailable" state surfaced. `multiplayer/lobby/[roomCode].tsx:11`.

### UX / playability (cluster U)

- [med] Campaign store holds only ONE campaign — the list can never show >1 and "New Campaign" swaps the active one (a backend multi-campaign layer exists, unused by the list UI). `stores/campaign/useCampaignStore.ts:95`.
- [med] Campaign dashboard reads stores via `getState()` at render time — non-reactive; the list page already fixed this exact bug. `…/dashboard/CampaignDashboardPage.tsx:54`.
- [med] Multiplayer entry blocked behind an unexplained "Vault password" with no setup path / guest option from that page. `multiplayer/index.tsx:216`.
- [med] Two parallel multiplayer stacks (P2P `/gameplay/lobby` vs server `/multiplayer/lobby`) with different auth models, neither differentiated nor cross-linked. `gameplay/games/index.tsx:122`.
- [med] No in-app onboarding/tutorial/first-run guidance; core jargon (BV, gunnery/piloting, heat, PSR) has no inline glossary. `src/pages/index.tsx:23`.
- [low] Home dashboard cards omit the entire gameplay/campaign/multiplayer surface. (passthrough)

### Construction / BV / data (cluster D)

- [med] `techBaseValidation.ts` (309 lines) is dead code — referenced nowhere in app code, and it contains the inverted IS-on-Clan parity bug a future wire-up would import. `utils/construction/techBaseValidation.ts:84`.
- [low] Tech-mixing rule allows IS components on Clan units without mixed tech — inverted vs `TechConstants.isLegal` (latent; only in the dead module). `…/techBaseValidation.ts:99`.
- [low] `validateConstruction` consumed only by the refit pipeline, not the main build/customizer flow; vehicle validation omits weight reconciliation + superheavy tiers. (passthrough)

### Architecture health (cluster H-ARCH)

- [resolved 2026-06-21] Dead cube-rounding picker `_pixelToHex`/`_roundHex` removed; the live `pixelToHex` now uses cube rounding and is pinned by `hexMap.test.ts`.
- [resolved 2026-06-21] Runtime cross-layer violation removed from `types/equipment/weapons`; runtime weapon utilities are imported from `@/utils/equipment/weapons/utilities` directly.
- [resolved 2026-06-21] `useForceStore` vs `useForcesStore` ownership collision documented: deployment/force-builder state belongs to `useForceStore`, campaign roster state belongs to the campaign `useForcesStore`. Broader store-count reduction remains out of scope for this consolidation.
- [resolved 2026-06-21] Three `hexToPixel` + three `hexDistance` copies consolidated into shared layout and axial-distance homes, with source-stable shims delegating to the canonical functions. [low] Accumulating backward-compat re-export shims. [low] Runtime circular dep `brushOffEligibility <-> damage` (textbook-safe function cycle). [low] `GameplayLayout` 1068-line orchestrator, 45 hook calls. (passthrough)

### Test / CI integrity (cluster CI)

- [med] Statistical combat proofs `it.skip`'d on PR CI (`SIMULATION_COUNT=5` < `STATISTICAL_PROOF_GAME_MIN=100`) — real teeth run only in the non-gating nightly. A PR merges green without exercising combat statistics. `.github/workflows/pr-checks.yml:174`.
- [med] Networked-multiplayer player journey has zero e2e coverage (3 empty `test.skip` bodies). `e2e/p2p-sync.spec.ts:264`.
- [med] Conditional `test.skip`-on-missing-data without seeding makes core navigation e2e vacuously pass in clean CI. `e2e/replay-player.spec.ts:137`.
- [med] `mc-medium-laser-hit-rate` tests raw `roll2d6`, not the to-hit pipeline — coverage decoy. `simulation/__tests__/mc-medium-laser-hit-rate.test.ts:51`.
- [med] Win-rate dominance ceiling widened 0.95→0.99; the real ≥10pp delta proof is the nightly-gated `it.skip`. `swarm-pilot-skills-batch.test.ts:328`.
- [med] Perf wall-clock budgets run in NO PR lane (`perfIt` skipped on shards, absent from perf-smoke). `simulation/__tests__/simulation.test.ts:31`.
- [low] Tautological self-confirming assertion in `e2e/game.spec.ts:72` (lone outlier; siblings assert correctly).
- [low] Coverage thresholds never gated on PRs (nightly-only, below baseline). · [low] `balance.test.ts` seeding is **resolved** — the MEMORY "deferred" note is stale. (passthrough)

### Spec / SoT integrity (cluster SoT)

- [resolved 2026-06-21] **125 of 199 capabilities (63%) carried `TBD - Update Purpose after archive`**, including combat-resolution, movement-system, campaign-system, replay-library, and multiplayer-server. The 125 canonical Purpose sections now have concrete capability-purpose text and `npm run spec:purpose:validate:strict` fails new placeholders.
- [resolved 2026-06-21] ACAR victory-probability spec scenario contradicted code + its own test (spec said >0.7 for 2:1 BV; code/test produce exactly 2/3). `combat-resolution` now names the linear `playerBV / (playerBV + opponentBV)` model and the ACAR test pins 8000 vs 4000 to `8000 / 12000`.
- [resolved 2026-06-21] Two capabilities (`critical-hit-resolution` + `critical-hit-system`) owned the same code home and disagreed (7 vs 8 actuator types). `critical-hit-resolution` is now canonical, the actuator count is 8, and `critical-hit-system` is an explicit pointer/compatibility summary.
- [med] Shipped isometric-rotation engine has zero requirements in its owning `camera-controls` capability (tracked by the active extrusion change). `openspec/specs/camera-controls/spec.md:6`.
- [resolved 2026-06-21] Three overlapping validation capabilities with a stale "master" spec (2025-11-28): `unit-validation-framework` is now the authoritative runtime-validation owner, while `validation-rules-master` and `validation-patterns` explicitly point to it for the shared code-home claim. [low] Referenced 2026-06-12 roadmap audit misfiled under `openspec/council-decisions/` not `docs/audits/`. [low] Campaign dashboard spec enumerates 11 sub-routes; 13 are reachable. (passthrough)

---

## Completeness critic — unowned subsystems (Gaps)

The 12 reviewers covered web/game-logic thoroughly but left whole **platform surfaces** uninspected. These are net-new and were spot-checked in code by the critic:

1. **Closed 2026-06-21: Electron desktop shell IPC and navigation hardening.** `read-file`/`write-file` now resolve through `desktop/electron/pathSandbox.ts`, `restore-backup` is confined to backup roots, `next.config.ts` emits the shared CSP/security headers from `desktop/electron/securityPolicy.ts`, and `main.window.ts` pins the same policy while blocking non-app navigation and unsafe external URL schemes.
2. **Closed 2026-06-21: desktop is in the verification gate.** `.github/workflows/pr-checks.yml` now runs `Desktop Type Check` and `Desktop Tests`, and the existing `Lint and Test` required check depends on both lanes.
3. **Non-mech unit data is entirely absent** — no `vehicles/`, `aerospace/`, or `protomechs/` dir under `public/data/units/`. Three full unit-type verticals are scaffolding with no payload (converters, calculators, validators, specs all exist).
4. **Partially closed 2026-06-21: HTTP API boundary hardening started on the abuse surface.** `src/lib/api/` now provides shared Zod parsing, process-local rate limiting, and security headers; `/api/multiplayer/auth/token`, `/api/vault/identity/unlock`, and `/api/multiplayer/matches` use it with malformed-body and over-limit tests. Deferred follow-ups: roll Zod/security headers through the remaining API routes and replace the process-local limiter with a shared-store limiter for multi-instance deployment.
5. **Headline metrics no longer reproduce** — the BV cache deletion + green-on-zero harness (D-1) is a measurement-integrity problem; the silent-degrade-to-empty pattern recurs in aerospace/infantry reports.
6. **A third combat engine.** The ~44.5k-LOC `simulation/` runner is a parallel combat implementation alongside the interactive + headless engines — combat rules now live in _three_ places. The `knownLimitations.ts` suppression net filters violations by broad regex (`/punch|kick|charge|push/i` also matches "discharge"; `/los/i` matches "loss") and only the invariant named exactly `battlemech-combat-validation` bypasses it — newly-added detectors whose message contains common combat words are silently swallowed.

### Systemic themes

1. **Subsystem-ownership gaps, not lens gaps, are the blind spot** — the most severe new finding (desktop arbitrary file I/O) lives precisely in the boundary excluded from typecheck and untested in CI.
2. **Scaffolding-without-payload is the defining product pattern** — well-engineered core + missing single integration wire, repeated across multiplayer, campaign economy, navigation, and non-mech construction.
3. **Green is systematically hollow** — the most load-bearing correctness signals (statistical proofs, invariant runner, MP e2e, desktop tests, BV harness) have all migrated _out of_ the blocking path.
4. **Self-reported metrics have rotted** — 99.8% BV no longer reproduces; specs/`@spec` annotations describe systems the code can't run; 63% of capabilities carry placeholder Purposes.
5. **Load-bearing duplication now spans entire engines** — 4× `normalizeEquipmentId` / 3× `hexToPixel` is the small end; three parallel combat implementations is the large end, and the mechanical cause of most parity findings.

---

## Prioritized remediation plan

Thirteen OpenSpec changes authored under `openspec/changes/` (this PR) cover all 9 criticals + every high + their clustered mediums. Three **active** changes (`fix-tactical-projection-agreement-gaps`, `add-topdown-tactical-legibility`, `add-isometric-elevation-extrusion`) already exist; this plan extends/re-baselines them rather than duplicating.

### Wave 0 — Truth-in-reporting first (do before any feature work)

The metrics that would tell you whether later waves regressed are themselves broken. Fix them first.

| Change                              | Covers                                                                                                            | Why first                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `restore-bv-parity-reproducibility` | D-1, BV harness green-on-zero                                                                                     | The 99.8% gate must fail loudly before any BV-adjacent change ships.                   |
| `restore-ci-correctness-teeth`      | CI cluster (statistical proofs, knownLimitations net, desktop tests, perf budgets, coverage gates)                | Move the real teeth back into the blocking lane so Waves 1-3 are actually verified.    |
| `reconcile-spec-source-of-truth`    | SoT cluster (125 TBD purposes, ACAR contradiction, duplicate capabilities, roadmap misfile) + openspec-lint guard | ACAR scenario corrected; Purpose backfill, duplicate-owner pointers, and guard landed. |

### Wave 1 — Stop active correctness damage (criticals + parity highs)

| Change                                    | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fix-combat-damage-crit-parity`           | C-1 head cap, A-1 crit-slot modulo, A-2 CASE cap, A-3 vehicle engine crit, A-4 ammo-explosion resolver, + meds (TAC sim, motive, explosion pilot constant, driver/commander)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `wire-interactive-turn-engine`            | Closed by implementation: C-2 physical-attack commit now routes through `InteractiveSession.applyPhysicalAttack`; C-3 interactive/spectator loops progress through PhysicalAttack; E-1 outcome-bus subscriber throws are logged and do not latch the publish guard; match-log divergence + status-guard mediums folded in. Evidence: `addPhysicalAttackPhaseUI.smoke.01/02/03`, `useGameplayStore.utilityActions`, `useGameplayStore.combatFlows`, `useGameplayStore.helpers`, `SpectatorView.logic`, `InteractiveSession.outcomeBus`, `InteractiveSession.matchLog`, `InteractiveSession.physicalAttack`, `phase4Multiplayer`, and `tsc --noEmit --skipLibCheck`. |
| `persist-and-recover-interactive-battles` | Closed C-9 session-lost-on-refresh: client load path wired to existing match-log recovery, launch made recoverable before navigation, corrupt/not-found/storage-unavailable cases tested, and active interactive sessions now warn before refresh/close.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `extend-projection-agreement-tohit`       | B-1 semi-guided TAG + ToHitForecastModal + tautological test (extends the active movement-side change to the to-hit side)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Wave 2 — Close the loops the specs claim are closed (product/roadmap)

| Change                                    | Covers                                                                                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reconcile-multiplayer-coop-reality`      | C-5, C-6, C-7, C-8, MP-1, MP-2, + meds (orphaned compose, match-store cap, API Zod, reconnect UX). **Decision change:** wire the live transport **or** downgrade the specs/roadmap/`@spec` annotations to an honest "not yet wired" state. |
| `close-campaign-economic-loop`            | C-4 repair completion, M-1 salvage convert, M-2 parts inventory, M-3 morale window, M-4 aftermath persistence, M-5 doctor skill, + meds (salary rank, kill XP, activity-log id, unit-market buy)                                           |
| `fix-navigation-and-playability-deadends` | U-1 /gameplay 404, U-2 MP hub orphaned, U-3 games-list stub, U-4 quick-game interactive, + meds (single-campaign clobber, dashboard reactivity, onboarding, vault friction)                                                                |

### Wave 3 — Security + structural debt

| Change                                      | Covers                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `harden-desktop-and-api-security`           | Closed critic gap 1 (Electron arbitrary IPC, CSP, openExternal) + gap 2 (desktop in CI); partially closed gap 4 with shared API boundary helpers on the three abuse-surface routes. Follow-ups: full-tree API Zod/header rollout and shared-store rate limiting. |
| `fix-tactical-map-perf-and-legibility`      | T-1 hover re-render, T-3 firing-arc clutter (T-2 ElevationBadge is re-baselined into the active `add-topdown-tactical-legibility` change)                                                                                                                        |
| `consolidate-equipment-and-hex-duplication` | H-1 4× normalizeEquipmentId, + meds (dead pixelToHex, types-barrel runtime leak, store collisions, hex dupes)                                                                                                                                                    |

### Re-baseline notes for the 3 active changes

- **`add-topdown-tactical-legibility`** — proposal "Why" is false at HEAD (the badge already renders persistently). Reframe from "add a badge" to "gate/anchor/zoom-aware the existing always-on badge" (its own design D1/D2/D3 already specify this). Absorbs T-2.
- **`add-isometric-elevation-extrusion`** — `IsometricElevationStack` + a rotation control already ship; the "elevated hexes render flat" premise and D4 ("does a rotation control exist") are already false/resolved. Narrow scope to skirt rendering + the `camera-controls` retro-spec.
- **`fix-tactical-projection-agreement-gaps`** — correctly scoped for the movement side (B-2/B-4); does **not** cover the to-hit side (B-1) — handled by the new `extend-projection-agreement-tohit`.

---

## What is genuinely good (don't regress it)

- BV 2.0 mech math, equipment catalog hygiene (468 weapons, 0 dup IDs), and the cross-language schema bridge (`schema_gate.py` + `generate-zod-schemas.mjs`).
- Event-sourced engine core: dice rolled once at resolution, baked into events, replay re-derives via the same pure reducer (no re-rolling), `SeededRandom` threaded through headless `runToCompletion`.
- The PSR trigger catalog + resolution, pilot consciousness/death math, gyro/engine hit accumulation, structure-penetration crit ladder — all match MegaMek.
- The safety-critical unit-test floor (hit location, damage transfer, GATOR to-hit, finances) genuinely exercises production code against MegaMek Java oracles; the 2026-06-09 restored suites came back with real depth (`reachable.test.ts` 3451 lines).
- Production code has **zero** `@ts-ignore`/`@ts-expect-error`/`as any` outside tests; only 3 circular deps in a 4157-file graph.
- The server-authoritative multiplayer _core_ and the GM-arbiter proposal pipeline are well-engineered — they just aren't wired to a transport.
- The 4 active OpenSpec changes are coherent, well-formed, and target verified-live gaps.
