# Design: tactical-movement-intent-composer

## Context

Movement on the tactical HUD is budget-first today: the `TacticalActionDock` renders movement-verb buttons (Walk/Run/Sprint/Evade/Jump with hotkeys) and the in-map MP legend renders a second cost-labeled selector — both wired to `onMovementModeSelect` on the gameplay store. The map already has the key building blocks: a per-mode reachable-hex overlay requirement (MegaMek palette, non-color encodings), an A\*-pathfinder hover path preview, movement range/`hoverMpCost`/`highlightPath` props through `HexMapDisplay`, and a Facing Picker Overlay at the destination. `movement-system` already specifies MP budgets (walk/run/jump), prone/standing costs, heat MP reduction, and movement heat.

The decision record is `docs/adr/0001-intent-first-tactical-movement.md`; canonical vocabulary is `openspec/TERMINOLOGY_GLOSSARY.md` § Tactical Movement Intent Terms. This design covers HOW the intent-first flow lands on the existing components, stores, and engine surface.

## Goals / Non-Goals

**Goals:**
- One movement authority: the Movement Intent Composer (dock-hosted panel + map interaction) replaces both legacy selectors.
- Compose-forward flow: posture actions + waypointed path composed first; budget chosen last via explicit Lock-In.
- Live Intersection enforced at the source (unaffordable items/hexes blocked, envelopes shrink live).
- Reuse the existing A\* pathfinder, reachability computation, and Facing Picker; consume `movement-system` cost rules verbatim.

**Non-Goals:**
- No movement-rule changes; no bot/AI planner changes; no attack-phase composition; no multiplayer protocol changes (the committed sequence enters the existing declaration path).

## Decisions

### D1 — Intent-first replaces budget-first (ADR 0001)
Alternatives (dock-authoritative selection; map-owned mode selection) both preserve the compose→overflow→recompose loop. Rejected per ADR. The composer is the only movement surface; the dock's movement-verb buttons are removed (dock keeps facing/phase/utility and hosts the composer's posture palette); the in-map MP legend is superseded by the Cost Ledger + envelopes.

### D2 — Click-is-a-waypoint with auto-route between anchors
Every click on an affordable hex appends a Waypoint; the A\* pathfinder routes the cheapest path between consecutive anchors; a single click to a destination is the degenerate fast case. Clicking the last waypoint (or Backspace) pops it. Alternatives rejected: pure hex-by-hex stepping (tedious, kills the one-smooth-flow goal on open terrain) and auto-path + drag-to-bend (imprecise at the pivot hex, hostile to keyboard/touch).

### D3 — Live Intersection is computed against the maximal still-affordable budget set
After each composition edit, recompute: `affordableBudgets = budgets.filter(b => ledgerTotal <= b.mp)` where `budgets` are walk/run/jump MP after damage/heat modifiers (from existing `movement-system` hooks). The map's reachable envelopes render **all** affordable modes simultaneously (existing MegaMek palette + non-color encodings retained) and shrink as the remaining MP decreases. Posture palette items grey out when `ledgerTotal + itemCost` exceeds every budget. Alternative (free composition + red deficit ledger) rejected: reintroduces the rehashing loop.

### D4 — Budget Resolver never auto-picks
The resolver lists affordable modes with consequence lines (heat generated per `movement-system` "Movement Generates Heat"; attacker to-hit modifier). Exactly one affordable mode = Forced Mode: single option, still an explicit click. Rationale: heat can be a strategic resource (TSM activation); mode choice carries modifier trade-offs. Lock-In commits the entire composed sequence atomically.

### D5 — State: a `movementIntent` slice on the gameplay store (Zustand)

```typescript
type PostureActionType = 'STAND_UP' | 'CAREFUL_STAND' | 'GO_PRONE' | 'HULL_DOWN';

interface IWaypoint {
  readonly hex: { readonly q: number; readonly r: number };
  /** Facing change applied at this waypoint (hexsides turned); MP cost derives from it. */
  readonly facingChange: number;
}

interface ILocomotionLeg {
  readonly from: IWaypoint;
  readonly to: IWaypoint;
  /** A*-routed hex sequence between the anchors (inclusive of `to`). */
  readonly path: readonly { readonly q: number; readonly r: number }[];
  readonly mpCost: number; // terrain-adjusted, per movement-system
}

type IIntentItem =
  | { readonly kind: 'posture'; readonly action: PostureActionType; readonly mpCost: number }
  | { readonly kind: 'locomotion'; readonly legs: readonly ILocomotionLeg[]; readonly finalFacing: Facing };

interface IBudgetOption {
  readonly mode: MovementMode; // WALK | RUN | JUMP (existing enum)
  readonly budgetMp: number;   // damage/heat-adjusted
  readonly affordable: boolean;
  readonly heatGenerated: number;
  readonly attackerToHitModifier: number;
}

interface IMovementIntentState {
  readonly items: readonly IIntentItem[];
  readonly ledgerTotalMp: number;             // derived
  readonly budgetOptions: readonly IBudgetOption[]; // derived, drives Live Intersection
  readonly lockedMode: MovementMode | null;   // set at Lock-In
}
```

Derived values are selectors, not stored (single source: `items` + unit state). `onMovementModeSelect` and its prop-drilling are replaced by `commitComposedMovement(intent, lockedMode)`, which feeds the existing movement declaration path.

### D6 — Component hierarchy and data flow

```
GameplayLayout
├── HexMapDisplay (FOCUS)
│   ├── EnvelopeOverlay        ← budgetOptions (simultaneous, shrinking)
│   ├── WaypointLayer          ← waypoints, legs, per-leg cost chips, pop-on-click
│   ├── PathPreview (A*)       ← anchored at last waypoint → hover hex
│   └── FacingPickerOverlay    ← existing, at last waypoint
├── TacticalActionDock (PRIMARY-ACTION)
│   └── MovementIntentComposer
│       ├── PosturePalette     ← posture items, greyed via Live Intersection
│       ├── CostLedger         ← per-item rows + total vs budget columns
│       └── BudgetResolver     ← consequence lines, Forced Mode, Lock-In button
└── DesktopRightTray (INSTRUMENT — heat/armor stays glanceable; unchanged)
```

Data flows one way: composition edits → store → derived budgets → map overlays + palette gating; Lock-In → `commitComposedMovement` → existing resolution pipeline → store reset.

### D7 — Validation and error handling
- Composition edits validate against `movement-system` hooks at insert time (Live Intersection); an invalid insert is impossible by construction, so there is no "over budget" error state to render.
- Commit revalidates the full sequence server-of-truth-side (same rules); a drift between composed preview and commit legality rejects with an explicit error per the existing `playable-command-screens` "Preview and commit agreement" requirement.
- Engine-crit/heat changes mid-composition (e.g. interactive events) trigger a budget recompute; items rendered newly unaffordable flag the ledger row and block Lock-In until the player removes them — this is the one recompose path, caused by world change, not by the flow.

## Risks / Trade-offs

- [Per-mode reachability recompute on every waypoint edit could be hot on large maps] → memoize per (unitId, mode, remainingMp, terrain revision); reuse existing movement-range computation which already runs per selection.
- [Removing dock movement buttons breaks e2e/capture specs anchored on them] → the change re-anchors specs in the same PR (`tactical-action-dock:movement` ready-marker and combat quick-slice specs), mirroring the wave's test-coupling discipline.
- [Posture costs interact with budgets non-linearly (e.g. careful stand)] → all costs come from `movement-system` hooks; no local cost math in UI.
- [Keyboard/touch waypoint placement] → hotkeys retained for posture actions; waypoints placeable via keyboard hex cursor (existing map keyboard nav) and touch taps; Backspace pops. A11y: envelopes keep the spec'd non-color encodings; ledger rows are text; Lock-In is a real button with aria-disabled semantics.
- [Interim wave artifacts encoded dock-authoritative selection] → reverted before this change lands (ADR Consequences); direction-neutral fixes kept.

## Migration Plan

Single change, no feature flag: the composer replaces the legacy flow in one PR (the legacy selectors are contradictory with Live Intersection rendering). Rollback = revert the PR; the store slice is additive and self-contained. Evidence captures re-shot; e2e re-anchored in-change.

## Open Questions

- Sprint/Evade handling: Evade is modeled as a Posture Action (no destination); Sprint (if enabled by rules level) enters as a fourth Movement Budget — confirm against `movement-system` rules-level gating during implementation.
- Whether the per-leg cost chips render at all zoom levels or gate on the existing LOD thresholds (recommend: gate below `medium` zoom).
