import type { GameIntentType } from '@/types/gameplay';

import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import { mekstationDeviationSourceRef } from './CombatActionSupport.entries';

export const MEKSTATION_GAME_INTENT_SOURCE_REFS = {
  declareMovement: [
    mekstationDeviationSourceRef(
      'MekStation declareMovementIntent builds declareMovement game intents for movement actions.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L121-L126',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps declareMovement game intents to Move wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L271',
    ),
  ],
  stand: [
    mekstationDeviationSourceRef(
      'MekStation standIntent builds stand game intents for standing actions.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L128-L133',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps stand game intents to Stand wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L278',
    ),
  ],
  goProne: [
    mekstationDeviationSourceRef(
      'MekStation goProneIntent builds goProne game intents for voluntary prone actions.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L135-L140',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps goProne game intents to GoProne wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L285',
    ),
  ],
  activateMovementEnhancement: [
    mekstationDeviationSourceRef(
      'MekStation activateMovementEnhancementIntent builds MASC and Supercharger game intents.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L142-L147',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps activateMovementEnhancement game intents to ActivateMovementEnhancement wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L295',
    ),
  ],
  torsoTwist: [
    mekstationDeviationSourceRef(
      'MekStation torsoTwistIntent builds torsoTwist game intents with secondary facing payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L149-L154',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps torsoTwist game intents to TorsoTwist wire payloads and normalizes secondary facing.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L307',
    ),
  ],
  declareAttack: [
    mekstationDeviationSourceRef(
      'MekStation declareAttackIntent builds declareAttack game intents for ranged weapon attacks.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L156-L161',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps declareAttack game intents to Attack wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L320',
    ),
  ],
  declarePhysical: [
    mekstationDeviationSourceRef(
      'MekStation declarePhysicalIntent builds declarePhysical game intents for physical attacks.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L163-L168',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps declarePhysical game intents to Physical wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L334',
    ),
  ],
  requestSpot: [
    mekstationDeviationSourceRef(
      'MekStation requestSpotIntent builds requestSpot game intents with spotting unit and target ids.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L171-L176',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps requestSpot game intents to RequestSpot wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L230-L343',
    ),
  ],
  confirmHeat: [
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps confirmHeat game intents to AdvancePhase because heat confirmation advances the Heat phase.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L235',
    ),
  ],
  endPhase: [
    mekstationDeviationSourceRef(
      'MekStation endPhaseIntent builds endPhase game intents.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L170-L172',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps endPhase game intents to AdvancePhase wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L235',
    ),
  ],
  eject: [
    mekstationDeviationSourceRef(
      'MekStation ejectIntent builds eject game intents for ejection actions.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L174-L179',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps eject game intents to Eject wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L341',
    ),
  ],
  withdraw: [
    mekstationDeviationSourceRef(
      'MekStation withdrawIntent builds withdraw game intents with withdrawal edge payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L181-L186',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps withdraw game intents to Withdraw wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L358',
    ),
  ],
  concede: [
    mekstationDeviationSourceRef(
      'MekStation concedeIntent builds concede game intents with side payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L188-L193',
    ),
    mekstationDeviationSourceRef(
      'MekStation toServerIntent maps concede game intents to Concede wire payloads.',
      'src/lib/multiplayer/gameIntentMap.ts',
      'L218-L365',
    ),
  ],
} satisfies Record<GameIntentType, readonly ICombatFeatureSourceReference[]>;
