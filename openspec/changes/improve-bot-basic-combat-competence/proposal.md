# Change: Improve Bot Basic Combat Competence

## Why

`BotPlayer` currently picks random moves and random targets, ignores firing arcs, never manages heat, and fires weapons out of range-bracket effectiveness order. For a Phase 1 solo skirmish to feel real, the AI opponent must make plausible baseline decisions: pick threatening targets, fire only weapons that can reach, avoid heat shutdown, and position to maintain line of sight. Tournament-level optimal play is explicitly not a goal — "feels like a real opponent" is the bar.

## What Changes

- Target prioritization by threat score × kill probability (replaces uniform-random target choice in `AttackAI.selectTarget`)
- Firing-arc awareness: weapons that can't reach the target's current hex given the attacker's facing and torso twist state SHALL be excluded from the fire list
- Heat management: if firing the candidate weapon set would push heat above a safe threshold (default 13), drop weapons one at a time in ascending damage-per-heat ratio until the candidate set is under threshold
- Weapon selection order: fire highest damage-per-heat ratio weapons first, respect short/medium/long range-bracket effectiveness, and skip weapons at minimum-range penalty when better weapons are available
- Movement positioning: prefer destination hexes that (a) keep at least one enemy in line of sight, and (b) maintain the highest-threat target in the attacker's forward firing arc after the move commits
- Extend `IBotBehavior` with `safeHeatThreshold` (default 13) so scenario presets can tune aggression
- Keep the existing `SeededRandom` discipline — every AI branch that introduces new randomness (tie-breaking, exploration) SHALL route through the injected random source

## Dependencies

- **Requires**: `wire-firing-arc-resolution` (A3) — firing-arc logic must return real arcs before the bot can respect them
- **Requires**: `wire-heat-generation-and-effects` (A5) — safe heat calculation needs real per-weapon heat values
- **Required By**: `add-bot-retreat-behavior` (C2) — retreat logic reuses the threat/firing/heat primitives introduced here

## Impact

- Affected specs: `simulation-system` (AI behavior requirements), `combat-resolution` (bot-driven weapon selection rules)
- Affected code: `src/simulation/ai/BotPlayer.ts`, `src/simulation/ai/MoveAI.ts`, `src/simulation/ai/AttackAI.ts`, `src/simulation/ai/types.ts`
- Engine helpers consumed: `src/utils/gameplay/firingArc.ts`, `src/utils/gameplay/range.ts`, `src/utils/gameplay/lineOfSight.ts`, `src/utils/gameplay/heat.ts`
- No database changes, no UI changes, no event-schema changes — pure decision-layer improvement
- Reproducibility preserved: identical seed + identical board state SHALL continue to produce identical bot actions

## Non-Goals

- Tournament-grade play (no minimax search, no multi-turn planning)
- Coordinated multi-unit tactics (lance cohesion, focus-fire assignment across units)
- Bluffing, feinting, or hidden-information play
- Terrain preference beyond "must have line of sight" — cover-seeking, elevation hunting, and water-for-cooling are follow-up work
- Physical-attack decisions (punch/kick/charge) — remains stubbed; covered by `implement-physical-attack-phase`
