/**
 * Tactical Unit Inspector Projection Types.
 *
 * Defines the view-model contracts surfaced by
 * `useUnitInspectorProjection` for the three visibility tiers:
 *
 *   - `IFriendlyInspectorView` — full exact state for own units.
 *   - `ITargetInspectorView`   — partial state for opponents visible at
 *     'exact' or 'rough' intel tier.
 *   - `IRedactedInspectorView` — identity-safe stub for 'hidden' or
 *     'unknown' opponents (no exact values anywhere in the shape).
 *
 * Per the spec requirement "exact hidden fields SHALL not be recoverable
 * from labels, tooltips, DOM text, ARIA text, or test ids", the
 * `IRedactedInspectorView` shape carries ONLY opaque, non-numeric
 * descriptors — no raw heat, armor, or pilot values.
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-unit-inspector-drawers/tasks.md §1.1
 */

/** Union discriminant for the four inspector projection kinds. */
export type InspectorProjectionKind = 'friendly' | 'target' | 'gm' | 'redacted';

// =============================================================================
// Intel confidence + staleness — §2.1
// =============================================================================

/**
 * Confidence level derived from the active `OpponentIntelTier`.
 *
 * Rendered as a badge in the target inspector and as a small dot on
 * enemy tokens. Friendly units never carry a confidence indicator.
 *
 *   'confirmed'   — 'exact' or 'gm' tier: data is live and authoritative.
 *   'partial'     — 'rough' tier: data exists but is quantized.
 *   'estimated'   — 'silhouette' or 'last-known': data is approximate or stale.
 *   'unconfirmed' — 'hidden' or 'unknown': no usable data.
 */
export type IntelConfidence =
  | 'confirmed'
  | 'partial'
  | 'estimated'
  | 'unconfirmed';

/**
 * Intel confidence + optional staleness attached to target projections.
 *
 * `isOutdated` is true when the tier is 'last-known' and the data was
 * last seen more than `stalenessThresholdTurns` turns ago.
 */
export interface IIntelConfidence {
  /** Overall confidence bucket derived from the active tier. */
  readonly confidence: IntelConfidence;
  /**
   * True when the last-known data is older than the match's staleness
   * threshold. Always false for non-last-known tiers.
   */
  readonly isOutdated: boolean;
  /**
   * Turn on which this unit was last directly observed, if known.
   * Null when the unit has never been seen ('unknown' tier).
   */
  readonly lastSeenTurn: number | null;
  /**
   * The active `OpponentIntelTier` that produced this confidence record.
   * Preserved so components can branch on fine-grained tier logic without
   * re-resolving from the shell scope map.
   */
  readonly tier: import('./TacticalShellInterfaces').OpponentIntelTier;
}

// =============================================================================
// Shared sub-shapes
// =============================================================================

/**
 * Approximate damage band used in 'rough' intel projections.
 * Intentionally opaque — no exact numbers leak through.
 */
export type DamageBand =
  | 'pristine'
  | 'lightly-damaged'
  | 'moderately-damaged'
  | 'heavily-damaged'
  | 'crippled';

/** Single weapon entry in a friendly inspector. */
export interface IInspectorWeapon {
  /** Weapon id (for keying lists). */
  readonly weaponId: string;
  /** Display name, e.g., "Medium Laser". */
  readonly displayName: string;
  /** True when this weapon cannot be fired (destroyed, jammed, out-of-ammo). */
  readonly disabled: boolean;
  /** Human-readable reason for disable (e.g., "Out of ammo"). Null when ready. */
  readonly disabledReason: string | null;
  /**
   * Whether the weapon consumed ammo in its last fire.
   * Surfaces ammo-shortage warnings in the inspector.
   */
  readonly hasAmmoWarning: boolean;
}

// =============================================================================
// IFriendlyInspectorView — own-unit exact state
// =============================================================================

/**
 * Full exact state for a friendly unit.
 *
 * All fields reflect the live `IUnitGameState` projection with no
 * redaction. The component layer renders all of these values directly.
 */
export interface IFriendlyInspectorView {
  readonly kind: 'friendly';
  /** Stable unit id. */
  readonly unitId: string;
  /** Display name (from `IGameUnit.name`). */
  readonly name: string;
  /** Chassis/variant designation (from `IGameUnit.unitRef`). */
  readonly chassis: string;
  /** Pilot name, e.g., "Mechwarrior Smith". */
  readonly pilotName: string;
  /** Pilot gunnery skill. */
  readonly gunnery: number;
  /** Pilot piloting skill. */
  readonly piloting: number;
  /** Pilot wounds (0–5; 6 = KIA). */
  readonly pilotWounds: number;
  /** Whether the pilot is still conscious. */
  readonly pilotConscious: boolean;
  /** Current accumulated heat. */
  readonly heat: number;
  /** Total armor points remaining across all locations. */
  readonly totalArmorRemaining: number;
  /** Total structure points remaining across all locations. */
  readonly totalStructureRemaining: number;
  /** Whether this unit is prone (fallen). */
  readonly prone: boolean;
  /** Whether this unit is shut down. */
  readonly shutdown: boolean;
  /** Whether this unit is destroyed. */
  readonly destroyed: boolean;
  /** Whether the unit is actively withdrawing. */
  readonly isWithdrawing: boolean;
  /** Weapon readiness list. Empty array = unit has no weapons data. */
  readonly weapons: readonly IInspectorWeapon[];
  /** Active critical effects, e.g., "Engine Hit x2", "Gyro Destroyed". */
  readonly criticalEffects: readonly string[];
  /** Current movement type used this turn (e.g., "WALK", "RUN", "JUMP"). */
  readonly movementThisTurn: string;
  /** Number of hexes moved this turn. */
  readonly hexesMoved: number;
}

// =============================================================================
// ITargetInspectorView — opponent at 'rough' or 'exact' intel tier
// =============================================================================

/**
 * Partial state for a visible opponent unit.
 *
 * At 'exact' tier, numeric fields are populated. At 'rough' tier the
 * precise numbers are replaced by opaque band descriptors; the numeric
 * fields carry `null` and the band fields carry a `DamageBand` string.
 * At 'silhouette' tier, `name` is null and only `chassisClass` is exposed.
 *
 * Component consumers MUST check `isExact` before rendering a numeric
 * value — if `isExact` is false, only the band fields are trustworthy.
 * For silhouette tier, check `chassisClass !== null` instead of `name`.
 */
export interface ITargetInspectorView {
  readonly kind: 'target';
  /** Stable unit id. */
  readonly unitId: string;
  /**
   * Display name — available at 'rough' and 'exact' tiers; null at
   * 'silhouette' (name is not revealed, only weight class).
   */
  readonly name: string | null;
  /** Chassis designation — available at 'exact' tier only; null at 'rough'/'silhouette'. */
  readonly chassis: string | null;
  /**
   * Weight-class label for 'silhouette' tier: 'Light', 'Medium', 'Heavy',
   * or 'Assault'. Null at all other tiers (name/chassis are used instead).
   */
  readonly chassisClass: 'Light' | 'Medium' | 'Heavy' | 'Assault' | null;
  /** True when all numeric fields are populated (exact tier). */
  readonly isExact: boolean;
  /** Current heat — populated at 'exact'; null at 'rough'/'silhouette'. */
  readonly heat: number | null;
  /** Approximate overall damage state for rough-tier projections. */
  readonly damageBand: DamageBand;
  /** Total armor remaining — exact tier only; null at rough/silhouette tier. */
  readonly totalArmorRemaining: number | null;
  /** Total structure remaining — exact tier only; null at rough/silhouette tier. */
  readonly totalStructureRemaining: number | null;
  /** Whether the unit is prone — available at both tiers (observable on the map). */
  readonly prone: boolean;
  /** Whether the unit is shut down — exact tier only. */
  readonly shutdown: boolean | null;
  /** Whether the unit is destroyed — always available. */
  readonly destroyed: boolean;
  /**
   * Confidence + staleness metadata derived from the active `OpponentIntelTier`.
   * Present on all target projections; used to render the confidence badge
   * and staleness indicator in `TacticalUnitInspector`.
   */
  readonly intelConfidence: IIntelConfidence;
}

// =============================================================================
// IRedactedInspectorView — opponent at 'hidden' or 'unknown' intel tier
// =============================================================================

/**
 * Identity-safe stub for an opponent unit that cannot be observed.
 *
 * Per the spec "exact hidden fields SHALL not be recoverable from labels,
 * tooltips, DOM text, ARIA text, or test ids":
 *   - No name, chassis, heat value, or armor number is present.
 *   - Components rendering this shape MUST display a generic placeholder
 *     (e.g., "Unknown Contact") and MUST NOT derive or infer any secret
 *     value from this shape.
 *
 * The `unitId` is retained because the UI needs a stable React key and
 * the slot owner must know which tile it is managing; it does NOT reveal
 * the pilot identity or chassis to the viewer.
 */
export interface IRedactedInspectorView {
  readonly kind: 'redacted';
  /** Stable unit id — used for React keys only, NOT for display. */
  readonly unitId: string;
  /**
   * Generic contact label, e.g., "Unknown Contact".
   * Must never contain the unit's real name or chassis.
   */
  readonly contactLabel: string;
}

// =============================================================================
// IGmInspectorView — opponent at 'gm' tier (privileged full-reveal)
// =============================================================================

/**
 * Privileged GM view for an opponent unit.
 *
 * Extends the friendly view shape with pilot identity, secret notes, and
 * the intel confidence marker. The GM shell renders this; player shells
 * MUST never receive a 'gm' projection — the hook enforces this by only
 * emitting 'gm' kind when the viewer is confirmed as GM (shellMode 'gm').
 *
 * Secret notes are free-text strings the GM attaches to a unit (e.g.
 * "This unit is actually a mercenary plant"). They are stored server-side
 * and never transmitted to player sockets.
 */
export interface IGmInspectorView {
  readonly kind: 'gm';
  /** Stable unit id. */
  readonly unitId: string;
  /** Display name (always exact, from IGameUnit.name). */
  readonly name: string;
  /** Chassis/variant designation (always exact). */
  readonly chassis: string;
  /** Pilot name — GM always sees pilot identity. */
  readonly pilotName: string;
  /** Pilot gunnery skill. */
  readonly gunnery: number;
  /** Pilot piloting skill. */
  readonly piloting: number;
  /** Pilot wounds (0–5; 6 = KIA). */
  readonly pilotWounds: number;
  /** Whether the pilot is still conscious. */
  readonly pilotConscious: boolean;
  /** Current accumulated heat. */
  readonly heat: number;
  /** Total armor points remaining across all locations. */
  readonly totalArmorRemaining: number;
  /** Total structure points remaining across all locations. */
  readonly totalStructureRemaining: number;
  /** Whether this unit is prone. */
  readonly prone: boolean;
  /** Whether this unit is shut down. */
  readonly shutdown: boolean;
  /** Whether this unit is destroyed. */
  readonly destroyed: boolean;
  /** Approximate overall damage state (always computed even at GM tier). */
  readonly damageBand: DamageBand;
  /**
   * GM-only private notes attached to this unit. Empty array when none.
   * MUST NOT be transmitted to player shells.
   */
  readonly secretNotes: readonly string[];
  /**
   * Confidence indicator — always 'confirmed' at GM tier, included for
   * uniform badge rendering across all non-friendly projections.
   */
  readonly intelConfidence: IIntelConfidence;
}

// =============================================================================
// Union — the projection returned by useUnitInspectorProjection
// =============================================================================

/** Discriminated union of all possible inspector projections. */
export type IInspectorProjection =
  | IFriendlyInspectorView
  | ITargetInspectorView
  | IGmInspectorView
  | IRedactedInspectorView;
