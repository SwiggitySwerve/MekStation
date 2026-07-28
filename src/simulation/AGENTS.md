# Simulation

## OVERVIEW

- Deterministic autonomous execution used for fuzzing, combat validation, throughput, replay, and failure reproduction.
- `SimulationRunner` owns one run; `BatchRunner` derives run seed as `baseConfig.seed + index`.

## STRUCTURE

- `core/`: Mulberry32 `SeededRandom`, D6 adapter, context, and shared types.
- `runner/`: phase loop, batch orchestration, state, detection, and event creation.
- `invariants/`: injectable checks and default registry.
- `ai/`, `generator/`: deterministic decisions and scenario inputs.
- `metrics/`, `reporting/`, `snapshot/`: observational output; never mutate run state.
- `__tests__/`, `runner/__tests__/`: chunked behavior, contract, replay, and performance suites.

## WHERE TO LOOK

- Entry: `runner/SimulationRunner.ts`; batch: `runner/BatchRunner.ts`.
- RNG: `core/SeededRandom.ts`, `core/SeededD6Roller.ts`, `SimulationContext`.
- Event envelope: `runner/phases/utils.ts`; default checks: `invariants/createDefaultInvariantRunner.ts`.
- Live CLIs: `../../scripts/run-simulation-preset.ts` and `../../scripts/run-simulation-swarm.ts`.

## CONVENTIONS

- Preserve phase order, monotonic event sequence, terminal events, and stable serialization.
- Reset PRNG position, config/state, event buffers, detectors, and invariant findings together.
- Register invariants explicitly with stable ids/severity; failures are evidence, not a signal to mutate state.
- Participant/AI factories and presets are data inputs; keep selection order deterministic.
- Duration/timestamps are diagnostic. Seed, winner, turn count, events, and findings are reproducible evidence.
- Prefer injected participants/invariant runners over module singletons.

## ANTI-PATTERNS

- No ambient `Math.random`, wall-clock seed, unordered external iteration, or alternate simulation PRNG in seeded execution.
- Do not let detectors/progress callbacks alter RNG, events, state, or completed-run seed assignment.
- Do not silently widen the default invariant set or promote detector warnings to invariant failures.
- Do not use the terrain LCG from `utils/gameplay/terrainGeneratorTypes.ts` as the simulation PRNG.
- Confirm executable CLIs and current registrations; `README.md` contains older command/coverage prose.

## COMMANDS

- Focused: `npm test src/simulation/`.
- Seeded CLI: `npx tsx scripts/run-simulation-preset.ts ...` or `npx tsx scripts/run-simulation-swarm.ts ...`.
