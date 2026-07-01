/**
 * Tactical Command Shell type contract.
 *
 * Authored in Wave 7.1 PR-A as the typed substrate for the border-layout
 * tactical UI shell defined in
 * `openspec/changes/add-tactical-command-shell/`. The shell wraps the
 * existing combat surface (`GameplayLayout`) and exposes a stable slot
 * contract that downstream Wave 7 changes (action menu, turn rail,
 * inspectors, lenses, intel UI, accessibility) plug into.
 *
 * No component or rendering logic lives in this file — types only. The
 * slot-registry hook lives at
 * `src/components/gameplay/TacticalCommandShell/useShellSlotRegistry.ts`
 * and PR-B wraps `GameplayLayout` with the shell itself.
 *
 * @spec openspec/changes/add-tactical-command-shell/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-command-shell/tasks.md §1.1
 */

/**
 * Shell rendering mode — drives slot owner selection.
 *
 * Per the shell spec `Shell Mode Ownership` requirement, all four modes
 * SHALL render through the same slot contract; the mode flag drives which
 * owners populate which slots.
 */
export type ShellMode = 'combat' | 'replay' | 'spectator' | 'gm';

/**
 * Named layout slots in the tactical command shell.
 *
 * Per the shell spec `Tactical Command Shell Slots` requirement, the shell
 * provides these stable border regions plus the center map. Adding a new
 * slot is a spec change, NOT a downstream-spec extension: per the spec's
 * "one primary home" invariant, slot allocation is owned exclusively by
 * the shell so downstream specs cannot fragment the registry.
 */
export type SlotId =
  | 'top-band' // PhaseBanner: phase, round, initiative, match status
  | 'morale-band' // MoraleIndicator: per-side morale readouts
  | 'left-tray' // map lenses, objectives, navigation controls
  | 'map-center' // HexMapDisplay: the canonical battlefield
  | 'right-tray' // selected-unit + target inspectors, record sheet drawers
  | 'bottom-dock' // active-unit actions, end/confirm controls
  | 'feed' // EventLogDisplay: combat feed
  | 'minimap-cluster' // minimap + hotkey help overlay
  | 'mobile-drawer'; // mobile-only overlay surface for right-tray content

/**
 * Per-opponent visibility tier — drives intel projection in target
 * inspectors, tokens, event feed, and replay.
 *
 * Per the opponent-intel spec, redaction SHALL occur in the data adapter
 * feeding the shell, NEVER in CSS visibility. Hidden exact state SHALL
 * not be recoverable from labels, tooltips, DOM text, ARIA text, or test
 * ids.
 *
 * Tier semantics (most → least information):
 *   'gm'         — privileged GM/referee view: exact state + pilot
 *                  identity + private notes. Never flows to player shell.
 *   'exact'      — open information: all visible enemy state shown.
 *   'rough'      — band-quantized values (e.g. "lightly damaged"); name
 *                  visible, chassis and numeric fields hidden.
 *   'last-known' — stale snapshot from last observation; may be outdated.
 *   'silhouette' — chassis weight class only (Light/Medium/Heavy/Assault);
 *                  name and chassis designator NOT shown.
 *   'hidden'     — token absent or blank; no combat state exposed.
 *   'unknown'    — unit never observed; completely opaque.
 */
export type OpponentIntelTier =
  | 'gm' // privileged: exact state + pilot identity + private metadata
  | 'exact' // open information — all visible enemy state shown
  | 'rough' // band-quantized values (e.g. "lightly damaged")
  | 'last-known' // stale snapshot of prior visibility
  | 'silhouette' // weight-class silhouette only — no name/chassis
  | 'hidden' // token absent or blank; no state exposed
  | 'unknown'; // never observed

/**
 * Slot owner declaration registered into the shell slot registry.
 *
 * Per the shell spec's "one primary home" rule, each slot SHALL have at
 * most one owner with `primary: true`. Non-primary registrations are
 * permitted as secondary peek surfaces (e.g. a minimap can be primary in
 * `minimap-cluster` but also peek into `left-tray` as secondary).
 */
export interface ISlotOwner {
  /** Stable identifier of the registering component (e.g. "PhaseBanner"). */
  readonly ownerId: string;
  /** True if this owner is the primary home for the slot's fact. */
  readonly primary: boolean;
  /** Which shell modes render this owner. Empty array = all modes. */
  readonly modes: readonly ShellMode[];
}

/** ID of a unit token referenced by the shell. */
export type UnitId = string;

/** ID of a player participating in the match. */
export type PlayerId = string;

/**
 * Active selection / inspection context held by the shell.
 *
 * Separated from `ITacticalShellState` so it can be updated at higher
 * frequency (every hover, every selection) without forcing a re-render of
 * the slot-allocation state.
 */
export interface IShellActiveContext {
  /** Hex currently under the cursor (axial hex id), if any. */
  readonly hoveredHexId: string | null;
  /** Drawer pinned open in the right tray, if any. */
  readonly pinnedDrawerId: string | null;
}

/**
 * A single elected spotter entry tracked by the shell for indirect-fire
 * visual feedback.
 *
 * Carrying both `spotterId` and `attackerId` allows the inspector badge to
 * display "Spotting for: {attackerDesignation}" without a secondary lookup.
 */
export interface IElectedSpotter {
  /** The unit acting as spotter (elected via IndirectFireSpotterSelected). */
  readonly spotterId: UnitId;
  /** The unit whose LRM/indirect attack this spotter supports. */
  readonly attackerId: UnitId;
}

/**
 * Typed state contract for the tactical command shell.
 *
 * MUST distinguish three independent unit references (Wave 7.0 gate 4 —
 * closes the MegaMek PR #5540 / #5573 firing-arc regression precedent
 * where a single `currentEntity` reference silently broke arc redraw on
 * cross-selection):
 *
 *   - `selectedUnit`   the token the player clicked (drives map highlight)
 *   - `activeUnit`     whose turn it currently is (drives action dock)
 *   - `inspectedUnit`  open in the right-tray record sheet (drives inspector)
 *
 * MUST carry per-viewer scope from day one (Wave 7.0 gate 1 — forward-compat
 * with co-op N≥2 and PvP campaigns; adding these fields later would be a
 * breaking change to every shell consumer):
 *
 *   - `viewerPlayerId`             local viewer's player id
 *   - `opponentVisibilityScopes`   per-opponent intel tier; redaction
 *                                  happens in the data adapter, NEVER in
 *                                  CSS visibility (see `OpponentIntelTier`)
 *
 * `electedSpotters` tracks units currently acting as LOS spotters for
 * in-flight indirect-fire attacks (Wave 8 PR-K8 — G1). Entries are added on
 * `IndirectFireSpotterSelected` events, removed on `IndirectFireSpotterLost`,
 * and cleared entirely at turn rollover. Cleared at turn boundary so stale
 * spotter rings don't persist into the next turn.
 */
export interface ITacticalShellState {
  /** Current shell rendering mode. */
  readonly shellMode: ShellMode;
  /** Active selection / inspection focus. */
  readonly activeContext: IShellActiveContext;
  /** Left tray collapsed (lenses / objectives / nav). */
  readonly leftTrayCollapsed: boolean;
  /** Right tray pinned open vs auto-collapse on deselect. */
  readonly rightTrayPinned: boolean;
  /** Active bottom-dock tab id, or null for the phase default. */
  readonly bottomDockActiveTab: string | null;

  // Unit reference triple — MUST stay decoupled. See file JSDoc above.
  readonly selectedUnit: UnitId | null;
  readonly activeUnit: UnitId | null;
  readonly inspectedUnit: UnitId | null;

  // Per-viewer scope — MUST carry from day one. See file JSDoc above.
  readonly viewerPlayerId: PlayerId;
  readonly opponentVisibilityScopes: Readonly<
    Record<PlayerId, OpponentIntelTier>
  >;

  /**
   * Units currently elected as LOS spotters for in-flight indirect-fire
   * attacks. Cleared at turn rollover so stale rings don't persist.
   *
   * Carrying `attackerId` alongside `spotterId` avoids a secondary lookup
   * in the unit inspector badge ("Spotting for: {attacker}").
   */
  readonly electedSpotters: readonly IElectedSpotter[];
}

/**
 * Default-shaped shell state for a fresh single-viewer combat session.
 *
 * Multi-viewer matches (co-op N≥2, PvP) populate
 * `opponentVisibilityScopes` from the match's opponent-intel policy at
 * session start; single-viewer scenarios start with an empty map (no
 * opponents tracked → no per-opponent redaction needed).
 */
export function createDefaultShellState(
  viewerPlayerId: PlayerId,
): ITacticalShellState {
  return {
    shellMode: 'combat',
    activeContext: { hoveredHexId: null, pinnedDrawerId: null },
    // Desktop lens tray starts collapsed so the hex map (FOCUS) reclaims
    // the 112px `w-28` column by default; the player expands it on demand
    // and the choice persists per-match (tactical-map-flex-basis / lens
    // tray de-clutter). Progressive disclosure per the focus doctrine.
    leftTrayCollapsed: true,
    rightTrayPinned: false,
    bottomDockActiveTab: null,
    selectedUnit: null,
    activeUnit: null,
    inspectedUnit: null,
    viewerPlayerId,
    opponentVisibilityScopes: {},
    electedSpotters: [],
  };
}

/**
 * Exhaustive list of all shell slot ids in declaration order. Used by
 * tests to assert that no slot was forgotten when iterating, and by
 * downstream specs to enumerate registry coverage.
 */
export const ALL_SLOT_IDS: readonly SlotId[] = [
  'top-band',
  'morale-band',
  'left-tray',
  'map-center',
  'right-tray',
  'bottom-dock',
  'feed',
  'minimap-cluster',
  'mobile-drawer',
];

/** Exhaustive list of all shell modes. */
export const ALL_SHELL_MODES: readonly ShellMode[] = [
  'combat',
  'replay',
  'spectator',
  'gm',
];

/** Exhaustive list of all opponent intel tiers, ordered most → least information. */
export const ALL_OPPONENT_INTEL_TIERS: readonly OpponentIntelTier[] = [
  'gm',
  'exact',
  'rough',
  'last-known',
  'silhouette',
  'hidden',
  'unknown',
];
