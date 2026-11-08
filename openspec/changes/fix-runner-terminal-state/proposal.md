## Why

The runner classifies configured turn-limit stops against the 100-turn engine ceiling and ignores critical halts and objective winners. Its summary can disagree with the reason the match stopped. The auto-resolve end-reason adapter also silently accepts new reasons through a default destruction mapping.

## What Changes

- Derive the runner terminal summary from the effective configured limit, bounded by the ceiling, the existing winner, and the critical-halt flag.
- Preserve the seven terminal values and existing explicit-exit and destruction behavior.
- Make the GameEngine reason switch exhaustive without changing any current mapping.
- Re-anchor affected runner citations by their content.

## Impact

- Affected capabilities: `after-combat-report`, `game-engine-orchestration`.
- No schema, event payload, persistence, RNG, or phase-order changes.
- Replay fixtures, digests, and seeded auto-resolve outcomes must remain unchanged.
- Follow-ups: consolidate the five end-reason vocabularies; reconsider legacy mappings of `aborted` and `timeout` to `destruction` in auto-resolve.
