import type { GameIntentType } from '@/types/gameplay';

import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

interface ICombatP2PActionSupportEntry extends ICombatFeatureSupportEntry {
  readonly layer: 'p2p-translation';
}

function integrated(
  id: string,
  evidence: string,
): ICombatP2PActionSupportEntry {
  return { id, layer: 'p2p-translation', level: 'integrated', evidence };
}

export const P2P_INTENT_TRANSLATION_SUPPORT = {
  declareMovement: integrated(
    'declareMovement',
    'translateIntentToEvents emits MovementDeclared and MovementLocked',
  ),
  stand: integrated(
    'stand',
    'translateIntentToEvents returns a stand host command and hostIntentRouter routes it to InteractiveSession.attemptStandUp',
  ),
  goProne: integrated(
    'goProne',
    'translateIntentToEvents returns a goProne host command and hostIntentRouter routes it to InteractiveSession.goProne',
  ),
  activateMovementEnhancement: integrated(
    'activateMovementEnhancement',
    'translateIntentToEvents returns an activateMovementEnhancement host command and hostIntentRouter routes it to InteractiveSession.activateMovementEnhancement',
  ),
  declareAttack: integrated(
    'declareAttack',
    'translateIntentToEvents emits AttackDeclared and AttackLocked',
  ),
  declarePhysical: integrated(
    'declarePhysical',
    'translateIntentToEvents emits PhysicalAttackDeclared',
  ),
  endPhase: integrated(
    'endPhase',
    'translateIntentToEvents emits a PhaseChanged marker for host advancePhase routing',
  ),
  confirmHeat: integrated(
    'confirmHeat',
    'translateIntentToEvents emits a Heat-phase PhaseChanged marker for host advancePhase routing',
  ),
  eject: integrated('eject', 'translateIntentToEvents emits UnitEjected'),
  withdraw: integrated(
    'withdraw',
    'translateIntentToEvents emits WithdrawalDeclared',
  ),
  concede: integrated(
    'concede',
    'translateIntentToEvents returns a concede host command and hostIntentRouter routes it to InteractiveSession.concede',
  ),
} satisfies Record<GameIntentType, ICombatP2PActionSupportEntry>;
