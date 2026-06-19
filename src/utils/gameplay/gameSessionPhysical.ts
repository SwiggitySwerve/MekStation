/**
 * Session-level physical attack wiring.
 *
 * Bridges the standalone `physicalAttacks/` module (to-hit, damage,
 * restrictions) into the event-sourced session: declarations emit
 * `PhysicalAttackDeclared`; resolution emits `PhysicalAttackResolved`,
 * `DamageApplied` (via `resolveDamagePipeline`), and `PSRTriggered` for
 * post-attack PSR triggers (target on hit; attacker on charge / kick /
 * DFA miss).
 *
 * @spec openspec/changes/implement-physical-attack-phase/tasks.md
 */

import { IGameSession, IHexGrid } from '@/types/gameplay';

import type { IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

import { type DiceRoller } from './diceTypes';
import {
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { buildRestrictionEventReason } from './gameSessionPhysicalHelpers';
import { buildPhysicalAttackInput } from './gameSessionPhysicalInput';
import {
  physicalAttackDeclarationsForCurrentTurn,
  resolvePhysicalAttackDeclaration,
} from './gameSessionPhysicalResolution';
import { selectedINarcPodForBrushOff } from './gameSessionPhysicalSupport';
import { roll2d6 as rollDice } from './hitLocation';
import {
  calculatePhysicalToHit,
  canCharge,
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canDFA,
  canGrapplePhysical,
  canJumpJetAttackPhysical,
  canKick,
  canMeleeWeapon,
  canPunch,
  canPush,
  canThrashPhysical,
  canTripPhysical,
  getAllowedPhysicalAttackCount,
  type IPhysicalAttackInput,
  type IPhysicalAttackRestriction,
  isSupportedPhysicalAttackType,
  physicalAttackDeclarationsForTurn,
  physicalAttackLimbForDeclaration,
  selectPhysicalHitTable,
  type PhysicalAttackType,
} from './physicalAttacks';

type PhysicalAttackRestrictionResolver = (
  input: IPhysicalAttackInput,
) => IPhysicalAttackRestriction;

const STANDARD_PHYSICAL_RESTRICTION_RESOLVERS: Partial<
  Record<PhysicalAttackType, PhysicalAttackRestrictionResolver>
> = {
  punch: canPunch,
  kick: canKick,
  charge: canCharge,
  dfa: canDFA,
  push: canPush,
  trip: canTripPhysical,
  thrash: canThrashPhysical,
  'jump-jet-attack': canJumpJetAttackPhysical,
  'brush-off': canBrushOffPhysical,
  grapple: canGrapplePhysical,
  'break-grapple': canBreakGrapplePhysical,
};

const DECLARED_MELEE_WEAPON_RESTRICTION_TYPES = new Set<PhysicalAttackType>([
  'hatchet',
  'sword',
  'mace',
  'lance',
  'retractable-blade',
]);

function restrictionForPhysicalAttack(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const resolver = STANDARD_PHYSICAL_RESTRICTION_RESOLVERS[input.attackType];
  if (resolver) {
    return resolver(input);
  }
  if (DECLARED_MELEE_WEAPON_RESTRICTION_TYPES.has(input.attackType)) {
    return canMeleeWeapon(input);
  }
  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 2: declare a physical
 * attack. Validates restrictions; on rejection emits `AttackInvalid`
 * with the restriction reason. On accept emits
 * `PhysicalAttackDeclared`.
 */
export { type IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

export function declarePhysicalAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackType | string,
  context: IPhysicalAttackContext,
): IGameSession {
  const attackerState = session.currentState.units[attackerId];
  if (!attackerState || attackerState.destroyed) {
    return session;
  }
  const targetState = session.currentState.units[targetId];
  if (!isSupportedPhysicalAttackType(attackType)) {
    return session;
  }

  const declaredLimb = physicalAttackLimbForDeclaration(attackType, {
    limb: context.limb,
    arm: context.arm,
  });
  const priorPhysicalDeclarations = physicalAttackDeclarationsForTurn(
    session.events,
    session.currentState.turn,
    attackerId,
  );
  const allowedPhysicalAttacks = getAllowedPhysicalAttackCount(
    context.pilotAbilities ?? attackerState.abilities,
  );
  if (priorPhysicalDeclarations.length >= allowedPhysicalAttacks) {
    return appendEvent(
      session,
      createPhysicalAttackResolvedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        attackerId,
        targetId,
        attackType,
        0,
        Infinity,
        false,
        undefined,
        'PhysicalAttackLimitReached',
      ),
    );
  }

  const input = buildPhysicalAttackInput({
    session,
    attackerId,
    targetId,
    attackType,
    context,
    attackerState,
    targetState,
    limb: declaredLimb,
    deriveLimbsUsedFromEvents: true,
  });

  // Per task 3.1 / 3.2 / 3.3 / 3.4 / 3.5 / 3.6 / 3.7: restrictions run
  // per attack type. Charge / DFA / melee gate on the same helpers used
  // by the to-hit layer.
  const restriction = restrictionForPhysicalAttack(input);

  if (!restriction.allowed) {
    // Per spec task 3.8: rejections surface as a
    // `PhysicalAttackResolved { hit:false, roll:0, toHitNumber:Infinity }`
    // event whose `location` field carries the reason code so replay +
    // UI can distinguish rejections from rolled misses. A future change
    // can promote this to a dedicated `PhysicalAttackInvalid` event.
    const sequence = session.events.length;
    const { turn } = session.currentState;
    return appendEvent(
      session,
      createPhysicalAttackResolvedEvent(
        session.id,
        sequence,
        turn,
        attackerId,
        targetId,
        attackType,
        0,
        Infinity,
        false,
        undefined,
        buildRestrictionEventReason(restriction),
      ),
    );
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  // Pre-declaration to-hit calc — the resolver re-rolls, but the
  // declared event carries the calculated TN so UI can show the
  // forecast modal before resolution.
  const declaredTN = calculatePhysicalToHit(input).finalToHit;
  const hitTable = selectPhysicalHitTable(input);

  return appendEvent(
    session,
    createPhysicalAttackDeclaredEvent(
      session.id,
      sequence,
      turn,
      attackerId,
      targetId,
      attackType,
      declaredTN,
      declaredLimb,
      hitTable,
      context.twoHandedZweihander,
      selectedINarcPodForBrushOff(attackType, context, targetState),
      context.blockerStepOutDecision,
    ),
  );
}

/**
 * Resolve all PhysicalAttackDeclared events for the current turn.
 * Each declaration runs through `resolvePhysicalAttack` (to-hit, hit
 * location, damage). On hit emits `PhysicalAttackResolved` +
 * `DamageApplied` chain via the same `resolveDamagePipeline` used by
 * weapon attacks; queues `PhysicalAttackTarget` PSR for the target.
 * On miss for kick / charge / DFA queues an attacker PSR
 * (`KickMiss` / `MissedCharge` / `MissedDFA`).
 *
 * `contextByAttacker` carries the per-unit static data (tonnage,
 * piloting skill, etc.) — callers (InteractiveSession, GameEngine)
 * supply it from catalog data.
 */
export function resolveAllPhysicalAttacks(
  session: IGameSession,
  contextByAttacker: Map<string, IPhysicalAttackContext>,
  diceRoller: DiceRoller = rollDice,
  grid?: IHexGrid,
): IGameSession {
  const { turn } = session.currentState;
  const declarations = physicalAttackDeclarationsForCurrentTurn(session);

  let currentSession = session;
  for (const declaration of declarations) {
    currentSession = resolvePhysicalAttackDeclaration({
      session: currentSession,
      declaration,
      contextByAttacker,
      diceRoller,
      grid,
      turn,
    });
  }

  return currentSession;
}
