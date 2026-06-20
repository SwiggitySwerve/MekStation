## Why

MekStation needs game-master interventions to be authoritative, auditable, and safe for multiplayer visibility before tactical overrides become part of replayable combat history. The current tactical shell has GM-facing command stubs, but the codebase does not yet define owned-state authority, GM-private metadata, player-safe redaction, or additive undo/fix semantics for GM actions.

## What Changes

- Add a GM intervention control plane for owned campaign/game state that separates GM-only intent from player-visible net effects.
- Define authority and redaction rules before any GM intervention can be appended to canonical combat or campaign history.
- Introduce additive GM intervention actions for `add`, `subtract`, `fix`, `undo`, and `reload`, with approval, causality, cascade preview, and public result summaries.
- Support the first combat intervention slice: reposition/facing, damage and critical correction, heat/ammo correction, phase/initiative correction, lifecycle/ejection/withdrawal/destruction/rescue correction, and active-encounter unit customization reload.
- Treat unit customization reload as session reconciliation: reload construction/loadout-derived data from the source unit while preserving live combat overlays by default and escalating conflicts to GM manual takeover.
- Defer post-combat amendments, base/economy fixes, and accumulated time cascades until the combat authority/redaction/event pipeline is proven.

## Non-goals

- No broad rewrite of the existing gameplay or campaign event stores.
- No UI-first implementation where TacticalActionDock or shell mode becomes the authority source.
- No replacement of normal player undo; GM undo is additive correction/supersession, not history truncation.
- No campaign-wide economy/time cascade implementation in the first slice.
- No exposure of hidden GM reasoning, private scenario notes, or unrevealed cascade details to non-GM players.

## Capabilities

### New Capabilities

- `intervention-ledger-abstraction`: Covers reusable append-only ledger interfaces for GM intervention records, projections, causality, redaction, approval state, and domain implementers.
- `gm-authority-redaction`: Covers owned-state GM authority checks and the separation of GM-private metadata from player-public net effects.
- `gm-cascade-preview`: Covers pre-commit preview generation, approval, cancellation, conflict reporting, manual takeover, and unsupported/deferred outcomes.
- `gm-combat-interventions`: Covers first-slice tactical combat intervention implementers for reposition/facing, damage/criticals, heat/ammo, phase/initiative, and lifecycle correction.
- `gm-unit-reload-reconciliation`: Covers active-encounter unit customization reload as a ledger-backed reconciliation implementer that preserves live overlays and escalates conflicts.
- `gm-campaign-intervention-boundaries`: Covers explicit first-slice deferral boundaries and future extension seams for post-combat, base/economy, repair/salvage, and accumulated time cascades.

### Modified Capabilities

- None. Existing event, session, fog-of-war, encounter, co-op, campaign sync, and command UI specs remain integration points; new GM intervention requirements live in split cross-cutting capabilities until implementation proves which existing capabilities need durable requirement deltas.

## Impact

- Affected tactical systems: tactical shell mode, TacticalActionDock GM commands, reusable intervention ledger adapters, gameplay event append/replay, state reducers, event visibility filtering, and combat event display/logging.
- Affected campaign systems: co-op host/GM arbitration patterns, campaign sync vocabulary, ordered campaign event logs, post-combat review, finances/inventory/repair/salvage/time cascades in later phases.
- Affected encounter/unit systems: encounter launch hydration, unitRef/pilotRef source lookups, custom unit version reads, and active session unit reconciliation.
- Affected tests: authority and redaction tests, GM intervention event contract tests, reducer/cascade preview tests, public/private log tests, unit reload reconciliation tests, and regression coverage proving normal player actions remain rules-constrained.
