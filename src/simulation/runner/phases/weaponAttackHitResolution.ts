import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';
import type { ILOSDamageableCoverProvider } from '@/utils/gameplay/lineOfSight';

import {
  IGameEvent,
  IGameState,
  IHexGrid,
  type IAttackResolvedPayload,
} from '@/types/gameplay';
import {
  checkTACTrigger,
  processTAC,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import { determineHitLocation } from '@/utils/gameplay/hitLocation';

import type { IWeapon } from '../../ai/types';

import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { appendAttackResolvedEvent } from './utils';
import { applyCritAmmoExplosions } from './weaponAttackAmmoExplosions';
import { emitCritEvents, toFiringArc } from './weaponAttackHelpers';
import {
  DestructionCause,
  applyDamageThresholdPSR,
  consumeWeaponAmmo,
  emitDamageChainEvents,
  emitHeadHitPilotEvent,
  emitNeuralFeedbackPilotEvent,
  emitUnitDestroyedEvent,
} from './weaponAttackHitResolution.helpers';
import {
  resolveWeaponHitEarlyReturn,
  resolveZeroProjectileWeaponHit,
} from './weaponAttackHitResolutionEarlyReturns';
import {
  applyEquipmentCriticalEventsToState,
  applyHitLocationEdgePoints,
  persistDamageManifest,
  resolveWeaponHitDamage,
} from './weaponAttackHitResolutionState';
import {
  applyCriticalPSRTriggers,
  applyLegDamagePSR,
} from './weaponAttackPsrTriggers';

/**
 * Resolve a single confirmed weapon hit against a target unit: roll the
 * hit location, apply damage (with crit dispatch), emit the full event
 * chain (`AttackResolved` → `AmmoConsumed` → `DamageApplied` /
 * `LocationDestroyed` / `TransferDamage` → crit events → `AmmoExplosion`
 * → `PilotHit` → `UnitDestroyed`), and queue any 20+-damage piloting
 * skill roll. The cohesive sub-steps (ammo consumption, damage-chain
 * emission, pilot-hit, kill detection, PSR queueing) are delegated to
 * `weaponAttackHitResolution.helpers.ts`. Returns the updated game state.
 */
export function resolveWeaponHit(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  targetId: string;
  weaponId: string;
  weapon: IWeapon;
  ammoWeaponType?: string;
  projectileCount?: number;
  attackRoll: number;
  toHitNumber: number;
  firingArc: 'front' | 'left' | 'right' | 'rear';
  /**
   * Whether the target is in partial cover. When true, a hit whose
   * hit-location roll lands on a leg is converted to a miss (Total Warfare
   * p. 53) — the cover absorbs the shot.
   */
  partialCover: boolean;
  damageableCoverProvider?: ILOSDamageableCoverProvider;
  grid?: IHexGrid;
  /**
   * Whether the target is hull-down. Front-arc leg hit-location rolls are
   * redirected before the partial-cover leg-miss conversion.
   */
  hullDown?: boolean;
  d6Roller: () => number;
  optionalRules?: readonly string[];
  getOrSeedManifest: (id: string) => CriticalSlotManifest;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
}): IGameState {
  let { currentState } = options;
  const {
    attackRoll,
    d6Roller,
    events,
    firingArc,
    gameId,
    grid,
    getOrSeedManifest,
    manifestsByUnit,
    partialCover,
    damageableCoverProvider,
    hullDown,
    optionalRules,
    ammoWeaponType,
    projectileCount,
    targetId,
    toHitNumber,
    unitId,
    weapon,
    weaponId,
    weaponsByUnit,
  } = options;

  if (projectileCount === 0) {
    return resolveZeroProjectileWeaponHit({
      currentState,
      events,
      gameId,
      unitId,
      targetId,
      weaponId,
      weapon,
      ammoWeaponType,
      projectileCount,
      attackRoll,
      toHitNumber,
      firingArc,
    });
  }

  const hitLocationResult = determineHitLocation(
    toFiringArc(firingArc),
    d6Roller,
    {
      hullDown: hullDown ?? false,
      edge: {
        edgePointsRemaining: currentState.units[targetId]?.edgePointsRemaining,
        pilotAbilities: currentState.units[targetId]?.abilities ?? [],
        turn: currentState.turn,
        unitId: targetId,
      },
    },
  );
  const location = hitLocationResult.location;
  currentState = applyHitLocationEdgePoints(
    currentState,
    targetId,
    hitLocationResult.edgePointsRemaining,
  );

  const earlyResolution = resolveWeaponHitEarlyReturn({
    currentState,
    events,
    gameId,
    unitId,
    targetId,
    weaponId,
    weapon,
    ammoWeaponType,
    projectileCount,
    attackRoll,
    toHitNumber,
    firingArc,
    location,
    partialCover,
    damageableCoverProvider,
    grid,
    d6Roller,
    optionalRules,
  });
  if (earlyResolution.resolved) return earlyResolution.currentState;
  currentState = earlyResolution.currentState;

  const { damage, lowProfileCriticalHitModifier } = resolveWeaponHitDamage({
    baseDamage: weapon.damage,
    isINarcExplosiveAmmo: earlyResolution.isINarcExplosiveAmmo,
    location,
    target: currentState.units[targetId],
    attackRoll,
    toHitNumber,
    projectileCount,
  });

  const targetBefore = currentState.units[targetId];
  const damageState = buildDamageState(targetBefore);

  // Per `add-combat-fidelity-suite` Phase 3: thread a
  // `criticalContext` into the damage state so `resolveDamage`
  // dispatches `resolveCriticalHits` per location where the
  // 2d6 trigger crosses 8+. The context bundles the resolver's
  // four required parameters (`unitId` / `manifest` /
  // `componentDamage` / `armorType`) so callers don't have to
  // thread four positional arguments. `armorType` is left
  // undefined for the runner today — the synthetic units don't
  // carry construction armor data; the resolver falls back to
  // the standard armor crit ladder.
  const targetManifest = getOrSeedManifest(targetId);
  const targetComponentDamage =
    targetBefore.componentDamage ?? buildDefaultComponentDamageState();
  const damageStateWithCtx = {
    ...damageState,
    turn: currentState.turn,
    criticalContext: {
      unitId: targetId,
      manifest: targetManifest,
      componentDamage: targetComponentDamage,
      criticalHitModifier: lowProfileCriticalHitModifier,
      optionalRules,
    },
  };
  const damageResult = resolveDamage(
    damageStateWithCtx,
    location,
    damage,
    d6Roller,
  );
  let manifestAfterCriticals = damageResult.manifest ?? targetManifest;
  let componentDamageAfterCriticals =
    damageResult.componentDamage ?? targetComponentDamage;
  const criticalEventsAfterDamage = [...(damageResult.criticalEvents ?? [])];
  let damageStateAfterCriticals = damageResult.state;

  const tacLocation = checkTACTrigger(hitLocationResult.roll.total, firingArc);
  if (tacLocation) {
    const tacResult = processTAC(
      targetId,
      tacLocation,
      manifestAfterCriticals,
      componentDamageAfterCriticals,
      d6Roller,
      undefined,
      {
        pilotAbilities: targetBefore.abilities ?? [],
        edgePointsRemaining: damageStateAfterCriticals.edgePointsRemaining,
        turn: currentState.turn,
        unitId: targetId,
        optionalRules,
      },
    );
    manifestAfterCriticals = tacResult.updatedManifest;
    componentDamageAfterCriticals = tacResult.updatedComponentDamage;
    criticalEventsAfterDamage.push(...tacResult.events);
    if (tacResult.edgePointsRemaining !== undefined) {
      damageStateAfterCriticals = {
        ...damageStateAfterCriticals,
        edgePointsRemaining: tacResult.edgePointsRemaining,
      };
    }
  }

  const damageResultForCriticals = {
    ...damageResult,
    state: damageStateAfterCriticals,
    manifest: manifestAfterCriticals,
    componentDamage: componentDamageAfterCriticals,
    criticalEvents:
      criticalEventsAfterDamage.length > 0
        ? criticalEventsAfterDamage
        : undefined,
  };

  // Persist the post-resolution manifest in the side table so the
  // next shot at this target sees already-destroyed slots and the
  // selection roll never re-rolls a destroyed slot.
  persistDamageManifest({
    manifestsByUnit,
    targetId,
    manifest: damageResultForCriticals.manifest,
  });

  currentState = applyDamageResultToState(
    currentState,
    targetId,
    damageResultForCriticals.state,
    damageResultForCriticals.result,
    damageResultForCriticals.componentDamage,
  );
  currentState = applyEquipmentCriticalEventsToState(
    currentState,
    targetId,
    damageResultForCriticals.criticalEvents,
  );
  const targetAfter = currentState.units[targetId];

  const prevDamage = targetAfter.damageThisPhase ?? 0;
  currentState = {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...targetAfter,
        damageThisPhase: prevDamage + damage,
      },
    },
  };

  // Per `combat-resolution` delta: emit `AttackResolved` AFTER the
  // roll resolves. Hit-location is included only on hits per the
  // discriminated-union contract.
  appendWeaponHitResolvedEvent({
    events,
    gameId,
    turn: currentState.turn,
    unitId,
    targetId,
    weaponId,
    attackRoll,
    toHitNumber,
    location,
    damage,
    heat: weapon.heat,
    projectileCount,
    firingArc,
    hitLocationResult,
  });

  // Decrement the firing weapon's ammo bin and emit `AmmoConsumed`
  // (non-energy weapons only). See `consumeWeaponAmmo`.
  currentState = consumeWeaponAmmo({
    currentState,
    events,
    gameId,
    attackerId: unitId,
    weapon,
    ammoWeaponType,
  });

  // Walk the ordered `locationDamages` chain and emit `DamageApplied` →
  // `LocationDestroyed` → `TransferDamage`. The side-torso → arm cascade
  // is detected off the pre/post-state `destroyedLocations` diff.
  const preDestroyedSet = new Set<string>(damageState.destroyedLocations);
  const newlyDestroyed =
    damageResultForCriticals.state.destroyedLocations.filter(
      (loc) => !preDestroyedSet.has(loc),
    );
  emitDamageChainEvents({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    damageResult: damageResultForCriticals,
    newlyDestroyed,
  });

  // Per `add-combat-fidelity-suite` Phase 3: emit the crit chain
  // produced by `resolveCriticalHits` (via `resolveDamage`). Causal
  // ordering: AFTER the full damage chain (DamageApplied →
  // LocationDestroyed → TransferDamage) and BEFORE the `UnitDestroyed`
  // event emitted below.
  let critUnitDestroyed = false;
  let critDestructionCause: DestructionCause | undefined = undefined;
  if (damageResultForCriticals.criticalEvents) {
    const emitted = emitCritEvents({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId,
      critEvents: damageResultForCriticals.criticalEvents,
      targetAlreadyDestroyed: targetBefore.destroyed,
      targetPilotingSkill: targetBefore.piloting,
    });
    critUnitDestroyed = emitted.unitDestroyed;
    critDestructionCause = emitted.destructionCause;
  }

  // Per `add-combat-fidelity-suite` Phase 4 (`ammo-explosion-system`
  // delta): when the resolver flagged an ammo slot as destroyed, emit
  // `AmmoExplosion` and cascade the explosion damage through the
  // canonical transfer chain. May itself destroy the unit.
  const ammoExplosionResult = applyCritAmmoExplosions({
    currentState,
    events,
    gameId,
    unitId,
    targetId,
    damageResult: damageResultForCriticals,
    d6Roller,
    weaponsByUnit,
    critUnitDestroyed,
    critDestructionCause,
  });
  currentState = ammoExplosionResult.currentState;
  critUnitDestroyed = ammoExplosionResult.critUnitDestroyed;
  critDestructionCause = ammoExplosionResult.critDestructionCause;

  currentState = applyCriticalPSRTriggers(
    currentState,
    damageResultForCriticals.criticalEvents,
  );
  currentState = applyLegDamagePSR({
    currentState,
    events,
    gameId,
    targetId,
    damageResult: damageResultForCriticals,
  });

  // Emit `PilotHit` for raw head-hit wounds (suppressed when a
  // cockpit-crit already emitted one).
  emitHeadHitPilotEvent({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    damageResult: damageResultForCriticals,
  });

  emitNeuralFeedbackPilotEvent({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    damageResult: damageResultForCriticals,
  });

  // Emit `UnitDestroyed` once if the shot killed the target, sourcing
  // the cause from crit destruction first, then raw damage.
  emitUnitDestroyedEvent({
    events,
    gameId,
    turn: currentState.turn,
    attackerId: unitId,
    targetId,
    targetWasDestroyed: targetBefore.destroyed,
    targetIsDestroyed: currentState.units[targetId].destroyed,
    damageResult: damageResultForCriticals,
    critUnitDestroyed,
    critDestructionCause,
  });

  // Queue a 20+-damage piloting skill roll on the surviving target.
  currentState = applyDamageThresholdPSR(currentState, targetId);

  return currentState;
}

type WeaponHitLocationResult = ReturnType<typeof determineHitLocation>;

interface IAppendWeaponHitResolvedEventInput {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly unitId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly attackRoll: number;
  readonly toHitNumber: number;
  readonly location: string;
  readonly damage: number;
  readonly heat: number;
  readonly projectileCount: number | undefined;
  readonly firingArc: 'front' | 'left' | 'right' | 'rear';
  readonly hitLocationResult: WeaponHitLocationResult;
}

function appendWeaponHitResolvedEvent(
  options: IAppendWeaponHitResolvedEventInput,
): void {
  appendAttackResolvedEvent({
    events: options.events,
    gameId: options.gameId,
    turn: options.turn,
    payload: buildWeaponHitResolvedPayload(options),
    actorId: options.unitId,
  });
}

function buildWeaponHitResolvedPayload(
  options: IAppendWeaponHitResolvedEventInput,
): IAttackResolvedPayload {
  return {
    attackerId: options.unitId,
    targetId: options.targetId,
    weaponId: options.weaponId,
    roll: options.attackRoll,
    toHitNumber: options.toHitNumber,
    hit: true,
    location: options.location,
    damage: options.damage,
    heat: options.heat,
    attackerArc: options.firingArc,
    ...optionalAttackResolvedField('projectileCount', options.projectileCount),
    ...buildWeaponHitEdgePayload(options.hitLocationResult),
  };
}

function buildWeaponHitEdgePayload(
  hitLocationResult: WeaponHitLocationResult,
): Partial<IAttackResolvedPayload> {
  const edgeSupersededRoll = hitLocationResult.supersededRoll
    ? hitLocationResult.supersededRoll.total
    : undefined;
  return {
    ...optionalAttackResolvedField('edgeReroll', hitLocationResult.edgeReroll),
    ...optionalAttackResolvedField(
      'edgeSuperseded',
      hitLocationResult.edgeSuperseded,
    ),
    ...optionalAttackResolvedField(
      'edgeTrigger',
      hitLocationResult.edgeTrigger,
    ),
    ...optionalAttackResolvedField(
      'edgePointsRemaining',
      hitLocationResult.edgePointsRemaining,
    ),
    ...optionalAttackResolvedField(
      'edgeSupersededLocation',
      hitLocationResult.supersededLocation,
    ),
    ...optionalAttackResolvedField('edgeSupersededRoll', edgeSupersededRoll),
  };
}

function optionalAttackResolvedField<K extends keyof IAttackResolvedPayload>(
  key: K,
  value: IAttackResolvedPayload[K] | undefined,
): Partial<IAttackResolvedPayload> {
  if (value === undefined) return {};
  return { [key]: value } as Pick<IAttackResolvedPayload, K>;
}
