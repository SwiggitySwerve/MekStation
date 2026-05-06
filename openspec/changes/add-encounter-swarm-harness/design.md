# Design: Add Encounter Swarm Harness

## Context

MekStation has two long-running infrastructure investments that converge in this change:

1. The **simulation stack** — `SimulationRunner`, `BatchRunner`, `BotPlayer` (with `AttackAI` / `MoveAI` / `RetreatAI`), `QuickResolveService`, and the `MetricsCollector` projection layer. Recent changes (`add-quick-resolve-monte-carlo`, `add-bot-retreat-behavior`, `wire-bot-ai-helpers-and-capstone`) shipped the AI behavior + Monte Carlo runner; what's still synthetic is the unit catalog wiring.
2. The **encounter / catalog stack** — `IEncounter` configs with `IOpForConfig` (BV / era / faction / pilot-skill template), `CompendiumAdapter` bridging the 4,196-unit catalog into engine state, and `encounterToGameSession.ts` binding `IForce.assignments[]` (unit + pilot pairs) into `IGameUnit[]`.

The swarm harness pulls these together so a single CLI invocation can fight N seeded battles between catalog mechs piloted by randomly-skilled pilots, with two `IAIPlayer` variants squared off against each other for codified-AI tuning.

The OMO Council Phase 0 + Phase 1 explore proved the gaps are plumbing, not architecture: the simulator already runs headless, the AI already drives both sides, the catalog already loads in Node via `validate-bv.ts`'s pattern, and `encounterToGameSession.ts` already does the pilot-binding work — but `SimulationRunnerSupport.ts:134` silently drops pilot skills at the AI boundary, the singleton catalog service is fetch-only, `BotPlayer` is hardcoded into `SimulationRunner`, and `MetricsCollector` rollups are side-aggregate only.

## Goals / Non-Goals

**Goals:**

- Make randomized pilot selection meaningful by routing real `gunnery` / `piloting` into `AttackAI` threat scoring (Phase 1).
- Let bare `tsx` Node scripts load the real 4,196-unit catalog (Phase 2).
- Make the AI player pluggable via `IAIPlayer` so two variants can fight head-to-head and codified AIs can be enhanced through measured comparison (Phase 3).
- Generate diverse, BV-balanced random forces and skill-banded pilots from a single CLI flag set (Phase 4).
- Ship a CLI runner that wires everything end-to-end and emits per-chassis / per-pilot / per-AI-variant analytics (Phases 5-6).
- Preserve full determinism: same `--config` + `--seed` produces byte-identical output.
- Preserve the existing browser-facing `QuickResolveService` path — this change is purely additive on the CLI side.

**Non-Goals:**

- Worker-thread parallelism (Phase 7).
- Biome / Perlin map wiring (Phase 7 — code already exists in `terrainGenerator.ts`, just not wired).
- LLM-driven `IAIPlayer` implementations (Phase 7 — interface is the seam).
- Coordinated team behavior, surrender negotiation, healing mid-match.
- Database changes, UI changes outside the CLI script.

## Decisions

### D1. Phase 1 plug-in point is `createInitialState`, not `ScenarioGenerator`

The OMO Council corrected the initial assumption that `ScenarioGenerator` needed extension. `BatchRunner` bypasses `ScenarioGenerator` entirely — the gameplay UI uses `ScenarioGenerator`, but the headless CLI path is `BatchRunner` → `SimulationRunner.run` → `SimulationRunnerState.createInitialState` → `createMinimalUnitState`. That means pilot skills must flow through `IGameUnit` → `IUnitGameState` → `IAIUnitState` via `toAIUnitState`. The fix is one read-from-state line plus an audit of `MoveAI` / `AttackAI` / `RetreatAI` for any other hardcoded `DEFAULT_*` reads. `ScenarioGenerator` is left untouched in this change.

### D2. `NodeCanonicalUnitService` lifts `validate-bv.ts`'s pattern; do NOT refactor `CompendiumAdapter`

`scripts/validate-bv.ts:4648-5193` already loads `public/data/units/battlemechs/index.json` via `fs.readFileSync` + `path.resolve(process.cwd(), 'public/data/...')` and parses 4,196 unit JSONs successfully. Lifting that pattern into a class-shaped `NodeCanonicalUnitService` is straightforward. The harder question is whether `CompendiumAdapter.adaptUnit()` (which calls `getCanonicalUnitService()` internally) pulls browser-only deps. The Phase 1 explore reported that `CompendiumAdapter.adaptUnitFromData(fullUnit, options)` (line 465) is the synchronous workhorse and takes pre-loaded data — so the Node path is `NodeCanonicalUnitService.getById(id) → adaptUnitFromData(fullUnit, options)`, which never touches `fetch()`. We do NOT refactor `CompendiumAdapter`. If browser-only deps are detected during Phase 2 implementation, factor a pure-Node loader path next to `adaptUnitFromData` rather than touching the adapter itself.

### D3. `IAIPlayer` interface is method-shaped, not strategy-composition-shaped

`BotPlayer` exposes four public methods: `evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`. The interface mirrors that surface. We deliberately do NOT extract `IAttackStrategy` / `IMoveStrategy` / `IRetreatStrategy` sub-interfaces because:

- `BotPlayer` is the only implementation today; sub-strategies would over-fit a future shape we cannot predict.
- The codified-variant work (Phase 3) is parameter-driven (`IBotBehavior` knobs), not algorithm-replacement — every variant uses the same `AttackAI` / `MoveAI` / `RetreatAI` machinery with different `IBotBehavior` presets.
- A future LLM `IAIPlayer` (deferred) is also better expressed at the player level: it sees the full `IGameSession` snapshot and emits `IMovementEvent` / `IAttackEvent` / `IRetreatEvent`, just like `BotPlayer` does. Sub-strategy composition would force LLM calls into smaller scopes than they reason at well.

The interface inputs are typed in terms of `IGameSession` / `IAIUnitState` / `IHexGrid`; outputs are existing event payload types. Internal `AttackAI` / `MoveAI` / `RetreatAI` types do not leak through.

### D4. `behaviorVariants` registry — three additional presets, not a free-form config

We ship four presets total: `default` (existing knobs unchanged), `aggressive` (low `retreatThreshold`, high `safeHeatThreshold`), `defensive` (high `retreatThreshold`, low `safeHeatThreshold`), `skirmisher` (mid retreat, prefers max-range — `MoveAI` doesn't have an explicit "max range" knob today, so for Phase 3 this is implemented as a low `safeHeatThreshold` to keep it cool while staying out of melee, with a note that a richer variant requires a `MoveAI` extension out of scope for this change). Variants are registered by name in `behaviorVariants.ts`; the CLI flag `--ai-side-a aggressive` looks up the preset and constructs `BotPlayer` with that `IBotBehavior`. Free-form `IBotBehavior` JSON injection is deferred — three presets cover the head-to-head measurement use case.

### D5. Random-force generator uses greedy fill with diversity cap, not optimization

For each side, the generator picks units from a filtered candidate set (BV / tonnage / era / tech-base) via `WeightedTable` weighted by inverse-BV (so a tight budget naturally prefers lighter mechs). Greedy fill: pick → add to force → recompute remaining budget → continue until N units selected or remaining budget within ±5% tolerance. Variant-diversity guard: cap duplicate chassis at `Math.ceil(count / 4)`. We do NOT solve a constraint-satisfaction problem (LP / MIP) — the greedy approach is deterministic, fast (microseconds per force), and good enough for swarm test purposes. Pathological cases where greedy can't satisfy the budget within tolerance return a clear error rather than retrying — the caller can widen filters.

### D6. Random-pilot generator has two strategies, default is template synthesis

- **Vault sample**: requires a populated `usePilotStore`. Samples N pilots without replacement (or with, if N exceeds vault size — flagged in result metadata).
- **Template synthesis**: takes an `IPilotSkillTemplate` (from `IOpForConfig.pilotSkillTemplate` — already exists) and synthesizes new `IPilot` instances with skills drawn from the template's `gunneryRange` / `pilotingRange`. Synthesized pilots are NOT persisted to the vault — they live only for the swarm run.
- **Default**: template synthesis. The CLI is callable without a populated vault (e.g., on a fresh checkout in CI).

The CLI flag is `--pilots <vault|template>`; `template` is the default.

### D7. `participants` payload + `schemaVersion` migration

`ISimulationRunResult` gains:

```typescript
interface ISimulationRunResult {
  readonly schemaVersion: 1 | 2;
  // ...existing fields (preserved)
  readonly participants?: ReadonlyArray<{
    readonly sideId: 'A' | 'B';
    readonly unitId: string;
    readonly chassisId: string; // catalog ID like "ATL-D-A"
    readonly pilotId: string;   // either a vault pilot id or a synthesized id
    readonly gunnery: number;
    readonly piloting: number;
    readonly aiVariant: string;  // 'default' | 'aggressive' | 'defensive' | 'skirmisher' | 'standstill' | future
  }>;
}
```

Existing consumers that ignore `schemaVersion` continue to work because the existing fields are preserved. New consumers (Phase 6 `MetricsCollector` rollups, Phase 5 CLI output writer) gate on `schemaVersion >= 2` before reading `participants`. The schema bump is intentional: it's both a forward signal (Phase 6 needs it) and a documentation artifact (the contract changed).

### D8. Phase 4 plumbs identity through one path, not two

The Phase 1 Plan agent flagged a hidden dep: per-pilot aggregation in Phase 6 needs pilot identity to flow into the simulation result. Rather than adding identity-plumbing twice (once for force-gen, once for aggregation), Phase 4 owns the entire `participants` payload — when the random force/pilot generator runs, it captures `chassisId` / `pilotId` / `gunnery` / `piloting` / `aiVariant` per unit and writes them into `participants` at force-construction time. `BatchRunner.runBatch` carries them through unchanged. Phase 6's `MetricsCollector` then rolls up from the existing `participants` payload — no second plumbing pass.

### D9. CLI uses JSON config as primary input; flags are overrides

Flag-only CLIs are easy to use for ad-hoc runs but become unreadable for swarm matrices (5+ filter dimensions × 2 sides × N). The primary input is `--config scripts/swarm-configs/<name>.json`, and individual flags override config keys. An example config is committed (`scripts/swarm-configs/duel-3kbv-temperate.json`) so reproducible swarm runs are version-controlled artifacts rather than fragile shell history.

### D10. Sequential `BatchRunner` only; defer `worker_threads` to Phase 7

Phase 0 evidence: ~30 ms per simulation run × 1,000 runs ≈ 30 s. The Plan agent confirmed `BatchRunner` constructs a fresh `SimulationRunner` + `SeededRandom` per iteration — clean state isolation, no shared module state to corrupt. Worker-thread fan-out is therefore *clean to add later* but unjustified now: the user's swarm-test goal is satisfied at single-thread throughput up to 1,000s of runs. Trigger condition for the Phase-7 follow-up: a real catalog run of N≥1,000 takes >2 minutes single-threaded, OR the user wants ≥10,000 runs interactively, OR an exhaustive matrix (e.g., every Heavy mech vs every other) crosses ~360,000 runs.

### D11. Biome / Perlin generator wiring is Phase 7

`src/utils/gameplay/terrainGenerator.ts` already ships a Perlin biome generator with `BiomeWeights` for `temperate` / `desert` / `arctic` / `urban` / `jungle`, but it produces an `IHexTerrain[]` shape that `ScenarioGenerator.generateMap` doesn't consume (the latter expects per-hex string terrain). The mismatch is a one-day connector job, not a feature gap. We park it as Phase 7 because the swarm harness's primary value (catalog × pilot × AI variant) doesn't depend on map theme richness — meaningful balance signals will surface even on the existing weighted-terrain hex grid. Once the harness is shaking out balance bugs, biome variety becomes the next obvious extension.

### D12. Type contracts (sketch)

```typescript
// src/simulation/ai/IAIPlayer.ts (NEW)
export interface IAIPlayer {
  evaluateRetreat(
    unit: IAIUnitState,
    behavior: IBotBehavior,
    session: IGameSession,
    grid: IHexGrid,
  ): IRetreatEvent | null;

  playMovementPhase(
    unit: IAIUnitState,
    session: IGameSession,
    grid: IHexGrid,
  ): IMovementEvent | null;

  playAttackPhase(
    unit: IAIUnitState,
    session: IGameSession,
    grid: IHexGrid,
  ): readonly IAttackEvent[];

  playPhysicalAttackPhase(
    unit: IAIUnitState,
    session: IGameSession,
    grid: IHexGrid,
  ): IAttackEvent | null;
}

// src/simulation/ai/behaviorVariants.ts (NEW)
export type AIVariantName = 'default' | 'aggressive' | 'defensive' | 'skirmisher';

export const BEHAVIOR_VARIANTS: Record<AIVariantName, IBotBehavior> = {
  default:    { retreatThreshold: 0.5, retreatEdge: 'nearest', safeHeatThreshold: 13 },
  aggressive: { retreatThreshold: 0.7, retreatEdge: 'nearest', safeHeatThreshold: 18 },
  defensive:  { retreatThreshold: 0.3, retreatEdge: 'nearest', safeHeatThreshold: 10 },
  skirmisher: { retreatThreshold: 0.4, retreatEdge: 'nearest', safeHeatThreshold: 11 },
};

// src/simulation/runner/SimulationRunner.ts (MODIFIED constructor)
type AIPlayerFactory = (random: SeededRandom, behavior: IBotBehavior) => IAIPlayer;

class SimulationRunner {
  constructor(
    seed: number,
    aiPlayerFactory: AIPlayerFactory = (random, behavior) => new BotPlayer(random, behavior),
  ) { /* ... */ }
}

// src/services/encounter/randomForceGenerator.ts (NEW)
export interface IRandomForceOptions {
  readonly bvBudget: number;
  readonly bvTolerance?: number;       // default 0.05
  readonly tonnageMin?: number;
  readonly tonnageMax?: number;
  readonly era?: string;
  readonly techBase?: 'IS' | 'Clan' | 'Mixed';
  readonly sideId: 'A' | 'B';
  readonly count: number;
  readonly random: SeededRandom;
  readonly catalog: IUnitIndex;
  readonly duplicateChassisCap?: number;  // default Math.ceil(count / 4)
}

export function generateRandomForce(opts: IRandomForceOptions): IForce;

// src/services/encounter/randomPilotGenerator.ts (NEW)
export type PilotStrategy = 'vault' | 'template';

export interface IRandomPilotOptions {
  readonly strategy: PilotStrategy;
  readonly count: number;
  readonly random: SeededRandom;
  readonly skillTemplate?: IPilotSkillTemplate;  // required when strategy === 'template'
  readonly vault?: readonly IPilot[];             // required when strategy === 'vault'
}

export function generateRandomPilots(opts: IRandomPilotOptions): readonly IPilot[];
```

## Risks / Trade-offs

- **[Risk]** `CompendiumAdapter` may pull browser-only deps via its `getCanonicalUnitService()` import → **Mitigation**: Phase 2 implementation runs `tsx scripts/run-simulation.ts` end-to-end as the first verification step; if browser-only modules surface, the unblock is to call `adaptUnitFromData(fullUnit, options)` directly with pre-loaded data, never invoking the singleton path. **Do NOT refactor `CompendiumAdapter`.**
- **[Risk]** `IUnitGameState` may not actually carry `gunnery` / `piloting` (Phase 1 explore says yes via `pilotRef`/`gunnery`/`piloting` ~line 1207 of `GameSessionInterfaces.ts`, but verify before edit) → **Mitigation**: Phase 1 task 1 is the audit; if the fields are missing, widen the interface and update `createMinimalUnitState` / `createInitialState` to seed them. This becomes a wider ripple but is straightforward.
- **[Risk]** Greedy random-force generator produces degenerate rosters (e.g., 5 × Atlas if duplicate cap is ineffective) → **Mitigation**: `duplicateChassisCap = Math.ceil(count / 4)`; if cap is hit, exclude that chassis from the candidate set for the rest of the force assembly. Property-test 1,000 forces in Phase 4 verify.
- **[Risk]** Greedy fill cannot satisfy a tight BV budget within ±5% (e.g., budget 1500, all candidate mechs are 800-1200 BV → no two-unit roster fits) → **Mitigation**: throw a clear `BudgetUnsatisfiableError` with the achievable BV range; the caller widens filters or relaxes tolerance. Do not retry-loop.
- **[Risk]** Schema bump from `schemaVersion: 1` to `schemaVersion: 2` breaks downstream consumers that snapshot or persist results → **Mitigation**: existing fields are preserved; only `participants` is new and gated. `MetricsCollector.aggregateBatchOutcomes` (existing pure function) reads `schemaVersion` and falls back to side-aggregate when `participants` is absent. Existing test goldens migrate by re-snapshotting once.
- **[Risk]** Determinism leak from `Map` / `Set` iteration in new code (random-force generator, behavior-variant lookups) → **Mitigation**: explicit array iteration only; lookups use `Object` literals with stable key order. The retreat-behavior change (`add-bot-retreat-behavior` R4) sets the precedent.
- **[Risk]** Vault-sampling pilots without replacement when N > vault size → **Mitigation**: when N > vault.length, sample with replacement and stamp `metadata.sampledWithReplacement: true` on the result so downstream rollups don't double-count "the same pilot's wins" as if they were independent observations.
- **[Risk]** AI variant `skirmisher` is not yet a true max-range archetype → **Mitigation**: documented in D4. The Phase-3 implementation ships a parameter approximation; a richer `MoveAI` "preferred range" knob is a follow-up.
- **[Risk]** Future Phase-7 worker-thread fan-out finds a hidden module-level state leak in `SimulationRunner` → **Mitigation**: the Plan agent's Phase 1 explore + `BatchRunner` audit found no shared mutable state today (`SeededRandom` is instance-scoped, `CanonicalUnitService` singleton is read-only after init and re-initialized per Node worker module). Phase 7 must re-verify with a 100-worker test before scaling beyond that.
- **[Risk]** CLI flag explosion → **Mitigation**: D9. JSON config is primary; flags are overrides. Documented example config is the user-facing surface.

## Migration Plan

This is purely additive on the simulation / CLI side and reuses existing encounter binding:

- `IAIPlayer` is a NEW interface; `BotPlayer` adds `implements IAIPlayer` with no runtime behavior change.
- `SimulationRunner` constructor adds an optional `aiPlayerFactory` parameter with a default — existing callers (in tests, in the existing `SimulationRunner` consumer in `BatchRunner`) continue to work unchanged.
- `ISimulationRunResult.schemaVersion: 2` is read-time gated; consumers without it fall back to existing behavior.
- `NodeCanonicalUnitService` is a new file; nothing references it except the new CLI entry point.
- `randomForceGenerator` and `randomPilotGenerator` are new files; nothing references them except the CLI runner and their own tests.
- `MetricsCollector` rollups are additive; existing reports continue to function.
- The browser-facing `QuickResolveService` path is left fully untouched.
- **Rollback**: revert the change-set; `SimulationRunner.constructor` reverts to no-arg + `BotPlayer`-direct, the new files are deleted, and the result schema downshifts to v1 with no data corruption (results are ephemeral).

## Open Questions (Deferred)

- **Should `participants` carry a `bv` field per unit?** Adding it makes per-BV-bracket rollups trivial. Cost: schema field. Defer until Phase 6 rollup design surfaces the need — `chassisId` lookup against the catalog index already gives BV.
- **Should the CLI config support multiple paired matchups in a single invocation** (e.g., 5 different BV budgets in one config, fan-out across them)? Useful for exhaustive sweep matrices. Defer to Phase 7 — single-matchup-per-invocation keeps Phase 5 small.
- **Should we ship a `--reproduce <output-json>` flag** that re-runs an exact prior swarm by extracting seed + config from a previous output? Cheap to add, useful for debugging surfaced balance bugs. Track as a Phase 5 polish item, not blocking.
- **Should `MetricsCollector` emit Markdown-table summaries** in addition to JSON / CSV? The CLI user reading 200 chassis × 200 chassis matrices in raw JSON is painful. Track as a Phase 6 polish item; CSV export is the primary output for spreadsheet analysis.
