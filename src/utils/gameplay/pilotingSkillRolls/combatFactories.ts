/**
 * Combat-Related PSR Factories
 * Factory functions for PSRs triggered by physical attacks.
 */

import type { IPendingPSR } from '@/types/gameplay';

import {
  CHARGE_HIT_PSR_MODIFIER,
  DFA_HIT_ATTACKER_PSR_MODIFIER,
  DFA_TARGET_PSR_MODIFIER,
} from '../physicalAttacks/constants';
import { PSRTrigger } from './types';

/**
 * Create a pending PSR for being kicked.
 */
export function createKickedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Kicked',
    reasonCode: PSRTrigger.Kicked,
    additionalModifier: 0,
    triggerSource: PSRTrigger.Kicked,
  };
}

/**
 * Create a pending PSR for being charged (target).
 */
export function createChargedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Charged',
    reasonCode: PSRTrigger.Charged,
    additionalModifier: CHARGE_HIT_PSR_MODIFIER,
    triggerSource: PSRTrigger.Charged,
  };
}

/**
 * Create a pending PSR for being hit by DFA (target).
 */
export function createDFATargetPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Hit by DFA',
    reasonCode: PSRTrigger.DFATarget,
    additionalModifier: DFA_TARGET_PSR_MODIFIER,
    triggerSource: PSRTrigger.DFATarget,
  };
}

/**
 * Create a pending PSR for the attacker after executing a DFA.
 *
 * MegaMek queues this as `PilotingRollData(..., 4, "executed death from above")`.
 * The canonical reason bucket stays `DFATarget` for backward-compatible PSR
 * taxonomy, while the triggerSource distinguishes attacker-side DFA fallout.
 */
export function createDFAAttackerPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Executed DFA',
    reasonCode: PSRTrigger.DFATarget,
    additionalModifier: DFA_HIT_ATTACKER_PSR_MODIFIER,
    triggerSource: 'dfa_attacker_hit',
  };
}

/**
 * Create a pending PSR for being pushed.
 */
export function createPushedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Pushed',
    reasonCode: PSRTrigger.Pushed,
    additionalModifier: 0,
    triggerSource: PSRTrigger.Pushed,
  };
}

/**
 * Create a pending PSR for a unit forced along a domino displacement chain.
 *
 * MegaMek queues this as `PilotingRollData(..., 0, "domino effect")`.
 */
export function createDominoEffectPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Domino effect',
    reasonCode: PSRTrigger.DominoEffect,
    additionalModifier: 0,
    triggerSource: PSRTrigger.DominoEffect,
  };
}

/**
 * Create a pending PSR for attacker kick miss.
 */
export function createKickMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Kick missed',
    reasonCode: PSRTrigger.KickMiss,
    additionalModifier: 0,
    triggerSource: PSRTrigger.KickMiss,
  };
}

/**
 * Legacy/local factory for attacker charge miss.
 *
 * Source-backed charge resolution moves the missed charger without queuing a
 * normal PSR; terrain displacement can still trigger its own PSRs separately.
 */
export function createChargeMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Charge missed',
    reasonCode: PSRTrigger.ChargeMiss,
    additionalModifier: 0,
    triggerSource: PSRTrigger.ChargeMiss,
  };
}

/**
 * Create a pending PSR for attacker DFA miss (with +4 modifier).
 */
export function createDFAMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'DFA missed',
    reasonCode: PSRTrigger.DFAMiss,
    additionalModifier: 4,
    triggerSource: PSRTrigger.DFAMiss,
  };
}
