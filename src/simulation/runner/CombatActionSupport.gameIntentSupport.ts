import type { GameIntentType } from '@/types/gameplay';
import type { IIntentPayload } from '@/types/multiplayer/Protocol';

import type { ICombatActionSupportEntry } from './CombatActionSupport.types';

import { integrated } from './CombatActionSupport.entries';
import { MEKSTATION_GAME_INTENT_SOURCE_REFS } from './CombatActionSupport.gameIntentSourceRefs';
import {
  MEGAMEK_GO_PRONE_SOURCE_REFS,
  MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
} from './CombatActionSupport.movementSourceRefs';
import { MEGAMEK_TORSO_TWIST_SOURCE_REFS } from './CombatMovementSourceRefs';
import { MEGAMEK_REQUEST_SPOT_SOURCE_REFS } from './CombatSpottingSourceRefs';

export const GAME_INTENT_TO_WIRE_KIND = {
  declareMovement: 'Move',
  stand: 'Stand',
  goProne: 'GoProne',
  activateMovementEnhancement: 'ActivateMovementEnhancement',
  torsoTwist: 'TorsoTwist',
  declareAttack: 'Attack',
  declarePhysical: 'Physical',
  requestSpot: 'RequestSpot',
  confirmHeat: 'AdvancePhase',
  endPhase: 'AdvancePhase',
  eject: 'Eject',
  withdraw: 'Withdraw',
  concede: 'Concede',
} as const satisfies Record<GameIntentType, IIntentPayload['kind']>;

export const GAME_INTENT_ACTION_SUPPORT = {
  declareMovement: integrated(
    'declareMovement',
    'game-intent',
    'toServerIntent maps declareMovement to Move',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.declareMovement,
  ),
  stand: integrated(
    'stand',
    'game-intent',
    'toServerIntent maps stand to Stand',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.stand,
  ),
  goProne: integrated(
    'goProne',
    'game-intent',
    'toServerIntent maps goProne to GoProne',
    [
      ...MEKSTATION_GAME_INTENT_SOURCE_REFS.goProne,
      ...MEGAMEK_GO_PRONE_SOURCE_REFS,
    ],
  ),
  activateMovementEnhancement: integrated(
    'activateMovementEnhancement',
    'game-intent',
    'toServerIntent maps activateMovementEnhancement to ActivateMovementEnhancement',
    [
      ...MEKSTATION_GAME_INTENT_SOURCE_REFS.activateMovementEnhancement,
      ...MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
    ],
  ),
  torsoTwist: integrated(
    'torsoTwist',
    'game-intent',
    'toServerIntent maps torsoTwist to TorsoTwist with normalized secondaryFacing',
    [
      ...MEKSTATION_GAME_INTENT_SOURCE_REFS.torsoTwist,
      ...MEGAMEK_TORSO_TWIST_SOURCE_REFS,
    ],
  ),
  declareAttack: integrated(
    'declareAttack',
    'game-intent',
    'toServerIntent maps declareAttack to Attack',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.declareAttack,
  ),
  declarePhysical: integrated(
    'declarePhysical',
    'game-intent',
    'toServerIntent maps declarePhysical to Physical',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.declarePhysical,
  ),
  requestSpot: integrated(
    'requestSpot',
    'game-intent',
    'toServerIntent maps requestSpot to RequestSpot',
    [
      ...MEKSTATION_GAME_INTENT_SOURCE_REFS.requestSpot,
      ...MEGAMEK_REQUEST_SPOT_SOURCE_REFS,
    ],
  ),
  confirmHeat: integrated(
    'confirmHeat',
    'game-intent',
    'toServerIntent maps confirmHeat to AdvancePhase',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.confirmHeat,
  ),
  endPhase: integrated(
    'endPhase',
    'game-intent',
    'toServerIntent maps endPhase to AdvancePhase',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.endPhase,
  ),
  eject: integrated(
    'eject',
    'game-intent',
    'toServerIntent maps eject to Eject',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.eject,
  ),
  withdraw: integrated(
    'withdraw',
    'game-intent',
    'toServerIntent maps withdraw to Withdraw',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.withdraw,
  ),
  concede: integrated(
    'concede',
    'game-intent',
    'toServerIntent maps concede to Concede',
    MEKSTATION_GAME_INTENT_SOURCE_REFS.concede,
  ),
} satisfies Record<GameIntentType, ICombatActionSupportEntry>;
