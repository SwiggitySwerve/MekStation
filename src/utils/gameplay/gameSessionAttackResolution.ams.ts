import {
  GamePhase,
  IAttackDeclaredPayload,
  IGameSession,
  ISelectedAMSWeaponMountData,
} from '@/types/gameplay';

import {
  consumeAmmo,
  findAvailableAmmoBin,
  isEnergyWeapon,
} from './ammoTracking';
import { isStreakWeapon, lookupClusterHits } from './clusterWeapons';
import { type DiceRoller } from './diceTypes';
import { calculateFiringArc } from './firingArc';
import {
  createAmmoConsumedEvent,
  createAMSInterceptionEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { isMissileWeapon } from './specialWeaponMechanics';
import { weaponMountCoversTargetArc } from './weaponMountArcs';

const PLAYTEST_3_AMS_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest-3',
  'playtest3',
  'tacops_playtest_3',
]);

function hasPlaytest3AMSRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_AMS_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

function canSelectedAMSReuseWithinWeaponPhase(
  mount: ISelectedAMSWeaponMountData,
  optionalRules: readonly string[] | undefined,
): boolean {
  return mount.amsMultiUse === true || hasPlaytest3AMSRule(optionalRules);
}

function mountBaseId(weaponId: string): string {
  const match = weaponId.match(/^(.+)-(\d+)$/);
  return match ? match[1] : weaponId;
}

function missileRackSize(weaponId: string, weaponName: string): number | null {
  const candidates = [mountBaseId(weaponId), weaponId, weaponName];
  for (const candidate of candidates) {
    const match = candidate.match(/(?:lrm|srm|mrm|atm|mml)[\s-]?(\d+)/i);
    if (!match) continue;
    const rackSize = Number.parseInt(match[1], 10);
    if (Number.isFinite(rackSize) && rackSize > 0) return rackSize;
  }
  return null;
}

function isMissileClusterAttack(weaponId: string, weaponName: string): boolean {
  return (
    isMissileWeapon(mountBaseId(weaponId)) ||
    isMissileWeapon(weaponName) ||
    /\bmml[\s-]?\d+/i.test(`${weaponId} ${weaponName}`)
  );
}

function canSelectedAMSIntercept(input: {
  readonly mount: ISelectedAMSWeaponMountData;
  readonly targetState: IGameSession['currentState']['units'][string];
  readonly incomingArc: ReturnType<typeof calculateFiringArc>;
  readonly optionalRules: readonly string[] | undefined;
}): boolean {
  const { incomingArc, mount, optionalRules, targetState } = input;
  const alreadyFired =
    targetState.weaponsFiredThisTurn?.includes(mount.weaponId) ?? false;
  if (
    alreadyFired &&
    !canSelectedAMSReuseWithinWeaponPhase(mount, optionalRules)
  ) {
    return false;
  }

  if (!weaponMountCoversTargetArc(mount, incomingArc)) {
    return false;
  }

  if (isEnergyWeapon(mount.weaponName)) {
    return true;
  }

  const ammoWeaponType = mount.ammoWeaponType ?? mountBaseId(mount.weaponId);
  return (
    targetState.ammoState !== undefined &&
    findAvailableAmmoBin(targetState.ammoState, ammoWeaponType) !== null
  );
}

function diceRollToArray(roll: ReturnType<DiceRoller>): readonly number[] {
  return [...roll.dice];
}

export function resolveSelectedAMSCluster(input: {
  readonly session: IGameSession;
  readonly payload: IAttackDeclaredPayload;
  readonly weaponId: string;
  readonly weaponName: string;
  readonly damage: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly incomingArc: ReturnType<typeof calculateFiringArc>;
  readonly diceRoller: DiceRoller;
}): { readonly session: IGameSession; readonly damage: number } | undefined {
  const selectedAMSWeaponId =
    input.payload.selectedAMSWeaponIds?.[input.weaponId];
  const selectedMount = input.payload.selectedAMSWeaponMounts?.[input.weaponId];
  if (
    selectedAMSWeaponId === undefined ||
    selectedMount === undefined ||
    selectedMount.weaponId !== selectedAMSWeaponId
  ) {
    return undefined;
  }

  const targetState = input.session.currentState.units[input.targetId];
  if (
    !targetState ||
    !isMissileClusterAttack(input.weaponId, input.weaponName) ||
    !canSelectedAMSIntercept({
      mount: selectedMount,
      targetState,
      incomingArc: input.incomingArc,
      optionalRules: input.session.config.optionalRules,
    })
  ) {
    return undefined;
  }

  const rackSize = missileRackSize(input.weaponId, input.weaponName);
  if (rackSize === null) return undefined;

  const streakClusterRoll =
    isStreakWeapon(mountBaseId(input.weaponId)) ||
    /streak/i.test(input.weaponName);
  const clusterDice = streakClusterRoll
    ? ([11] as const)
    : diceRollToArray(input.diceRoller());
  const clusterRoll = clusterDice.reduce((sum, die) => sum + die, 0);
  const incomingProjectiles = streakClusterRoll
    ? rackSize
    : lookupClusterHits(clusterRoll, rackSize);
  const clusterModifier = -4;
  const modifiedClusterRoll = Math.max(2, clusterRoll + clusterModifier);
  const projectilesRemaining = lookupClusterHits(modifiedClusterRoll, rackSize);
  const ammoConsumed = isEnergyWeapon(selectedMount.weaponName) ? 0 : 1;
  let currentSession = input.session;
  let ammoBinId: string | undefined;
  let ammoRemaining: number | undefined;
  const ammoWeaponType =
    selectedMount.ammoWeaponType ?? mountBaseId(selectedMount.weaponId);

  if (ammoConsumed > 0) {
    const ammoResult = targetState.ammoState
      ? consumeAmmo(targetState.ammoState, input.targetId, ammoWeaponType)
      : null;
    if (!ammoResult) return undefined;

    ammoBinId = ammoResult.event.binId;
    ammoRemaining = ammoResult.event.roundsRemaining;
    currentSession = appendEvent(
      currentSession,
      createAmmoConsumedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        input.targetId,
        ammoResult.event.binId,
        ammoResult.event.weaponType,
        ammoResult.event.roundsConsumed,
        ammoResult.event.roundsRemaining,
      ),
    );
  }

  currentSession = appendEvent(
    currentSession,
    createAMSInterceptionEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      {
        defenderId: input.targetId,
        targetId: input.targetId,
        attackerId: input.attackerId,
        incomingWeaponId: input.weaponId,
        amsWeaponId: selectedMount.weaponId,
        resolution: 'cluster-table',
        incomingProjectiles,
        projectilesIntercepted: Math.max(
          0,
          incomingProjectiles - projectilesRemaining,
        ),
        projectilesRemaining,
        ammoConsumed,
        roll: clusterDice,
        clusterRoll,
        clusterModifier,
        modifiedClusterRoll,
        ...(ammoBinId !== undefined ? { ammoBinId } : {}),
        ...(ammoRemaining !== undefined ? { ammoRemaining } : {}),
      },
    ),
  );

  return {
    session: currentSession,
    damage: (input.damage / rackSize) * projectilesRemaining,
  };
}
