# OMO Council — UI-Audit Testability Architecture (all subsystems × all screen sizes)

> Convened 2026-07-09 (Heavy variant, 7 seats + Sonnet recon fleet). Question: enhance the testability of the UI-audit paths at all screen sizes so entire encounters and campaigns can be exercised quickly at each subsystem (combat, navigation, cost & economy, maintenance, NPCs, experience).

**Headline:** The fast path must go *through the route mount, not around it* — seed-then-`goto` (IndexedDB match-log / PUT envelope) exercises the exact recovery/mount seams where this codebase's worst bugs hid, while headless-only shortcuts and store injection institutionalize the blind spot; and none of it matters until the never-committed `scripts/playwright/run-playwright.mjs` is tracked, because `npm run verify` is broken today in every fresh worktree.

**Brief:** Design the next evolution of MekStation's UI-audit/testing architecture so entire encounters and campaigns can be exercised quickly per-subsystem and per-viewport, with fast iteration for agents and humans.

**Option space:** A journey-matrix extension (tags + viewports × journeys) · B scenario-pack state injection · C headless fast-forward + UI spot-checks · D infrastructure repair/matrix rationalization · E composed ladder (B+C on D with A as selection layer). **E won, heavily modified by cross-attack.**

## Phase 1 — Captain's Assignments (summary)

- **Recon fleet (7 Sonnet crawlers, pre-phase):** harness internals, 68-screen inventory, state seams, e2e/QC breadth, responsive story, progression hooks, spec/backlog.
- **Hephaestus:** concrete pack-loader seams, SP dice determinism, fast-forward API shape.
- **Prometheus:** wave sequencing, OpenSpec change boundaries, no-fourth-runner rule.
- **Oracle:** three-tier allocation per subsystem, viewport strategy, smallest primitive set.
- **Librarian:** Playwright matrix prior art, fixture-registry prior art, headless-core doctrine.
- **Explore-Deep:** StarmapDisplay contradiction, event-reducer ceiling, salary default, SP seed paths, runner breakage, lane machinery, campaignPageShell contract.
- **Metis (kill-mandate):** is the subsystem×viewport cross-product the real need; product conflation; real bottleneck.
- **Momus (kill-mandate):** fresh-worktree reality, SQLite parallelism, viewport wall-clock, envelope drift, journey-qc SHALL conflicts.

## Phase 2 — Load-bearing findings

**Internal evidence (Explore-Deep, all file:line-verified):**
- StarmapDisplay **is Konva** (react-konva Stage; PR #1017 defer-mount pattern). The rival "SVG/DOM" recon claim was wrong.
- The session-hydration reducer (`applyEvent`, `src/utils/gameplay/gameState/eventDispatch.ts:192-308`) handles **37+ GameEventTypes** (DamageApplied, AmmoConsumed, TurnStarted/PhaseChanged, Heat*, CriticalHitResolved, PSRResolved, UnitFell/Destroyed…). "Turn 8, half armor, ammo low" is constructible from a GameCreated-first event stream **today**; only a payload catalog is missing.
- SP dice: `GameEngine` already takes `config.seed`, but `createInteractiveSession` (`src/engine/GameEngine.ts:244-257`) passes **undefined** d6Roller → resolvers fall back to `defaultD6Roller = Math.random` (`diceTypes.ts:37`); both SP call sites hardcode `seed: Date.now()` (`usePreBattleLaunch.ts:223`, `usePreBattleSkirmish.ts:180`). Fix ≈ 2 lines at 2–3 sites. `?seed=N` currently reaches only the MP websocket (`server.js:588-595`).
- `scripts/playwright/run-playwright.mjs` was **never committed in repo history** (`git log --all` empty); 18 package.json scripts + the qc:ux-audit runner spawn it; `.gitignore:38` `scripts/**` lacks a `!scripts/playwright/` allowlist. `npm run verify` chains into it → **the mandated verify gate is broken today in fresh worktrees/clones.** CI survives only by bypassing the wrapper.
- `campaignPageShell` auto-invokes `loadCampaign(id)` on mount (GET → migrate → deserialize → `writeLiveCampaign`) — so **PUT envelope + `page.goto` rides the production load path** with zero store injection.
- Salary default: `useRoleBasedSalaries: false` → `dailyCostsProcessor` posts; `financialProcessor` no-ops (documented mutual exclusion, audit D-2).
- `run-qc-lanes.mjs` is filter-and-replay over static registry commands — it cannot synthesize Playwright slices.

**External evidence (Librarian, permalinked):** tag-then-scope (grep/grepInvert per project — Intel Geti, onyx) is the ecosystem norm; **no surveyed OSS repo runs an identical suite across N viewport projects** — MekStation's 4-duplicate-project matrix (707 tests × 4 = 3008 executions on one shared SQLite DB) is an outlier anti-pattern. n8n's named-fixture registry with dual load path (UI vs API + transform callback) is the closest scenario-pack analog. boardgame.io: headless client doctrine. DCSS RNG guidelines: assert **invariants across seed batches, never golden traces**; seed→outcome mappings are version-pinned. Chromatic modes: viewport as parameter dimension, not suite duplication.

**Adversaries:**
- **Metis (verdict: kills B+C-as-primary):** both headline speed mechanisms bypass `InteractiveSession.recovery.ts` (`fromSessionAsync → deriveAdaptedUnitsFromSession`) — the path where the instant-defeat bug hid **twice** (latest fix #1019 at the tip of this branch's log); the postmortem lesson is verbatim "jest green while the real router.push-then-mount flow still collapses." All 5 of the 2026-07-07 playtest criticals were cross-subsystem mount/timing/state-propagation bugs found by human live play — none subsystem-isolated, none viewport-layout. Reframe: make live route-mounted journeys cheaper and better-triaged; injection mechanisms must be validated against them, never substituted.
- **Momus (no decisive objection):** killed naive viewport×journey multiplication (~8+ min, no CI budget exists). Wounds: R2 packs share one SQLite file under fullyParallel (named-row collision risk); PUT validation is 4 shallow checks + raw `JSON.parse` cast → **stale envelopes fail silent**; journey-qc's 26 SHALLs pose no structural conflict (MODIFIED deltas routine).

## Phase 3 — Cross-attack (all three proposers: **update**)

Convergent updates, adopted into the decision:
1. **Seam-coverage map (exact):** (a) *recovery rehydration* — **exercised** by R3 IndexedDB seed + `goto('/gameplay/games/:id')`, which drives the cold rehydration factory *harder than click-through does* (Metis's blanket bypass claim overturned on this point); (b) *campaign→encounter materialization handoff* (roster-collapse C4) — deep packs are minted **past** it; only a live launch click-through exercises the client half; (c) *fresh pre-battle construction* (#1019) — unpackable by definition; needs a live journey with an injected seed.
2. **Packs are caches; genesis journeys are the source of truth.** Generator-minted (never hand-authored), front-door loaded (R2 PUT + goto / R3 IndexedDB + goto — never R1 store injection for anything with a mount seam), zod-validated at load (fail-loud), schemaVersion-pinned, and CI re-capture-and-diff so drift is a loud PR diff, not silent rot.
3. **Collision repair:** packs are id-*templates*; the loader stamps `${packId}-${workerIndex}-${uuid}` before PUT/seed, so parallel tests never share a row (n8n transform pattern).
4. **Oracle's allocation redrawn:** "headless-dominant for combat" is dead (combat's worst bug class lives in construction/recovery, unreachable headlessly — `recovery.ts` silently skips `adaptUnit→null` units). Headless remains dominant **only for seam-free subsystems**: economy ledger, XP/skill math (zero coverage today — highest-value win), maintenance progression.
5. **PR gate = headless invariants + the three seam journeys.** Never headless-only. Subsystem-sliced audit lanes run nightly as triage.

## Synthesis

**Decision:** Build the **Seam-First Ladder** — seven sequential OpenSpec changes:

| Wave | Change | Scope | Effort |
|---|---|---|---|
| W0 | `track-harness-runner` | `.gitignore` allowlist + commit `scripts/playwright/run-playwright.mjs` (~70 lines, dependency-light). Repairs `npm run verify`, `test:e2e`, `qc:ux-audit` in every fresh worktree. | ~0.5d |
| W1 | `sp-combat-determinism` | Seeded d6 into `createInteractiveSession` (replace the undefined roller with a dedicated `SeededD6Roller(this.seed)` stream) + thread `?seed=N` through `usePreBattleLaunch`/`usePreBattleSkirmish`, mirroring the MP convention. Deltas: dice-system / game-engine-orchestration. | ~1d |
| W2 | `seam-trust-anchor-journeys` | Three un-sliced, deterministic (needs W1), route-mounted journeys as CI trust anchors: recovery rehydration (R3 seed + cold `goto`), roster→materialization handoff (live launch click-through), fresh construction no-instant-defeat. These can never be replaced by packs. | ~2–3d |
| W3 | `campaign-fast-forward-api` (NEW spec) | `fastForwardCampaign()` in `src/lib/campaign/fastForward/`: store `advanceDay()` loop → `bridgedEncounters` → `materializeCampaignMissionEncounter(fetchImpl→` in-process router importing the real `/api/forces`+`/api/encounters` handlers`)` → `GameEngine.runToCompletion` → `publishCombatOutcome`. Ships `assertSessionInflictedDamage` (closes the recurring 0-damage class) + ledger/XP invariants + live-parity acceptance (invariants, not golden traces). Must pass `useAtBScenarios` + hit Mondays, and assert ≥1 scenario bridged. | ~3–4d |
| W4 | `scenario-packs` (NEW spec) | Registry `e2e/scenario-packs/` (manifest: id, kind, subsystems, viewports, targetRoute, parityAnchorJourney) + `campaign/*.campaign.json` (minted via `buildSerializedCampaign` dump from W3 runs) + `encounter/*.matchlog.json` (captured real event streams). Loaders: `loadCampaignPack` (PUT + goto), `loadEncounterPack` (IndexedDB + goto). Six pilot packs (one per subsystem), then rollout. | ~2–3d |
| W5 | `viewport-layout-sweep` | Promote `expectNoHorizontalOverflow`/`expectClickable`/`expectNonBlankRender` to `e2e/helpers/layout.ts` + new `expectNoOverlap`; one sweep fixture looping `page.setViewportSize` over BREAKPOINTS (375/768/1024/1280) across the ~44 standalone + pack-seeded screens; rationalize the 4 duplicate Playwright projects to tag-then-scope (keep a thin mobile-touch project for hasTouch emulation). No screenshot-diff per screen×width. | ~2d |
| W6 | `subsystem-lanes-and-ci` | Subsystem facet on the journey-qc registry + tags on audit specs; coverage-hole mini-journeys from packs (take-loan, hire, XP/ability purchase — currently zero e2e); CI: headless invariants + 3 seam journeys per-PR, sliced audit lanes + full journey suite nightly. | ~2–3d |

Total ≈ 14–17 dev-days, strictly sequential (Codex workers implement, one at a time; parallel implementation is banned on this repo by history).

**Why:** Time-to-state is the bottleneck (journeys click through setup; nothing jumps to mid-campaign state), but the bug history says the mount/handoff/construction seams are where criticals hide — so the speed mechanism seeds state and still enters **through the front door**, while the three seams keep un-sliced live-journey authority. Headless fast-forward carries the seam-free subsystems (economy/XP/maintenance — including today's zero-coverage XP surface) at jest speed and doubles as the pack-minting engine, which is also what kills hand-authored-envelope drift by construction.

**Survival Score: Modified.** Metis's decisive objection killed "headless-dominant for combat," "journeys shrink," and subsystem-slicing-as-primary-axis; it was itself partially overturned on R3 (seed-then-goto exercises recovery *more* than click-through). Momus's wounds forced the id-template and four-layer drift defenses. The surviving decision is the Phase 3 version, not the Phase 2 version.

**Trade-offs accepted:** Packs gate nothing until parity-proven (slower trust ramp); three retained live journeys keep per-PR wall-clock above pure-headless levels; in-process fetch router is a maintenance surface (mitigated by importing real handlers so drift breaks loudly); viewport sweep asserts layout invariants, not pixel fidelity.

**Second-order (6-month view):** Pack registry becomes the shared start-state layer for any future audit/deep-play journey — new journeys start at named states instead of re-clicking setup; fast-forward invariants become the regression net that catches economy/XP/maintenance drift the day it lands; the seam journeys become the permanent home for every future mount-order bug's regression test; deleting the 3-project duplication cuts local full-suite cost ~75%.

**Open risks / revisit triggers:** (1) If W3's live-parity acceptance shows fast-forwarded states diverging from live-played states on seam invariants, packs stay triage-only permanently (Prometheus's crux). (2) Shared-SQLite writes under fullyParallel — if id-templating still shows contention, key DATABASE_PATH by workerIndex. (3) journey-qc MODIFIED deltas must accompany W2/W4/W6 or the code-complete gate blocks. (4) The two active changes (fix-coop-mutation-propagation, fix-instant-defeat-on-initiative) are independent — but W2's construction seam journey should land after #1019's fix is verified live.

**Dissent on record:** Prometheus holds that parity-gated, front-door-loaded packs can eventually *be* the gate (packs-as-cache with proven fidelity); Hephaestus/Oracle hold seams (b)-client and (c) are structurally unpackable so live journeys keep authority forever. Not blocking: near-term behavior is identical (packs gate nothing until proven).

---
*Appendix*
**Decision crux:** Whether skipping battle *setup* is separable from skipping route-*mount* verification. The council's answer: yes, if and only if state enters through the front door (seed-then-goto) and the three seams keep dedicated live journeys.
**Context factors:** Sequential-implementation constraint; 3–5 min pre-commit build; OpenSpec spec-delta gate; win32-only visual baselines.
**Missing information:** Whether `publishCombatOutcome` from headless fast-forward writes SQLite rows that need the same uuid-stamping; actual per-worker DB feasibility given the single shared webServer process.
**Fault line:** Speed-vs-fidelity of synthetic state — resolved by subordinating synthetic state to live parity rather than picking a side.
**Token cost:** ~2.0M subagent tokens (recon 1.10M + Phase 2 0.71M + Phase 3 0.15M) + orchestration.
