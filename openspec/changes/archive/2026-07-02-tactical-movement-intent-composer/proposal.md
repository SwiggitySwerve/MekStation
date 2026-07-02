# Proposal: tactical-movement-intent-composer

## Why

The tactical HUD's movement flow is budget-first: the player picks walk/run/jump, then discovers mid-composition that posture costs (stand up, careful stand) or damage (engine criticals, heat MP reduction) don't fit, and must back out and re-pick — a compose → overflow → uncompose loop that is worst exactly when decisions matter most (damaged units). The screen also carried two competing movement-mode selectors (action-dock buttons and the in-map MP legend). ADR `docs/adr/0001-intent-first-tactical-movement.md` decided the replacement model: **intent-first movement** — compose the turn, total it live, choose the budget last.

## What Changes

- **New Movement Intent Composer** on the tactical HUD: the active player composes a movement turn as Intent Items — Posture Actions (Stand Up, Careful Stand, Go Prone, Hull Down) plus a waypointed Locomotion Path — before any movement mode is chosen.
- **Click-is-a-waypoint map interaction**: every click on a reachable hex adds a waypoint; the engine auto-routes the cheapest path between consecutive waypoints; a single click to a destination is the fast default; clicking the last waypoint (or Backspace) pops it. Pivot Points (direction changes at waypoints) accrue facing-change MP where they occur.
- **Cost Ledger + per-leg cost chips**: a live MP total of the composed intent, with per-leg and per-pivot costs rendered on the map along the path.
- **Live Intersection**: as intent is composed, the set of still-affordable Movement Budgets (Walk/Run/Jump, damage- and heat-adjusted) recomputes on the fly; intent items and hexes that no remaining budget can afford are blocked at the source. Per-mode reachability envelopes are this rule rendered on the map.
- **Budget Resolver with explicit Lock-In**: affordable modes are presented with consequences (heat generated, attacker to-hit modifier); exactly-one-affordable is Forced Mode (single option, still explicit). The resolver **never auto-picks** — heat can be a strategic resource (e.g. TSM activation). Lock-In commits the whole composed sequence.
- **Single movement authority**: the composer replaces both legacy selectors — the action dock's movement-verb buttons are removed (dock retains posture palette hosting, facing, phase, utility); the in-map MP legend is superseded by the ledger/envelopes.
- Interim artifacts from the de-clutter wave that encoded dock-authoritative selection are reverted rather than shipped (per ADR Consequences).

## Capabilities

### New Capabilities
- `tactical-movement-intent`: the intent-first movement flow — Intent Items (Posture Action, Locomotion Path), waypoint/pivot mechanics and auto-routing between anchors, Cost Ledger, Live Intersection block-at-source rule, Budget Resolver semantics (consequence display, Forced Mode, explicit Lock-In, never-auto-pick), commit of the composed sequence into the existing movement resolution pipeline.

### Modified Capabilities
- `tactical-map-interface`: "Reachable Hex Overlay by MP Type" changes from player-selected-mode rendering to simultaneous affordable-mode envelopes that shrink under Live Intersection; "Path Preview on Hover" re-anchors from the selected unit to the last placed waypoint, and its click-commits-destination scenario becomes click-adds-waypoint; a new Waypoint Composition Interaction requirement is added (waypoint add/pop, auto-route between anchors, per-leg cost chips). The existing Facing Picker Overlay requirement is unchanged (final facing at the last waypoint).

_Not modified_: `movement-system` (MP calculation, prone/standing costs, heat MP reduction, movement heat are consumed as-is — this change reorders the player's decision flow, not the rules); `playable-command-screens` (the composer complies with the existing "Preview and commit agreement" requirement — ledger/resolver are the preview, Lock-In is the commit — no requirement change needed).

## Non-goals

- No changes to movement **rules** (MP formulas, PSR triggers, terrain costs, heat effects) — the composer consumes `movement-system` requirements verbatim.
- No AI/bot movement changes — bots keep their existing planners; this is the human interaction surface.
- No attack-phase or physical-attack composition — intent-first applies to the movement phase only in this change.
- No networked-play protocol changes — the committed sequence enters the same declaration path as today's moves.

## Impact

- **Components**: `src/components/gameplay/TacticalActionDock/` (movement group removed, posture palette hosted), `src/components/gameplay/HexMapDisplay/` (waypoint interaction, envelopes, cost chips; MP legend superseded), new composer/ledger/resolver components under `src/components/gameplay/`, `GameplayLayout.*` wiring.
- **State**: gameplay store gains composed-intent state (intent items, waypoints, affordable-budget set, lock-in); existing `onMovementModeSelect` path is replaced by the commit-of-sequence path.
- **Engine surface**: needs per-mode reachability with terrain-adjusted costs and waypoint-constrained cheapest-path routing (builds on existing movement range/path utilities); posture-action MP costs already specified in `movement-system`.
- **Tests**: tactical e2e specs and the command-screen evidence capture flow re-anchor from mode-buttons to composer interactions; unit tests for ledger math, live intersection, forced-mode detection, waypoint routing.
- **Docs**: canonical vocabulary already in `openspec/TERMINOLOGY_GLOSSARY.md` § Tactical Movement Intent Terms; decision record in `docs/adr/0001-intent-first-tactical-movement.md`.
- **Tech-base/temporal considerations**: consequence display must reflect equipment-conditional strategy (TSM heat thresholds, MASC/Supercharger interactions already computed by `movement-system` hooks).
