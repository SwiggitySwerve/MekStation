## Decision

Keep `matchTerminalState.ts` as the sole owner of summary classification. The runner supplies its already-resolved winner, effective turn limit, and halt flag; it does not introduce a second objective evaluator. Explicit forfeit and withdrawal retain precedence. A critical halt is a draw. Otherwise a decisive winner takes precedence over survivor fallback and timeout; mutual destruction remains distinct from a draw.

The effective turn limit is the positive configured limit clamped to `MAX_TURNS`, or `MAX_TURNS` for a nonpositive configuration. Keep the existing `maxTurns` classifier input name for compatibility, but document it as this effective limit.

Timeout requires operational units on both sides. In particular, an empty starting roster on both sides retains its existing draw classification even when its run stops on a short configured limit.

## Compatibility

The GameEngine adapter retains these exact mappings: `concede` -> `concede`, `turn_limit` -> `turn_limit`, `objective` -> `objective`; `elimination`, `mutual_destruction`, `aborted`, and `timeout` -> `destruction`. The last two are legacy semantic mismatches, documented in code and deferred. A `never` guard rejects future unhandled reasons at compile time.

No result fields, terminal enum members, events, persisted formats, phases, or random draws change. Interactive sessions, multiplayer live/journal dispatch, and P2P translation do not call the changed adapters. QuickResolve, quick-game auto-resolve, pre-battle auto-resolve, and campaign fast-forward reach the GameEngine adapter through `runToCompletion` and must retain their outcomes.

## Verification

Capture baseline replay/digest/golden suites and seeded auto-resolve outcomes before runtime changes. Record failing runner regression tests before fixing them. Kill a restored `MAX_TURNS` call-site mutant with the short-limit test and kill an added outcome-reason member with the TypeScript exhaustive guard. Run every gate in the lane brief; never regenerate fixtures or widen budgets. Merge origin/main when it moves and repair citations by content, preserving concurrent C16 work.
