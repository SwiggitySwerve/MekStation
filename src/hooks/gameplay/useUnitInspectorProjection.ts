/**
 * useUnitInspectorProjection - derives the appropriate inspector view for a
 * given unit, respecting the opponent intel policy carried in the tactical
 * command shell context.
 *
 * Redaction is data-level, not CSS. When the projection is 'redacted',
 * the shape contains no exact values, not even the unit name.
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-unit-inspector-drawers/tasks.md section 1.2
 */

import type {
  IComponentDamageState,
  IGameSession,
  IGameUnit,
  IUnitGameState,
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
import { mergeLiveAmmoIntoWeaponStatuses } from '@/utils/gameplay/weaponAmmoDisplay';

export interface IInspectorSupplementalData {
  /** Pilot names keyed by unit id. */
  readonly pilotNames?: Readonly<Record<string, string>>;
  /** Weapon statuses keyed by unit id. */
  readonly unitWeapons?: Readonly<Record<string, readonly IWeaponStatus[]>>;
  /** Per-unit max armor keyed by unit id -> location -> points. */
  readonly maxArmor?: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  /** Per-unit max structure keyed by unit id -> location -> points. */
  readonly maxStructure?: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  /** Heat-sink counts keyed by unit id. */
  readonly heatSinks?: Readonly<Record<string, number>>;
  /**
   * Turn on which each unit was last directly observed, keyed by unit id.
   * Null / missing entry = unit has never been directly observed.
   */
  readonly lastSeenTurns?: Readonly<Record<string, number>>;
  /** Match-level staleness threshold for last-known projections. */
  readonly stalenessThresholdTurns?: number;
  /** GM-only private notes attached to each unit, keyed by unit id. */
  readonly secretNotes?: Readonly<Record<string, readonly string[]>>;
}

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

interface InspectorProjectionContext {
  readonly unitId: string;
  readonly session: IGameSession;
  readonly gameUnit: IGameUnit;
  readonly unitState: IUnitGameState;
  readonly opponentVisibilityScopes: Readonly<
    Record<PlayerId, OpponentIntelTier>
  >;
  readonly supplemental: IInspectorSupplementalData;
}

function sumValues(record: Readonly<Record<string, number>>): number {
  return Object.values(record).reduce((acc, v) => acc + v, 0);
}

function armorFractionToBand(remaining: number, max: number): DamageBand {
  if (max <= 0) return 'lightly-damaged';
  const fraction = remaining / max;
  if (fraction >= 0.95) return 'pristine';
  if (fraction >= 0.65) return 'lightly-damaged';
  if (fraction >= 0.35) return 'moderately-damaged';
  if (fraction >= 0.1) return 'heavily-damaged';
  return 'crippled';
}

function buildInspectorWeapons(
  weaponStatuses: readonly IWeaponStatus[],
): readonly IInspectorWeapon[] {
  return weaponStatuses.map((w) => {
    const isDestroyed = w.destroyed;
    const isJammed = w.jammed ?? false;
    const isOutOfAmmo =
      typeof w.ammoRemaining === 'number' && w.ammoRemaining === 0;
    const disabled = isDestroyed || isJammed || isOutOfAmmo;

    let disabledReason: string | null = null;
    if (isDestroyed) disabledReason = 'Destroyed';
    else if (isJammed) disabledReason = 'Jammed';
    else if (isOutOfAmmo) disabledReason = 'Out of ammo';

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

function deriveIntelConfidence(
  tier: OpponentIntelTier,
  currentTurn: number,
  lastSeenTurn: number | null,
  stalenessThreshold: number | undefined,
): IIntelConfidence {
  const confidence = tierToConfidence(tier);
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

function chassisClassFromTonnage(
  tonnage: number | undefined,
): 'Light' | 'Medium' | 'Heavy' | 'Assault' {
  if (!tonnage || tonnage <= 0) return 'Medium';
  if (tonnage <= 35) return 'Light';
  if (tonnage <= 55) return 'Medium';
  if (tonnage <= 75) return 'Heavy';
  return 'Assault';
}

function pilotNameFor({
  unitId,
  gameUnit,
  supplemental,
}: InspectorProjectionContext): string {
  return supplemental.pilotNames?.[unitId] ?? `Pilot (${gameUnit.pilotRef})`;
}

function totalArmorRemaining({
  unitState,
}: InspectorProjectionContext): number {
  return sumValues(unitState.armor);
}

function totalStructureRemaining({
  unitState,
}: InspectorProjectionContext): number {
  return sumValues(unitState.structure);
}

function damageBandForUnit(context: InspectorProjectionContext): DamageBand {
  const maxArmorRecord = context.supplemental.maxArmor?.[context.unitId] ?? {};
  return armorFractionToBand(
    totalArmorRemaining(context),
    sumValues(maxArmorRecord),
  );
}

function buildFriendlyProjection(
  context: InspectorProjectionContext,
): IFriendlyInspectorView {
  const { unitId, gameUnit, unitState, supplemental } = context;
  return {
    kind: 'friendly',
    unitId,
    name: gameUnit.name,
    chassis: gameUnit.unitRef,
    pilotName: pilotNameFor(context),
    gunnery: gameUnit.gunnery,
    piloting: gameUnit.piloting,
    pilotWounds: unitState.pilotWounds,
    pilotConscious: unitState.pilotConscious,
    heat: unitState.heat,
    totalArmorRemaining: totalArmorRemaining(context),
    totalStructureRemaining: totalStructureRemaining(context),
    prone: unitState.prone ?? false,
    shutdown: unitState.shutdown ?? false,
    destroyed: unitState.destroyed,
    isWithdrawing: unitState.isWithdrawing ?? false,
    // Live ammo merge: the supplemental unitWeapons map is an adoption-time
    // snapshot, so the out-of-ammo / low-ammo signals below would freeze
    // without folding in the unit state's current bins.
    weapons: buildInspectorWeapons(
      mergeLiveAmmoIntoWeaponStatuses(
        supplemental.unitWeapons?.[unitId] ?? [],
        unitState,
      ),
    ),
    criticalEffects: collectCriticalEffects(
      unitState.componentDamage,
      unitState.destroyedLocations,
    ),
    movementThisTurn: unitState.movementThisTurn,
    hexesMoved: unitState.hexesMovedThisTurn,
  };
}

function resolveOpponentIntelTier({
  gameUnit,
  session,
  opponentVisibilityScopes,
}: InspectorProjectionContext): OpponentIntelTier {
  const opponentSide = gameUnit.side;
  const opponentPlayerId =
    session.sideOwners?.[opponentSide] ?? String(opponentSide);
  return opponentVisibilityScopes[opponentPlayerId] ?? 'rough';
}

function buildRedactedProjection(
  unitId: string,
  tier: OpponentIntelTier,
): IRedactedInspectorView {
  const redacted: IRedactedInspectorView = {
    kind: 'redacted',
    unitId,
    contactLabel: 'Unknown Contact',
  };
  assertNoLeakedSecrets(redacted, tier);
  return redacted;
}

function intelConfidenceForUnit(
  context: InspectorProjectionContext,
  tier: OpponentIntelTier,
): IIntelConfidence {
  const lastSeenTurn =
    context.supplemental.lastSeenTurns?.[context.unitId] ?? null;
  return deriveIntelConfidence(
    tier,
    context.session.currentState.turn,
    lastSeenTurn,
    context.supplemental.stalenessThresholdTurns,
  );
}

function buildGmProjection(
  context: InspectorProjectionContext,
  intelConfidence: IIntelConfidence,
): IGmInspectorView {
  const { unitId, gameUnit, unitState, supplemental } = context;
  const gmView: IGmInspectorView = {
    kind: 'gm',
    unitId,
    name: gameUnit.name,
    chassis: gameUnit.unitRef,
    pilotName: pilotNameFor(context),
    gunnery: gameUnit.gunnery,
    piloting: gameUnit.piloting,
    pilotWounds: unitState.pilotWounds,
    pilotConscious: unitState.pilotConscious,
    heat: unitState.heat,
    totalArmorRemaining: totalArmorRemaining(context),
    totalStructureRemaining: totalStructureRemaining(context),
    prone: unitState.prone ?? false,
    shutdown: unitState.shutdown ?? false,
    destroyed: unitState.destroyed,
    damageBand: damageBandForUnit(context),
    secretNotes: supplemental.secretNotes?.[unitId] ?? [],
    intelConfidence,
  };
  assertNoLeakedSecrets(gmView, 'gm');
  return gmView;
}

function buildSilhouetteProjection(
  context: InspectorProjectionContext,
  intelConfidence: IIntelConfidence,
): ITargetInspectorView {
  const { unitId, gameUnit, unitState } = context;
  const silhouetteView: ITargetInspectorView = {
    kind: 'target',
    unitId,
    name: null,
    chassis: null,
    chassisClass: chassisClassFromTonnage(gameUnit.tonnage),
    isExact: false,
    heat: null,
    damageBand: damageBandForUnit(context),
    totalArmorRemaining: null,
    totalStructureRemaining: null,
    prone: unitState.prone ?? false,
    shutdown: null,
    destroyed: unitState.destroyed,
    intelConfidence,
  };
  assertNoLeakedSecrets(silhouetteView, 'silhouette');
  return silhouetteView;
}

function buildTargetProjection(
  context: InspectorProjectionContext,
  tier: OpponentIntelTier,
  intelConfidence: IIntelConfidence,
): ITargetInspectorView {
  const { unitId, gameUnit, unitState } = context;
  const isExact = tier === 'exact';
  const view: ITargetInspectorView = {
    kind: 'target',
    unitId,
    name: gameUnit.name,
    chassis: isExact ? gameUnit.unitRef : null,
    chassisClass: null,
    isExact,
    heat: isExact ? unitState.heat : null,
    damageBand: damageBandForUnit(context),
    totalArmorRemaining: isExact ? totalArmorRemaining(context) : null,
    totalStructureRemaining: isExact ? totalStructureRemaining(context) : null,
    prone: unitState.prone ?? false,
    shutdown: isExact ? (unitState.shutdown ?? false) : null,
    destroyed: unitState.destroyed,
    intelConfidence,
  };
  assertNoLeakedSecrets(view, tier);
  return view;
}

function buildOpponentProjection(
  context: InspectorProjectionContext,
): IInspectorProjection {
  const tier = resolveOpponentIntelTier(context);
  if (tier === 'hidden' || tier === 'unknown') {
    return buildRedactedProjection(context.unitId, tier);
  }

  const intelConfidence = intelConfidenceForUnit(context, tier);
  if (tier === 'gm') return buildGmProjection(context, intelConfidence);
  if (tier === 'silhouette') {
    return buildSilhouetteProjection(context, intelConfidence);
  }

  return buildTargetProjection(context, tier, intelConfidence);
}

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

  if (!unitId) return null;

  const gameUnit = session.units.find((u) => u.id === unitId) ?? null;
  if (!gameUnit) return null;

  const unitState = session.currentState.units[unitId] ?? null;
  if (!unitState) return null;

  const context: InspectorProjectionContext = {
    unitId,
    session,
    gameUnit,
    unitState,
    opponentVisibilityScopes,
    supplemental,
  };

  if (gameUnit.side === viewerSide) {
    return buildFriendlyProjection(context);
  }

  return buildOpponentProjection(context);
}
