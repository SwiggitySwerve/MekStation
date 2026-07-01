# Intent-first tactical movement (composer + ledger + explicit budget lock-in)

**Status:** accepted (2026-07-01)

The tactical HUD had two live movement-mode selectors (action-dock buttons and the in-map MP legend), and the de-clutter effort forced the question of which surface owns movement. Both candidate answers — dock-authoritative and map-owned selection — were **budget-first** models: pick walk/run/jump, then fit your actions into it, and go back and re-pick when posture costs (stand up, careful stand) or damage (engine criticals) don't fit. We decided instead that **movement is intent-first**: the player composes the turn (posture actions + a waypointed path with player-placed pivot points) in a Movement Intent Composer; a Cost Ledger totals it live; a **Live Intersection** rule blocks any item or hex that no remaining budget could afford; and the walk/run/jump choice happens **last**, as an explicit **Lock-In** among the budgets that afford the composed intent.

## Why

- Budget-first forces a compose → overflow → uncompose → recompose loop ("rehashing"), worst exactly when it matters (damaged units, posture changes).
- The resolver must never auto-pick the cheapest affording mode: mode choice carries strategy beyond MP efficiency — running generates heat a TSM unit may _want_; walk/run/jump differ in attack modifiers.
- The path itself is strategy, not a pathfinding detail: a slower forest route (cover) vs a fast plains route (exposed) reach the same hex with different value. Player-placed waypoints/pivots express this; auto-pathing alone cannot.

## Considered options

- **Dock-authoritative selection** (dock keeps mode buttons; map legend demoted to readout) — rejected: budget-first; rehashing loop remains.
- **Map-owned selection** (mode picked at the map; envelopes per mode) — rejected as an end-state framing, but its envelope display survives: the per-mode colored reachability envelopes ARE the Live Intersection rendered on the map.
- **Auto-resolve cheapest affording mode** — rejected: heat-as-resource (TSM) and modifier trade-offs make mode choice deliberate.

## Consequences

- The de-clutter wave's interim dock-authoritative selector consolidation is reverted rather than test-encoded; direction-neutral fixes (hotkey collision, leaked engine tokens, lens tray, layout flex budget) are kept.
- The composer is a real feature (`tactical-movement-intent-composer`, OpenSpec change to come): per-mode reachability with terrain costs, waypointed path costing with pivot facing costs, forced-mode detection, consequence display at lock-in.
- Vocabulary is canonical in `openspec/TERMINOLOGY_GLOSSARY.md` § Tactical Movement Intent Terms.
