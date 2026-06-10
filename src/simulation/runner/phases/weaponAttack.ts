import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  FiringArc,
  GameEventType,
  GamePhase,
  type IEnvironmentalConditions,
  IAttackerState,
  IGameEvent,
  IGameState,
  IHexGrid,
  IToHitModifier,
  ISecondaryTarget,
  ITargetState,
  RangeBracket,
} from '@/types/gameplay';
import { consumeAmmo, isEnergyWeapon } from '@/utils/gameplay/ammoTracking';
import {
  updateC3UnitOperationalStatus,
  updateC3UnitECMStatus,
  updateC3UnitPosition,
  type IC3NetworkUnit,
  type IC3NetworkState,
} from '@/utils/gameplay/c3Network';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import {
  ECM_RADIUS,
  createEmptyEWState,
  getECMProtectedFlag,
  resolveC3ECMDisruption,
} from '@/utils/gameplay/electronicWarfare';
import { calculateEnvironmentalModifiers } from '@/utils/gameplay/environmentalModifiers';
import {
  calculateFiringArc,
  getTorsoTwistFromSecondaryFacing,
} from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import { getClusterHitterBonus, hasSPA } from '@/utils/gameplay/spaModifiers';
import {
  isMissileWeapon,
  isNarcCompatibleMissileWeapon,
} from '@/utils/gameplay/specialWeaponMechanics';
import { hexProvidesPartialCover } from '@/utils/gameplay/terrainCover';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
  calculateToHitWithC3,
} from '@/utils/gameplay/toHit';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';
import type { IResolvedAMSInterception } from './weaponAttackAMS';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { DEFAULT_GUNNERY } from '../SimulationRunnerConstants';
import {
  applyDestroyedWeaponCriticalsToWeapons,
  createMinimalWeapon,
  getRangeBracket,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { createD6Roller, createGameEvent } from './utils';
import {
  findINarcNemesisRedirectTarget,
  hasINarcPodType,
  iNarcHomingTeams,
} from './weaponAttackDesignatorMarkers';
import {
  expandSelectedModeIntoShots,
  getSelectedFiringMode,
  hasAmmoForValidShot,
  isSemiGuidedAmmoSelectedForWeapon,
  isWeaponJammed,
  markWeaponFiredForHeat,
  markWeaponJammed,
  resolveSpecialProjectileHit,
  selectedAmmoWeaponType,
  selectedModeToHitModifier,
  shouldJamOnNaturalTwo,
  shouldSpendAmmoAndHeatOnMiss,
} from './weaponAttackFiringModes';
import {
  bracketToPayloadRange,
  modifiersToPayload,
} from './weaponAttackHelpers';
import { resolveWeaponHit } from './weaponAttackHitResolution';
import { consumeWeaponAmmo } from './weaponAttackHitResolution.helpers';
import { validateLineOfSightForAttack } from './weaponAttackLineOfSight';
import { validateDeclaredAttackTarget } from './weaponAttackTargetValidation';
import {
  calculateInterveningTerrainToHitModifier,
  calculateTargetTerrainToHitModifier,
  targetTerrainFeatures,
} from './weaponAttackTerrainModifiers';

const PLAYTEST_3_C3_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest-3',
  'playtest3',
]);

function hasPlaytest3C3SpotterLineOfSightRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_C3_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

function isTargetInAttackerFrontArc(
  state: IGameState,
  attackerId: string,
  targetId: string,
): boolean {
  const attacker = state.units[attackerId];
  const target = state.units[targetId];
  if (!attacker || !target) return false;

  return (
    calculateFiringArc(
      target.position,
      attacker.position,
      attacker.facing,
      attacker.torsoTwist ??
        getTorsoTwistFromSecondaryFacing(
          attacker.facing,
          attacker.secondaryFacing,
        ),
    ) === FiringArc.Front
  );
}

function isAttackerStealthArmorActive(
  attacker: IGameState['units'][string],
  state: IGameState,
): boolean {
  if (
    attacker.hasStealthArmor !== true ||
    attacker.shutdown === true ||
    !state.electronicWarfare
  ) {
    return false;
  }

  return state.electronicWarfare.ecmSuites.some(
    (suite) =>
      suite.teamId === attacker.side &&
      suite.mode === 'ecm' &&
      suite.operational &&
      (suite.entityId === attacker.id ||
        suite.entityId.startsWith(`${attacker.id}:`)) &&
      hexDistance(attacker.position, suite.position) <= ECM_RADIUS,
  );
}

function iNarcHomingToHitModifier(options: {
  attackerTeamId?: string;
  targetINarcedBy: readonly string[];
  targetEcmProtected?: boolean;
  weapon: IWeapon;
}): IToHitModifier | null {
  const { attackerTeamId, targetEcmProtected, targetINarcedBy, weapon } =
    options;
  if (attackerTeamId === undefined) return null;
  if (targetEcmProtected === true) return null;
  if (!targetINarcedBy.includes(attackerTeamId)) return null;
  if (
    !isNarcCompatibleMissileWeapon(weapon.id) &&
    !isNarcCompatibleMissileWeapon(weapon.name)
  ) {
    return null;
  }

  return {
    name: 'iNARC Homing',
    value: -1,
    source: 'equipment',
  };
}

function iNarcHaywireToHitModifier(
  attacker: IGameState['units'][string] | undefined,
): IToHitModifier | null {
  if (!hasINarcPodType(attacker, 'haywire')) return null;

  return {
    name: 'iNARC Haywire',
    value: 1,
    source: 'equipment',
  };
}

function isFlightPathAffectedByINarcECM(
  attacker: IGameState['units'][string] | undefined,
): boolean {
  return hasINarcPodType(attacker, 'ecm');
}

const C3_CRITICAL_LOCATION_BY_CATALOG_LOCATION: Readonly<
  Record<string, string>
> = {
  HEAD: 'head',
  CENTER_TORSO: 'center_torso',
  LEFT_TORSO: 'left_torso',
  RIGHT_TORSO: 'right_torso',
  LEFT_ARM: 'left_arm',
  RIGHT_ARM: 'right_arm',
  LEFT_LEG: 'left_leg',
  RIGHT_LEG: 'right_leg',
};

function normalizeC3CriticalText(text: string): string {
  return text
    .replace(/^\d+-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(is|clan|cl)/, '');
}

function criticalLocationFromC3SourceLocation(
  sourceLocation: string | undefined,
): string | undefined {
  if (!sourceLocation) return undefined;
  const normalized = sourceLocation
    .split(',')[0]
    ?.trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return normalized
    ? C3_CRITICAL_LOCATION_BY_CATALOG_LOCATION[normalized]
    : undefined;
}

function criticalSlotTextMatchesC3Role(
  role: IC3NetworkUnit['role'],
  componentName: string,
): boolean {
  const normalized = normalizeC3CriticalText(componentName);
  if (role === 'c3i') {
    return normalized.includes('c3i') || normalized.includes('improvedc3');
  }
  return normalized.includes('c3') && normalized.includes(role);
}

function isC3EquipmentDestroyedByCriticalManifest(
  equipment: NonNullable<IGameState['units'][string]['c3Equipment']>[number],
  manifest: CriticalSlotManifest | undefined,
): boolean {
  if (!manifest) return false;

  const sourceLocation = criticalLocationFromC3SourceLocation(
    equipment.sourceLocation,
  );
  const slotGroups =
    sourceLocation !== undefined
      ? [manifest[sourceLocation] ?? []]
      : Object.values(manifest);
  const sourceEquipment = normalizeC3CriticalText(equipment.sourceEquipmentId);

  return slotGroups.some((slots) =>
    slots.some((slot) => {
      const component = normalizeC3CriticalText(slot.componentName);
      const isMatchingMount =
        component === sourceEquipment ||
        component.includes(sourceEquipment) ||
        sourceEquipment.includes(component) ||
        criticalSlotTextMatchesC3Role(equipment.role, slot.componentName);

      return isMatchingMount && slot.destroyed;
    }),
  );
}

function hasUsableC3EquipmentForRole(
  unit: IGameState['units'][string],
  role: IC3NetworkUnit['role'],
  manifest: CriticalSlotManifest | undefined,
): boolean {
  const c3Equipment = unit.c3Equipment;
  if (!c3Equipment || c3Equipment.length === 0) return true;

  const roleEquipment = c3Equipment.filter(
    (equipment) => equipment.role === role,
  );
  if (roleEquipment.length === 0) return false;

  return roleEquipment.some(
    (equipment) =>
      !isC3EquipmentDestroyedByCriticalManifest(equipment, manifest),
  );
}

function canUnitParticipateInC3(
  unit: IGameState['units'][string] | undefined,
  role: IC3NetworkUnit['role'],
  manifest: CriticalSlotManifest | undefined,
): boolean {
  return (
    unit !== undefined &&
    !unit.destroyed &&
    !unit.hasEjected &&
    !unit.hasRetreated &&
    !unit.isWithdrawing &&
    unit.shutdown !== true &&
    unit.isPassenger !== true &&
    hasUsableC3EquipmentForRole(unit, role, manifest)
  );
}

function pruneInactiveC3Networks(state: IC3NetworkState): IC3NetworkState {
  return {
    networks: state.networks.filter((network) => {
      const activeMemberCount = network.members.filter(
        (member) => member.operational,
      ).length;
      if (activeMemberCount < 2) return false;

      if (network.type === 'master-slave') {
        return network.members.some(
          (member) => member.role === 'master' && member.operational,
        );
      }

      return true;
    }),
  };
}

function hydrateC3StateForAttack(
  state: IGameState,
  manifestsByUnit?: ReadonlyMap<string, CriticalSlotManifest>,
): IC3NetworkState | undefined {
  const c3State = state.c3Network;
  if (!c3State) return undefined;

  const members = c3State.networks.flatMap((network) =>
    network.members.map((member) => {
      const unit = state.units[member.entityId];
      const manifest = manifestsByUnit?.get(member.entityId);

      return {
        entityId: member.entityId,
        teamId: member.teamId,
        position: unit?.position ?? member.position,
        operational: canUnitParticipateInC3(unit, member.role, manifest),
        iNarcPods: unit?.iNarcPods,
      };
    }),
  );
  const disruptions = resolveC3ECMDisruption(
    members,
    state.electronicWarfare ?? createEmptyEWState(),
  );

  const hydratedState = members.reduce((hydrated, member) => {
    const positioned = updateC3UnitPosition(
      hydrated,
      member.entityId,
      member.position,
    );
    const operational = updateC3UnitOperationalStatus(
      positioned,
      member.entityId,
      member.operational,
    );

    return updateC3UnitECMStatus(
      operational,
      member.entityId,
      disruptions.get(member.entityId) ?? false,
    );
  }, c3State);

  return pruneInactiveC3Networks(hydratedState);
}

function selectPrimaryWeaponAttackTargetId(
  state: IGameState,
  attackerId: string,
  targetIds: readonly string[],
): string | undefined {
  const distinctTargetIds = targetIds.filter(
    (targetId, index) => targetIds.indexOf(targetId) === index,
  );
  return (
    distinctTargetIds.find((targetId) =>
      isTargetInAttackerFrontArc(state, attackerId, targetId),
    ) ?? distinctTargetIds[0]
  );
}

function buildSecondaryTargetState(
  state: IGameState,
  attackerId: string,
  targetId: string,
  primaryTargetId: string | undefined,
): ISecondaryTarget | undefined {
  if (!primaryTargetId || targetId === primaryTargetId) return undefined;

  return {
    isSecondary: true,
    inFrontArc: isTargetInAttackerFrontArc(state, attackerId, targetId),
  };
}

function applyAMSInterceptionResult(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  attackerId: string;
  targetId: string;
  incomingWeaponId: string;
  interception: IResolvedAMSInterception | undefined;
}): IGameState {
  const {
    events,
    gameId,
    attackerId,
    targetId,
    incomingWeaponId,
    interception,
  } = options;
  let { currentState } = options;
  if (interception === undefined) {
    return currentState;
  }

  currentState = markWeaponFiredForHeat(
    currentState,
    targetId,
    interception.amsWeaponId,
  );

  let ammoBinId: string | undefined;
  let ammoRemaining: number | undefined;
  const defender = currentState.units[targetId];
  const ammoStateBefore = defender?.ammoState;
  if (
    interception.ammoConsumed > 0 &&
    ammoStateBefore &&
    Object.keys(ammoStateBefore).length > 0
  ) {
    const ammoResult = consumeAmmo(
      ammoStateBefore,
      targetId,
      interception.ammoWeaponType,
      interception.ammoConsumed,
    );
    if (ammoResult) {
      ammoBinId = ammoResult.event.binId;
      ammoRemaining = ammoResult.event.roundsRemaining;
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [targetId]: {
            ...currentState.units[targetId],
            ammoState: ammoResult.updatedAmmoState,
          },
        },
      };
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.AmmoConsumed,
          currentState.turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            binId: ammoResult.event.binId,
            weaponType: ammoResult.event.weaponType,
            roundsConsumed: ammoResult.event.roundsConsumed,
            roundsRemaining: ammoResult.event.roundsRemaining,
          },
          targetId,
        ),
      );
    }
  }

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AMSInterception,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        defenderId: targetId,
        targetId,
        attackerId,
        incomingWeaponId,
        amsWeaponId: interception.amsWeaponId,
        resolution: interception.resolution,
        incomingProjectiles: interception.incomingProjectiles,
        projectilesIntercepted: interception.projectilesIntercepted,
        projectilesRemaining: interception.projectilesRemaining,
        ammoConsumed: interception.ammoConsumed,
        roll: interception.roll,
        ...(interception.clusterRoll !== undefined
          ? { clusterRoll: interception.clusterRoll }
          : {}),
        ...(interception.clusterModifier !== undefined
          ? { clusterModifier: interception.clusterModifier }
          : {}),
        ...(interception.modifiedClusterRoll !== undefined
          ? { modifiedClusterRoll: interception.modifiedClusterRoll }
          : {}),
        ...(ammoBinId !== undefined ? { ammoBinId } : {}),
        ...(ammoRemaining !== undefined ? { ammoRemaining } : {}),
      },
      targetId,
    ),
  );

  return currentState;
}

export function runAttackPhase(options: {
  state: IGameState;
  botPlayer: IAIPlayer;
  /**
   * The encounter hex grid. The weapon-attack phase reads the target hex's
   * terrain to derive partial cover. Optional: when absent (no board loaded)
   * no target is treated as in partial cover. The runner currently builds an
   * all-clear grid, so partial cover stays inert until varied terrain lands.
   */
  grid?: IHexGrid;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon
   * list, keyed by runner unit id. Threaded into `toAIUnitState` so the
   * AI sees real catalog loadouts (Atlas → 4× ML + AC/20 + LRM-20 +
   * SRM-6) rather than the synthetic single-medium-laser fallback.
   *
   * Per Phase 2 (this change): the runner now drives the per-mount
   * fire loop directly off `aiUnit.weapons`, so the same map flows
   * end-to-end into damage resolution. Each weapon mount produces a
   * paired `AttackDeclared` / `AttackResolved` event (and damage chain
   * on hit) per turn.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  /**
   * Per `add-combat-fidelity-suite` Phase 3: per-unit critical-slot
   * manifest, keyed by runner unit id. The runner persists post-crit
   * manifests across phase calls so subsequent shots see destroyed
   * slots and the slot-selection roll never re-rolls a
   * already-destroyed slot. When omitted (legacy callers) the runner
   * builds a default manifest per target on first crit.
   *
   * Mutated in place — the caller's `Map` instance is updated with the
   * post-resolution manifest after every shot. Callers that need
   * read-only invariants should pass a copy.
   */
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
  environmentalConditions?: IEnvironmentalConditions;
  optionalRules?: readonly string[];
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    random,
    state,
    violations,
    weaponsByUnit,
    manifestsByUnit,
    environmentalConditions,
    optionalRules,
  } = options;
  let currentState = { ...state, phase: GamePhase.WeaponAttack };
  violations.push(...invariantRunner.runAll(currentState));

  // Per `add-combat-fidelity-suite` Phase 3: lazy default-manifest
  // helper. The first time a target takes structure damage we either
  // pull its already-persisted manifest from the side table, OR build
  // a default biped manifest and seed it. Subsequent shots reuse the
  // updated manifest from prior crit resolutions in the same phase.
  const getOrSeedManifest = (id: string): CriticalSlotManifest => {
    if (manifestsByUnit) {
      const existing = manifestsByUnit.get(id);
      if (existing) return existing;
      const seeded = buildDefaultCriticalSlotManifest();
      manifestsByUnit.set(id, seeded);
      return seeded;
    }
    return buildDefaultCriticalSlotManifest();
  };

  const d6Roller = createD6Roller(random);
  // The all-units snapshot is consumed as enemy candidates; threading
  // weaponsByUnit here keeps the threat-scoring code seeing real
  // weapon BV / range bands when the AI evaluates targets.
  const allAIUnits = Object.values(currentState.units).map((u) =>
    toAIUnitState(u, weaponsByUnit?.get(u.id)),
  );

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (
      unit.destroyed ||
      unit.hasRetreated ||
      unit.hasEjected ||
      unit.shutdown ||
      !unit.pilotConscious
    ) {
      continue;
    }

    const aiUnit = toAIUnitState(unit, weaponsByUnit?.get(unitId));
    const enemyUnits = allAIUnits.filter(
      (aiEnemy) =>
        !aiEnemy.destroyed &&
        !currentState.units[aiEnemy.unitId].hasRetreated &&
        !currentState.units[aiEnemy.unitId].hasEjected &&
        currentState.units[aiEnemy.unitId].side !== unit.side,
    );
    const attackEvent = botPlayer.playAttackPhase(aiUnit, enemyUnits);

    if (!attackEvent) {
      continue;
    }

    // Per Phase 2 design D4: drive the per-mount fire loop off the AI's
    // declared weapon-id list so each weapon produces its own
    // `AttackDeclared` / `AttackResolved` pair. With hydration, this
    // yields up to 7 paired events per Atlas turn (one per mount that
    // passed the AI's heat budget). Without hydration, the AI emits a
    // single synthetic weapon id and this loop runs once.
    const declaredWeaponIds = attackEvent.payload.weapons;
    if (declaredWeaponIds.length === 0) {
      continue;
    }

    const targetIdsByWeapon = attackEvent.payload.weaponTargets ?? {};
    const declaredTargetIds = declaredWeaponIds.map(
      (weaponId) => targetIdsByWeapon[weaponId] ?? attackEvent.payload.targetId,
    );
    const primaryTargetId = selectPrimaryWeaponAttackTargetId(
      currentState,
      unitId,
      declaredTargetIds,
    );

    // Map AI-declared weapon ids back to the hydrated `IWeapon` mounts
    // so per-weapon damage / range / heat use the catalog data. Falls
    // back to the synthetic minimal weapon when hydration didn't
    // populate this unit (legacy preset / non-swarm callers).
    const hydratedWeapons = weaponsByUnit?.get(unitId);
    const effectiveHydratedWeapons = hydratedWeapons
      ? applyDestroyedWeaponCriticalsToWeapons(unit, hydratedWeapons)
      : undefined;
    const weaponLookup = new Map<string, IWeapon>();
    if (effectiveHydratedWeapons) {
      for (const w of effectiveHydratedWeapons) {
        weaponLookup.set(w.id, w);
      }
    }

    for (const weaponId of declaredWeaponIds) {
      let targetId =
        targetIdsByWeapon[weaponId] ?? attackEvent.payload.targetId;
      const targetValidation = validateDeclaredAttackTarget({
        currentState,
        events,
        gameId,
        unitId,
        targetId,
        declaredWeaponIds: [weaponId],
      });
      if (!targetValidation.permitted) {
        continue;
      }

      const hydratedWeapon = weaponLookup.get(weaponId);
      if (!hydratedWeapon && hydratedWeapons) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackInvalid,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weaponId,
              reason: 'UnknownWeapon' as const,
              details:
                'Declared weapon id was not present in the hydrated catalog weapon map',
            },
            unitId,
          ),
        );
        continue;
      }
      const baseWeapon: IWeapon =
        hydratedWeapon ?? createMinimalWeapon(weaponId);
      if (baseWeapon.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackInvalid,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weaponId,
              reason: 'WeaponDestroyed' as const,
            },
            unitId,
          ),
        );
        continue;
      }

      const selectedModeId = attackEvent.payload.weaponModes?.[weaponId];
      const selectedMode = getSelectedFiringMode(baseWeapon, selectedModeId);
      const selectedShotWeapons = expandSelectedModeIntoShots(
        baseWeapon,
        selectedMode,
      );
      const ammoWeaponType = selectedAmmoWeaponType(baseWeapon, selectedMode);
      const declaredWeaponModes =
        selectedModeId && selectedMode !== undefined
          ? { [weaponId]: selectedModeId }
          : undefined;
      const nemesisRedirectTargetId = findINarcNemesisRedirectTarget({
        currentState,
        attackerId: unitId,
        targetId,
        weapon: baseWeapon,
        selectedMode,
        ammoWeaponType,
      });
      if (nemesisRedirectTargetId !== undefined) {
        targetId = nemesisRedirectTargetId;
      }

      // may have destroyed the target, and iNARC Nemesis may redirect to a
      // friendly unit standing between attacker and the original target.
      const attackerNow = currentState.units[unitId];
      const targetNow = currentState.units[targetId];
      if (
        attackerNow.destroyed ||
        attackerNow.hasRetreated ||
        attackerNow.hasEjected ||
        attackerNow.shutdown ||
        !attackerNow.pilotConscious
      ) {
        break;
      }
      if (
        !targetNow ||
        targetNow.destroyed ||
        targetNow.hasRetreated ||
        targetNow.hasEjected
      ) {
        // Target died mid-volley; subsequent mounts can't fire at it.
        break;
      }

      const calledShot = attackEvent.payload.calledShots?.[weaponId] === true;
      const teammateCalledShot =
        attackEvent.payload.teammateCalledShots?.[weaponId] === true;

      const distance = hexDistance(attackerNow.position, targetNow.position);
      if (distance === 0) {
        // Same-hex ranged fire is invalid in both the event-sourced session
        // resolver and the quick-sim runner. Emit AttackInvalid before any
        // to-hit roll, heat, ammo, or damage side effects.
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackInvalid,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weaponId,
              reason: 'SameHex' as const,
            },
            unitId,
          ),
        );
        continue;
      }

      const rangeBracket = getRangeBracket(
        distance,
        baseWeapon.shortRange,
        baseWeapon.mediumRange,
        baseWeapon.longRange,
        baseWeapon.extremeRange,
      );
      if (rangeBracket === RangeBracket.OutOfRange) {
        // Per `combat-resolution` delta: out-of-range attacks emit
        // `AttackInvalid` BEFORE any to-hit roll, and no
        // `AttackDeclared` / `AttackResolved` follows for that mount.
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackInvalid,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weaponId,
              reason: 'OutOfRange' as const,
            },
            unitId,
          ),
        );
        continue;
      }

      // Per `add-encounter-swarm-harness` Phase 1: use the unit's real
      // gunnery so pilot skills drive hit probability, not just target
      // selection. Falls back to DEFAULT_GUNNERY for synthetic units
      // constructed via createMinimalUnitState() which does not
      // populate pilot skills.
      const attackerState: IAttackerState = buildWeaponAttackAttackerToHitState(
        attackerNow,
        attackerNow.gunnery ?? DEFAULT_GUNNERY,
        baseWeapon,
        targetId,
        buildSecondaryTargetState(
          currentState,
          unitId,
          targetId,
          primaryTargetId,
        ),
        // Audit B-5 (W1.2): named options. The source-backed runner opts out
        // of the local Marksman/Sharpshooter called-shot reduction — TacOps
        // called shots carry the full +3 without the local helper SPA.
        {
          calledShot,
          teammateCalledShot,
          applyLocalCalledShotAbilityReduction: false,
        },
      );
      // Partial cover is derived from the terrain of the target's own hex
      // (Total Warfare p. 53). The runner's all-clear grid yields `false`
      // today; the moment varied terrain lands this lights up automatically.
      const targetHex = grid?.hexes.get(
        `${targetNow.position.q},${targetNow.position.r}`,
      );
      const targetPartialCover = hexProvidesPartialCover(targetHex);

      const targetState: ITargetState = buildWeaponAttackTargetToHitState(
        targetNow,
        targetPartialCover,
        targetTerrainFeatures(grid, targetNow.position),
      );

      // Wave 8 PR-K7: Quick-Sim indirect-fire dispatch.
      // The interactive path (declareAttack) and bot path (runAttackPhase)
      // pre-compute indirect-fire resolution via computeIndirectFireContext
      // and thread the +1/+2 penalty + spotter event through the engine. The
      // Quick-Sim pipeline doesn't go through declareAttack — it hand-rolls
      // AttackDeclared / AttackResolved. Wire the same dispatch here so
      // mass-scale BV-balance Monte Carlo runs reflect indirect-fire to-hit
      // math when LRMs fire against units the attacker has no LOS to.
      const lineOfSight = validateLineOfSightForAttack({
        currentState,
        events,
        gameId,
        grid,
        unitId,
        targetId,
        weaponId,
        attackerPosition: attackerNow.position,
        targetPosition: targetNow.position,
      });
      if (!lineOfSight.permitted) {
        continue;
      }
      const indirectFireResolution = lineOfSight.indirectFireResolution;
      const isIndirectFire =
        indirectFireResolution?.permitted === true &&
        indirectFireResolution.isIndirect;
      const indirectFirePenalty =
        isIndirectFire && indirectFireResolution
          ? indirectFireResolution.toHitPenalty
          : 0;
      const targetEcmProtected = currentState.electronicWarfare
        ? getECMProtectedFlag(
            attackerNow.position,
            attackerNow.side as string,
            unitId,
            targetNow.position,
            targetNow.side as string,
            targetId,
            currentState.electronicWarfare,
          )
        : undefined;
      const semiGuidedAmmoSelected = isSemiGuidedAmmoSelectedForWeapon(
        attackerNow,
        baseWeapon,
        selectedMode,
      );
      const semiGuidedTagContext = {
        isSemiGuided: semiGuidedAmmoSelected,
        targetTagDesignated: targetNow.tagDesignated,
        targetEcmProtected,
        isIndirectFire,
      };
      const c3State = hydrateC3StateForAttack(currentState, manifestsByUnit);
      const c3RequiresSpotterLineOfSight =
        hasPlaytest3C3SpotterLineOfSightRule(optionalRules);
      const toHitCalc =
        c3State !== undefined && !isIndirectFire
          ? calculateToHitWithC3(
              attackerState,
              targetState,
              rangeBracket,
              distance,
              {
                attackerEntityId: unitId,
                targetPosition: targetNow.position,
                weaponRangeProfile: {
                  short: baseWeapon.shortRange,
                  medium: baseWeapon.mediumRange,
                  long: baseWeapon.longRange,
                  ...(baseWeapon.extremeRange !== undefined
                    ? { extreme: baseWeapon.extremeRange }
                    : {}),
                  ...(baseWeapon.minRange > 0
                    ? { minimum: baseWeapon.minRange }
                    : {}),
                },
                c3State,
                ...(c3RequiresSpotterLineOfSight
                  ? {
                      targetingOptions: {
                        requireSpotterTargetLineOfSight: true,
                        spotterHasTargetLineOfSight: (
                          spotter: IC3NetworkUnit,
                        ) =>
                          grid
                            ? calculateLOS(
                                spotter.position,
                                targetNow.position,
                                grid,
                              ).hasLOS
                            : false,
                      },
                    }
                  : {}),
              },
              baseWeapon.minRange,
              baseWeapon.id,
              semiGuidedTagContext,
            )
          : calculateToHit(
              attackerState,
              targetState,
              rangeBracket,
              distance,
              baseWeapon.minRange,
              baseWeapon.id,
              semiGuidedTagContext,
            );
      const iNarcHomingModifier = iNarcHomingToHitModifier({
        attackerTeamId: attackerNow.side as string,
        targetINarcedBy: iNarcHomingTeams(targetNow),
        targetEcmProtected,
        weapon: baseWeapon,
      });
      const iNarcHaywireModifier = iNarcHaywireToHitModifier(attackerNow);
      const modeToHitModifier = selectedModeToHitModifier(
        baseWeapon,
        selectedMode,
      );
      const adjustedToHit =
        toHitCalc.finalToHit +
        indirectFirePenalty +
        (modeToHitModifier?.value ?? 0) +
        (iNarcHomingModifier?.value ?? 0) +
        (iNarcHaywireModifier?.value ?? 0);

      const firingArc = calculateFiringArc(
        attackerNow.position,
        targetNow.position,
        targetNow.facing,
      );

      // Per `combat-resolution` delta: emit `AttackDeclared` BEFORE
      // the to-hit roll. Carries the weapon id, range bracket, firing
      // arc, and the full modifier breakdown so replay / metrics
      // consumers can show the GATOR math without recomputing it.
      const baseModifiers = modifiersToPayload(toHitCalc.modifiers);
      const declaredModifiers =
        indirectFirePenalty > 0
          ? [
              ...baseModifiers,
              {
                name: 'Indirect fire',
                value: indirectFirePenalty,
                source: 'other' as const,
              },
            ]
          : baseModifiers;
      const modeAdjustedModifiers =
        modeToHitModifier !== null
          ? [...declaredModifiers, modeToHitModifier]
          : declaredModifiers;
      const guidanceAdjustedModifiers =
        iNarcHomingModifier !== null
          ? [...modeAdjustedModifiers, iNarcHomingModifier]
          : modeAdjustedModifiers;
      const iNarcAdjustedModifiers =
        iNarcHaywireModifier !== null
          ? [...guidanceAdjustedModifiers, iNarcHaywireModifier]
          : guidanceAdjustedModifiers;
      const interveningTerrainModifier =
        calculateInterveningTerrainToHitModifier(grid, lineOfSight.losResult);
      const targetTerrainModifier = calculateTargetTerrainToHitModifier(
        grid,
        targetNow.position,
      );
      const terrainAdjustedToHit =
        adjustedToHit +
        (targetTerrainModifier?.value ?? 0) +
        (interveningTerrainModifier?.value ?? 0);
      const finalDeclaredModifiers = [
        ...iNarcAdjustedModifiers,
        ...(targetTerrainModifier ? [targetTerrainModifier] : []),
        ...(interveningTerrainModifier ? [interveningTerrainModifier] : []),
      ];
      const environmentalModifiers =
        environmentalConditions !== undefined
          ? calculateEnvironmentalModifiers(environmentalConditions, {
              isEnergyWeapon: isEnergyWeapon(baseWeapon.name),
              isMissileWeapon:
                isMissileWeapon(baseWeapon.id) ||
                isMissileWeapon(baseWeapon.name),
            })
          : [];
      const environmentalModifierTotal = environmentalModifiers.reduce(
        (total, modifier) => total + modifier.value,
        0,
      );
      const environmentAdjustedToHit =
        terrainAdjustedToHit + environmentalModifierTotal;
      const attackModifiers =
        environmentalModifiers.length > 0
          ? [
              ...finalDeclaredModifiers,
              ...modifiersToPayload(environmentalModifiers),
            ]
          : finalDeclaredModifiers;

      if (isWeaponJammed(currentState.units[unitId], baseWeapon.id)) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackInvalid,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weaponId,
              reason: 'WeaponJammed' as const,
            },
            unitId,
          ),
        );
        continue;
      }

      for (const shotWeapon of selectedShotWeapons) {
        const attackerBeforeShot = currentState.units[unitId];
        const targetBeforeShot = currentState.units[targetId];
        if (
          attackerBeforeShot.destroyed ||
          attackerBeforeShot.hasRetreated ||
          attackerBeforeShot.hasEjected ||
          attackerBeforeShot.shutdown ||
          !attackerBeforeShot.pilotConscious
        ) {
          break;
        }
        if (
          !targetBeforeShot ||
          targetBeforeShot.destroyed ||
          targetBeforeShot.hasRetreated ||
          targetBeforeShot.hasEjected
        ) {
          break;
        }

        if (
          !hasAmmoForValidShot(attackerBeforeShot, baseWeapon, selectedMode)
        ) {
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.AttackInvalid,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                attackerId: unitId,
                targetId,
                weaponId,
                reason: 'OutOfAmmo' as const,
              },
              unitId,
            ),
          );
          break;
        }

        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.AttackDeclared,
            currentState.turn,
            GamePhase.WeaponAttack,
            {
              attackerId: unitId,
              targetId,
              weapons: [weaponId],
              ...(declaredWeaponModes
                ? { weaponModes: declaredWeaponModes }
                : {}),
              toHitNumber: environmentAdjustedToHit,
              modifiers: attackModifiers,
              range: bracketToPayloadRange(rangeBracket),
              firingArc,
            },
            unitId,
          ),
        );

        // Wave 8 PR-K7: emit IndirectFireSpotterSelected (basis='los') or
        // IndirectFireNarcOverride immediately after AttackDeclared when
        // indirect fire is in effect — mirrors PR-K4's declareAttack
        // dispatch so the event log + downstream consumers see the same
        // sequence regardless of which pipeline ran.
        if (
          indirectFireResolution &&
          indirectFireResolution.permitted &&
          indirectFireResolution.isIndirect
        ) {
          const basis = indirectFireResolution.basis;
          if (basis === 'narc' || basis === 'inarc') {
            events.push(
              createGameEvent(
                gameId,
                events.length,
                GameEventType.IndirectFireNarcOverride,
                currentState.turn,
                GamePhase.WeaponAttack,
                {
                  attackerId: unitId,
                  spotterId: null,
                  weaponId,
                  targetHex: targetNow.position,
                  toHitPenalty: indirectFirePenalty,
                  basis,
                },
                unitId,
              ),
            );
          } else if (indirectFireResolution.spotterId) {
            events.push(
              createGameEvent(
                gameId,
                events.length,
                GameEventType.IndirectFireSpotterSelected,
                currentState.turn,
                GamePhase.WeaponAttack,
                {
                  attackerId: unitId,
                  spotterId: indirectFireResolution.spotterId,
                  weaponId,
                  targetHex: targetNow.position,
                  toHitPenalty: indirectFirePenalty,
                  basis: 'los' as const,
                },
                unitId,
              ),
            );
            if (indirectFireResolution.forwardObserverApplied) {
              events.push(
                createGameEvent(
                  gameId,
                  events.length,
                  GameEventType.IndirectFireForwardObserver,
                  currentState.turn,
                  GamePhase.WeaponAttack,
                  {
                    attackerId: unitId,
                    spotterId: indirectFireResolution.spotterId,
                    weaponId,
                    targetHex: targetNow.position,
                    toHitPenalty: indirectFirePenalty,
                    basis: 'los' as const,
                    penaltyCancelled: 1,
                  },
                  unitId,
                ),
              );
            }
          }
        }

        const die1 = d6Roller();
        const die2 = d6Roller();
        const attackRoll = die1 + die2;
        const jammedOnNaturalTwo =
          attackRoll === 2 && shouldJamOnNaturalTwo(baseWeapon, selectedMode);
        if (jammedOnNaturalTwo) {
          currentState = markWeaponJammed(currentState, unitId, baseWeapon.id);
        }
        const hit =
          !jammedOnNaturalTwo && attackRoll >= environmentAdjustedToHit;

        if (!hit) {
          const spendOnMiss = shouldSpendAmmoAndHeatOnMiss(baseWeapon);
          if (spendOnMiss) {
            currentState = markWeaponFiredForHeat(
              currentState,
              unitId,
              baseWeapon.id,
            );
          }

          // Per `combat-resolution` delta: emit `AttackResolved` even on
          // misses so `AttackDeclared.length === AttackResolved.length`
          // is an end-of-match invariant. Hit-location is omitted on
          // miss (the field is optional on `IAttackResolvedPayload`).
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.AttackResolved,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                attackerId: unitId,
                targetId,
                weaponId,
                roll: attackRoll,
                // Wave 8 PR-K7: `toHitNumber` matches AttackDeclared so the
                // event-log + invariant pairs line up under indirect-fire.
                toHitNumber: environmentAdjustedToHit,
                hit: false,
                heat: spendOnMiss ? shotWeapon.heat : 0,
                attackerArc: firingArc,
              },
              unitId,
            ),
          );
          if (spendOnMiss) {
            currentState = consumeWeaponAmmo({
              currentState,
              events,
              gameId,
              attackerId: unitId,
              weapon: baseWeapon,
              ammoWeaponType,
            });
          }
          continue;
        }

        currentState = markWeaponFiredForHeat(
          currentState,
          unitId,
          baseWeapon.id,
        );
        const targetEcmProtected = currentState.electronicWarfare
          ? getECMProtectedFlag(
              attackerBeforeShot.position,
              attackerBeforeShot.side as string,
              unitId,
              targetBeforeShot.position,
              targetBeforeShot.side as string,
              targetId,
              currentState.electronicWarfare,
            )
          : undefined;
        const attackerStealthActive = isAttackerStealthArmorActive(
          attackerBeforeShot,
          currentState,
        );
        const flightPathEcmAffected =
          targetEcmProtected === true ||
          isFlightPathAffectedByINarcECM(attackerBeforeShot);

        const resolvedShot = resolveSpecialProjectileHit({
          baseWeapon,
          shotWeapon,
          selectedMode,
          d6Roller,
          clusterContext: {
            attackerTeamId: attackerBeforeShot.side as string,
            hasArtemisIV: baseWeapon.hasArtemisIV,
            hasPrototypeArtemisIV: baseWeapon.hasPrototypeArtemisIV,
            hasArtemisV: baseWeapon.hasArtemisV,
            attackerStealthActive,
            flightPathEcmAffected,
            isIndirectFire:
              indirectFireResolution?.permitted === true &&
              indirectFireResolution.isIndirect,
            targetNarcedBy: targetBeforeShot.narcedBy,
            targetINarcedBy: iNarcHomingTeams(targetBeforeShot),
            targetEcmProtected,
            clusterHitterSPA:
              getClusterHitterBonus(attackerBeforeShot.abilities ?? []) > 0,
            sandblasterSPA: hasSPA(
              attackerBeforeShot.abilities ?? [],
              'sandblaster',
            ),
            designatedWeaponType: attackerBeforeShot.designatedWeaponType,
            attackRange: distance,
            incomingAttackArc: firingArc,
            targetWeapons: weaponsByUnit?.get(targetId),
            targetAmmoState: targetBeforeShot.ammoState,
          },
        });

        currentState = applyAMSInterceptionResult({
          currentState,
          events,
          gameId,
          attackerId: unitId,
          targetId,
          incomingWeaponId: weaponId,
          interception: resolvedShot.amsInterception,
        });

        currentState = resolveWeaponHit({
          currentState,
          events,
          gameId,
          unitId,
          targetId,
          weaponId,
          weapon: resolvedShot.weapon,
          ammoWeaponType,
          projectileCount: resolvedShot.projectileCount,
          attackRoll,
          // Wave 8 PR-K7: use the indirect-fire-adjusted to-hit so the
          // AttackResolved.toHitNumber on hits matches AttackDeclared.
          toHitNumber: environmentAdjustedToHit,
          firingArc,
          partialCover: targetPartialCover,
          hullDown: targetBeforeShot.hullDown ?? false,
          d6Roller,
          optionalRules,
          getOrSeedManifest,
          manifestsByUnit,
          weaponsByUnit,
        });
      }
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
