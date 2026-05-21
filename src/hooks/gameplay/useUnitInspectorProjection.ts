/**
 * useUnitInspectorProjection — derives the appropriate inspector view for a
 * given unit, respecting the opponent intel policy carried in the tactical
 * command shell context.
 *
 * Returns one of three discriminated projections:
 *
 *   - `IFriendlyInspectorView`  — when `unitId` belongs to the viewer's side
 *     (friendly unit, full exact state).
 *   - `ITargetInspectorView`    — when `unitId` belongs to an opponent visible
 *     at 'exact' or 'rough' intel tier.
 *   - `IRedactedInspectorView`  — when `unitId` belongs to an opponent at
 *     'hidden' or 'unknown' tier (identity-safe stub, no leaked values).
 *
 * **Redaction is data-level, not CSS.** When the projection is 'redacted',
 * the shape contains NO exact values — not even the unit name. The component
 * layer is responsible for rendering only what the projection exposes;
 * `useUnitInspectorProjection` ensures the secret data is never in the
 * returned object at all.
 *
 * @param unitId   The unit to project. Null input returns null output.
 * @param session  The current `IGameSession` (provides `units` + `currentState`).
 * @param viewerPlayerId  Local viewer's player id (from shell context).
 * @param viewerSide      The game side the viewer controls.
 * @param opponentVisibilityScopes  Per-opponent intel tier map (from shell state).
 * @param supplemental  Optional per-unit display-name / pilot-name lookups from
 *                      the host layout (these parallel the `pilotNames` / `unitWeapons`
 *                      props on `GameplayLayout`).
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-unit-inspector-drawers/tasks.md §1.2
 */

import type {
  IComponentDamageState,
  IGameSession,
  IWeaponStatus,
} from '@/types/gameplay';
import type {
  DamageBand,
  IFriendlyInspectorView,
  IGmInspectorView,
  IInspectorProjection,
  IInspectorWeapon,
  IIntelConfidence,
  IntelConfidence,
  IRedactedInspectorView,
  ITargetInspectorView,
} from '@/types/gameplay/TacticalInspectorInterfaces';
import type {
  OpponentIntelTier,
  PlayerId,
} from '@/types/gameplay/TacticalShellInterfaces';

import { assertNoLeakedSecrets } from '@/services/intel/intelGuardrails';
import { GameSide } from '@/types/gameplay';

// =============================================================================
// Supplemental lookup (optional per-unit display data from the host)
// =============================================================================

export interface IInspectorSupplementalData {
  /** Pilot names keyed by unit id. */
  readonly pilotNames?: Readonly<Record<string, string>>;
  /** Weapon statuses keyed by unit id. */
  readonly unitWeapons?: Readonly<Record<string, readonly IWeaponStatus[]>>;
  /** Per-unit max armor keyed by unit id → location → points. */
  readonly maxArmor?: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  /** Per-unit max structure keyed by unit id → location → points. */
  readonly maxStructure?: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  /** Heat-sink counts keyed by unit id. */
  readonly heatSinks?: Readonly<Record<string, number>>;
  /**
   * Turn on which each unit was last directly observed, keyed by unit id.
   * Used to compute staleness for 'last-known' tier projections.
   * Null / missing entry = unit has never been directly observed ('unknown' tier).
   */
  readonly lastSeenTurns?: Readonly<Record<string, number>>;
  /**
   * Match-level staleness threshold (from `IIntelPolicyPreset.stalenessThresholdTurns`).
   * When set, a 'last-known' unit whose last-seen turn is older than this many
   * turns receives `isOutdated: true` in its `IIntelConfidence` record.
   */
  readonly stalenessThresholdTurns?: number;
  /**
   * GM-only private notes attached to each unit, keyed by unit id.
   * These are server-side strings never transmitted to player sockets.
   * Only consumed when the active tier is 'gm'.
   */
  readonly secretNotes?: Readonly<Record<string, readonly string[]>>;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Compute total remaining armor/structure across all locations.
 * Returns 0 when the record is empty.
 */
function sumValues(record: Readonly<Record<string, number>>): number {
  return Object.values(record).reduce((acc, v) => acc + v, 0);
}

/**
 * Map a total-armor-remaining fraction to an approximate damage band.
 * Fraction = remaining / max; ranges are heuristic for BattleTech.
 */
function armorFractionToBand(remaining: number, max: number): DamageBand {
  if (max <= 0) return 'lightly-damaged';
  const fraction = remaining / max;
  if (fraction >= 0.95) return 'pristine';
  if (fraction >= 0.65) return 'lightly-damaged';
  if (fraction >= 0.35) return 'moderately-damaged';
  if (fraction >= 0.1) return 'heavily-damaged';
  return 'crippled';
}

/**
 * Convert raw weapon status list to inspector weapon entries.
 * Uses the `destroyed`, `jammed`, and `ammoRemaining` fields directly
 * from `IWeaponStatus` — no external id-list look-ups needed.
 */
function buildInspectorWeapons(
  weaponStatuses: readonly IWeaponStatus[],
): readonly IInspectorWeapon[] {
  return weaponStatuses.map((w) => {
    const isDestroyed = w.destroyed;
    const isJammed = w.jammed ?? false;
    // Out of ammo: ammoRemaining is tracked (not undefined) and is zero.
    const isOutOfAmmo =
      typeof w.ammoRemaining === 'number' && w.ammoRemaining === 0;

    const disabled = isDestroyed || isJammed || isOutOfAmmo;

    let disabledReason: string | null = null;
    if (isDestroyed) disabledReason = 'Destroyed';
    else if (isJammed) disabledReason = 'Jammed';
    else if (isOutOfAmmo) disabledReason = 'Out of ammo';

    // Ammo warning: ammoRemaining is tracked and critically low (< 2 shots).
    const hasAmmoWarning =
      typeof w.ammoRemaining === 'number' &&
      w.ammoRemaining > 0 &&
      w.ammoRemaining < 2;

    return {
      weaponId: w.id,
      displayName: w.name,
      disabled,
      disabledReason,
      hasAmmoWarning,
    };
  });
}

/**
 * Collect active critical effects as human-readable strings.
 * Maps `IComponentDamageState` to the same labels the record sheet
 * displays so the inspector header matches the full sheet.
 */
function collectCriticalEffects(
  componentDamage: IComponentDamageState | undefined,
  destroyedLocations: readonly string[],
): readonly string[] {
  const effects: string[] = [];

  if (!componentDamage) {
    if (destroyedLocations.length > 0) {
      effects.push(`${destroyedLocations.length} location(s) destroyed`);
    }
    return effects;
  }

  if (componentDamage.engineHits > 0) {
    effects.push(
      componentDamage.engineHits === 1
        ? 'Engine Hit'
        : `Engine Hit ×${componentDamage.engineHits}`,
    );
  }
  if (componentDamage.gyroHits > 0) {
    effects.push(
      componentDamage.gyroHits === 1 ? 'Gyro Hit' : 'Gyro Destroyed',
    );
  }
  if (componentDamage.sensorHits > 0) {
    effects.push(`Sensor Hit ×${componentDamage.sensorHits}`);
  }
  if (componentDamage.cockpitHit) {
    effects.push('Cockpit Destroyed');
  }
  if (componentDamage.heatSinksDestroyed > 0) {
    effects.push(`Heat Sinks Destroyed ×${componentDamage.heatSinksDestroyed}`);
  }
  if (destroyedLocations.length > 0) {
    effects.push(`${destroyedLocations.length} location(s) destroyed`);
  }

  return effects;
}

// =============================================================================
// Intel confidence helpers — §2.1
// =============================================================================

/**
 * Map an `OpponentIntelTier` to its `IntelConfidence` bucket.
 * Used to build the `IIntelConfidence` badge attached to target projections.
 */
function tierToConfidence(tier: OpponentIntelTier): IntelConfidence {
  switch (tier) {
    case 'gm':
    case 'exact':
      return 'confirmed';
    case 'rough':
      return 'partial';
    case 'silhouette':
    case 'last-known':
      return 'estimated';
    case 'hidden':
    case 'unknown':
      return 'unconfirmed';
  }
}

/**
 * Derive the full `IIntelConfidence` record for a target or GM projection.
 *
 * @param tier                  Active opponent intel tier.
 * @param currentTurn           Current game turn number (for staleness calc).
 * @param lastSeenTurn          Turn the unit was last observed, or null.
 * @param stalenessThreshold    Turns after which last-known data is 'outdated'.
 *                              Undefined means no decay applies.
 */
function deriveIntelConfidence(
  tier: OpponentIntelTier,
  currentTurn: number,
  lastSeenTurn: number | null,
  stalenessThreshold: number | undefined,
): IIntelConfidence {
  const confidence = tierToConfidence(tier);

  // Staleness only applies to 'last-known' tier.
  const isOutdated =
    tier === 'last-known' &&
    lastSeenTurn !== null &&
    stalenessThreshold !== undefined &&
    currentTurn - lastSeenTurn > stalenessThreshold;

  return {
    confidence,
    isOutdated,
    lastSeenTurn,
    tier,
  };
}

/**
 * Derive a BattleTech chassis weight class from a unit's tonnage.
 * Falls back to 'Medium' when tonnage is unknown or zero.
 *
 * BattleTech canonical ranges:
 *   Light   : 20–35 tons
 *   Medium  : 40–55 tons
 *   Heavy   : 60–75 tons
 *   Assault : 80–100 tons
 */
function chassisClassFromTonnage(
  tonnage: number | undefined,
): 'Light' | 'Medium' | 'Heavy' | 'Assault' {
  if (!tonnage || tonnage <= 0) return 'Medium';
  if (tonnage <= 35) return 'Light';
  if (tonnage <= 55) return 'Medium';
  if (tonnage <= 75) return 'Heavy';
  return 'Assault';
}

// =============================================================================
// Main hook
// =============================================================================

export interface UseUnitInspectorProjectionOptions {
  /** The unit to inspect. Null returns null immediately. */
  readonly unitId: string | null;
  /** Current game session (provides units + currentState). */
  readonly session: IGameSession;
  /** Local viewer's player id. */
  readonly viewerPlayerId: PlayerId;
  /** The game side the viewer controls. */
  readonly viewerSide: GameSide;
  /**
   * Per-opponent intel tier map from `ITacticalShellState.opponentVisibilityScopes`.
   * Key = opponent player id. Missing key defaults to 'rough'.
   */
  readonly opponentVisibilityScopes: Readonly<
    Record<PlayerId, OpponentIntelTier>
  >;
  /** Optional supplemental display data from the host layout. */
  readonly supplemental?: IInspectorSupplementalData;
}

/**
 * Derives the correct `IInspectorProjection` for the given unit,
 * respecting the viewer's side and the opponent intel policy.
 *
 * This is a pure-computation hook (no side effects, no subscriptions):
 * it re-derives on every render when its inputs change. Callers may
 * memoize the result if they need referential stability across renders
 * where neither the session nor the unit state changed.
 *
 * Returns `null` when `unitId` is null or the unit cannot be found in
 * the session.
 */
export function useUnitInspectorProjection(
  options: UseUnitInspectorProjectionOptions,
): IInspectorProjection | null {
  const {
    unitId,
    session,
    viewerSide,
    opponentVisibilityScopes,
    supplemental = {},
  } = options;

  // Fast exit — no unit selected.
  if (!unitId) return null;

  // Locate unit in session static list (IGameUnit — side, name, ref).
  const gameUnit = session.units.find((u) => u.id === unitId) ?? null;
  if (!gameUnit) return null;

  // Locate live unit state (IUnitGameState — armor, heat, etc.).
  const unitState = session.currentState.units[unitId] ?? null;
  if (!unitState) return null;

  // Determine whether this unit is on the viewer's own side.
  const isFriendly = gameUnit.side === viewerSide;

  // ==========================================================================
  // Friendly branch — full exact state
  // ==========================================================================

  if (isFriendly) {
    const pilotName =
      supplemental.pilotNames?.[unitId] ?? `Pilot (${gameUnit.pilotRef})`;
    const weaponStatuses = supplemental.unitWeapons?.[unitId] ?? [];

    const weapons = buildInspectorWeapons(weaponStatuses);

    const criticalEffects = collectCriticalEffects(
      unitState.componentDamage,
      unitState.destroyedLocations,
    );

    const totalArmorRemaining = sumValues(unitState.armor);
    const totalStructureRemaining = sumValues(unitState.structure);

    const view: IFriendlyInspectorView = {
      kind: 'friendly',
      unitId,
      name: gameUnit.name,
      chassis: gameUnit.unitRef,
      pilotName,
      gunnery: gameUnit.gunnery,
      piloting: gameUnit.piloting,
      pilotWounds: unitState.pilotWounds,
      pilotConscious: unitState.pilotConscious,
      heat: unitState.heat,
      totalArmorRemaining,
      totalStructureRemaining,
      prone: unitState.prone ?? false,
      shutdown: unitState.shutdown ?? false,
      destroyed: unitState.destroyed,
      isWithdrawing: unitState.isWithdrawing ?? false,
      weapons,
      criticalEffects,
      movementThisTurn: unitState.movementThisTurn,
      hexesMoved: unitState.hexesMovedThisTurn,
    };

    return view;
  }

  // ==========================================================================
  // Opponent branch — look up intel tier
  // ==========================================================================

  // Resolve which player id owns this opponent unit. When `sideOwners` is
  // populated (networked sessions), the opponent's player id is mapped from
  // the unit's side. For single-player sessions without sideOwners, we fall
  // back to the side string itself as the player key.
  const opponentSide = gameUnit.side;
  const opponentPlayerId: string =
    session.sideOwners?.[opponentSide] ?? (opponentSide as unknown as string);

  const tier: OpponentIntelTier =
    opponentVisibilityScopes[opponentPlayerId] ?? 'rough';

  // 'hidden' or 'unknown' — identity-safe stub, NO exact values.
  if (tier === 'hidden' || tier === 'unknown') {
    const redacted: IRedactedInspectorView = {
      kind: 'redacted',
      unitId,
      contactLabel: 'Unknown Contact',
    };
    // Defense-in-depth: assert the projection respects its tier before
    // returning. No-op in production; throws in dev/test if exact state
    // ever leaks through.
    assertNoLeakedSecrets(redacted, tier);
    return redacted;
  }

  // Derive intel confidence — used by all non-redacted opponent projections.
  const currentTurn = session.currentState.turn;
  const lastSeenTurn = supplemental.lastSeenTurns?.[unitId] ?? null;
  const intelConfidence = deriveIntelConfidence(
    tier,
    currentTurn,
    lastSeenTurn,
    supplemental.stalenessThresholdTurns,
  );

  // 'gm' — privileged full-reveal view (pilot identity + secret notes).
  // MUST only be emitted when shellMode === 'gm'; the hook trusts the caller
  // to only set tier === 'gm' for GM-shell viewers.
  if (tier === 'gm') {
    const pilotName =
      supplemental.pilotNames?.[unitId] ?? `Pilot (${gameUnit.pilotRef})`;
    const totalArmorRemainingGm = sumValues(unitState.armor);
    const maxArmorRecordGm = supplemental.maxArmor?.[unitId] ?? {};
    const maxTotalGm = sumValues(maxArmorRecordGm);
    const damageBandGm = armorFractionToBand(totalArmorRemainingGm, maxTotalGm);

    const gmView: IGmInspectorView = {
      kind: 'gm',
      unitId,
      name: gameUnit.name,
      chassis: gameUnit.unitRef,
      pilotName,
      gunnery: gameUnit.gunnery,
      piloting: gameUnit.piloting,
      pilotWounds: unitState.pilotWounds,
      pilotConscious: unitState.pilotConscious,
      heat: unitState.heat,
      totalArmorRemaining: totalArmorRemainingGm,
      totalStructureRemaining: sumValues(unitState.structure),
      prone: unitState.prone ?? false,
      shutdown: unitState.shutdown ?? false,
      destroyed: unitState.destroyed,
      damageBand: damageBandGm,
      secretNotes: supplemental.secretNotes?.[unitId] ?? [],
      intelConfidence,
    };
    assertNoLeakedSecrets(gmView, tier);
    return gmView;
  }

  // 'silhouette' — weight-class silhouette only; name and chassis NOT revealed.
  if (tier === 'silhouette') {
    const silhouetteView: ITargetInspectorView = {
      kind: 'target',
      unitId,
      name: null,
      chassis: null,
      chassisClass: chassisClassFromTonnage(
        (gameUnit as { tonnage?: number }).tonnage,
      ),
      isExact: false,
      heat: null,
      // Compute damage band even at silhouette tier — visible from the token.
      damageBand: armorFractionToBand(
        sumValues(unitState.armor),
        sumValues(supplemental.maxArmor?.[unitId] ?? {}),
      ),
      totalArmorRemaining: null,
      totalStructureRemaining: null,
      prone: unitState.prone ?? false,
      shutdown: null,
      destroyed: unitState.destroyed,
      intelConfidence,
    };
    assertNoLeakedSecrets(silhouetteView, tier);
    return silhouetteView;
  }

  // 'exact', 'rough', 'last-known' — partial target projection.
  // 'last-known' is treated like 'rough' (band-quantized) but its
  // intelConfidence carries staleness info for the badge.
  const isExact = tier === 'exact';

  // Compute total armor for rough-band mapping.
  const totalArmorRemaining = sumValues(unitState.armor);
  const maxArmorRecord = supplemental.maxArmor?.[unitId] ?? {};
  const maxTotal = sumValues(maxArmorRecord);
  const damageBand = armorFractionToBand(totalArmorRemaining, maxTotal);

  const view: ITargetInspectorView = {
    kind: 'target',
    unitId,
    name: gameUnit.name,
    chassis: isExact ? gameUnit.unitRef : null,
    // chassisClass is only populated at 'silhouette' tier; null at rough/exact.
    chassisClass: null,
    isExact,
    heat: isExact ? unitState.heat : null,
    damageBand,
    totalArmorRemaining: isExact ? totalArmorRemaining : null,
    totalStructureRemaining: isExact ? sumValues(unitState.structure) : null,
    // Prone is visually observable on the map at all tiers.
    prone: unitState.prone ?? false,
    shutdown: isExact ? (unitState.shutdown ?? false) : null,
    destroyed: unitState.destroyed,
    intelConfidence,
  };

  assertNoLeakedSecrets(view, tier);
  return view;
}
