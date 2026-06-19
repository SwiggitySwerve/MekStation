import { type GameIntentType } from '@/types/gameplay';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { remappedMekStationDeviationSourceRef as mekstationDeviationSourceRef } from './CombatRemappedSourceReference';
import { remapMekStationSourceRefs } from './CombatSourceRefAnchorRemap';

interface ICombatP2PActionSupportEntry extends ICombatFeatureSupportEntry {
  readonly layer: 'p2p-translation';
}

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatP2PActionSupportEntry {
  return sourceRefs
    ? {
        id,
        layer: 'p2p-translation',
        level: 'integrated',
        evidence,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, layer: 'p2p-translation', level: 'integrated', evidence };
}

const P2P_DECLARE_MOVEMENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes declareMovement into MovementDeclared and MovementLocked host events after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L175-L249',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_STAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes stand into a host-owned stand command after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L177-L268',
  ),
  mekstationDeviationSourceRef(
    'MekStation hostIntentRouter applies the translated stand command through the host adapter.',
    'src/lib/p2p/hostIntentRouter.ts',
    'L157-L163',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_GO_PRONE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes goProne into a host-owned goProne command after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L179-L292',
  ),
  mekstationDeviationSourceRef(
    'MekStation hostIntentRouter applies the translated goProne command through the host adapter.',
    'src/lib/p2p/hostIntentRouter.ts',
    'L164-L170',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_ACTIVATE_MOVEMENT_ENHANCEMENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes activateMovementEnhancement into a host-owned booster activation command after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L181-L320',
  ),
  mekstationDeviationSourceRef(
    'MekStation hostIntentRouter applies the translated activateMovementEnhancement command through the host adapter.',
    'src/lib/p2p/hostIntentRouter.ts',
    'L171-L180',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_TORSO_TWIST_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents validates torsoTwist legality and emits FacingChanged with secondaryFacing.',
    'src/lib/p2p/intentTranslation.ts',
    'L183-L370',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_DECLARE_ATTACK_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes declareAttack into AttackDeclared and AttackLocked host events after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L185-L411',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_DECLARE_PHYSICAL_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes declarePhysical into PhysicalAttackDeclared after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L187-L444',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_REQUEST_SPOT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes requestSpot into SpottingDeclared after phase and ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L220-L470',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_EJECT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes eject into UnitEjected after ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L189-L468',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_WITHDRAW_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes withdraw into WithdrawalDeclared after ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L191-L493',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_END_PHASE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes endPhase into a host advancePhase marker event after phase and side-ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L193-L525',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_CONFIRM_HEAT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes confirmHeat into a Heat-phase host advancePhase marker when the peer owns a combat side.',
    'src/lib/p2p/intentTranslation.ts',
    'L197-L537',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const P2P_CONCEDE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation translateIntentToEvents routes concede into a host-owned concede command after side-ownership validation.',
    'src/lib/p2p/intentTranslation.ts',
    'L195-L564',
  ),
  mekstationDeviationSourceRef(
    'MekStation hostIntentRouter applies the translated concede command through the host adapter.',
    'src/lib/p2p/hostIntentRouter.ts',
    'L150-L156',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const P2P_INTENT_TRANSLATION_SUPPORT = {
  declareMovement: integrated(
    'declareMovement',
    'translateIntentToEvents emits MovementDeclared and MovementLocked',
    P2P_DECLARE_MOVEMENT_SOURCE_REFS,
  ),
  stand: integrated(
    'stand',
    'translateIntentToEvents returns a stand host command and hostIntentRouter routes it to InteractiveSession.attemptStandUp',
    P2P_STAND_SOURCE_REFS,
  ),
  goProne: integrated(
    'goProne',
    'translateIntentToEvents returns a goProne host command and hostIntentRouter routes it to InteractiveSession.goProne',
    P2P_GO_PRONE_SOURCE_REFS,
  ),
  activateMovementEnhancement: integrated(
    'activateMovementEnhancement',
    'translateIntentToEvents returns an activateMovementEnhancement host command and hostIntentRouter routes it to InteractiveSession.activateMovementEnhancement',
    P2P_ACTIVATE_MOVEMENT_ENHANCEMENT_SOURCE_REFS,
  ),
  torsoTwist: integrated(
    'torsoTwist',
    'translateIntentToEvents validates torso-twist ownership/phase/legality and emits FacingChanged with secondaryFacing',
    P2P_TORSO_TWIST_SOURCE_REFS,
  ),
  declareAttack: integrated(
    'declareAttack',
    'translateIntentToEvents emits AttackDeclared and AttackLocked',
    P2P_DECLARE_ATTACK_SOURCE_REFS,
  ),
  declarePhysical: integrated(
    'declarePhysical',
    'translateIntentToEvents emits PhysicalAttackDeclared',
    P2P_DECLARE_PHYSICAL_SOURCE_REFS,
  ),
  requestSpot: integrated(
    'requestSpot',
    'translateIntentToEvents emits SpottingDeclared',
    P2P_REQUEST_SPOT_SOURCE_REFS,
  ),
  endPhase: integrated(
    'endPhase',
    'translateIntentToEvents emits a PhaseChanged marker for host advancePhase routing',
    P2P_END_PHASE_SOURCE_REFS,
  ),
  confirmHeat: integrated(
    'confirmHeat',
    'translateIntentToEvents emits a Heat-phase PhaseChanged marker for host advancePhase routing',
    P2P_CONFIRM_HEAT_SOURCE_REFS,
  ),
  eject: integrated(
    'eject',
    'translateIntentToEvents emits UnitEjected',
    P2P_EJECT_SOURCE_REFS,
  ),
  withdraw: integrated(
    'withdraw',
    'translateIntentToEvents emits WithdrawalDeclared',
    P2P_WITHDRAW_SOURCE_REFS,
  ),
  concede: integrated(
    'concede',
    'translateIntentToEvents returns a concede host command and hostIntentRouter routes it to InteractiveSession.concede',
    P2P_CONCEDE_SOURCE_REFS,
  ),
} satisfies Record<GameIntentType, ICombatP2PActionSupportEntry>;
