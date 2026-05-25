import type { GameIntentType } from '@/types/gameplay';
import type { IIntentPayload } from '@/types/multiplayer/Protocol';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { MEGAMEK_TORSO_TWIST_SOURCE_REFS } from './CombatMovementSourceRefs';
import { MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS } from './CombatPilotModifierSourceRefs';

export { P2P_INTENT_TRANSLATION_SUPPORT } from './CombatP2PIntentSupport';

export type CombatActionLayer =
  | 'absent-action-surface'
  | 'tactical-command'
  | 'direct-ui-control'
  | 'game-intent'
  | 'wire-intent'
  | 'p2p-translation'
  | 'physical-attack-type';

export interface ICombatActionSupportEntry extends ICombatFeatureSupportEntry {
  readonly layer: CombatActionLayer;
}

function integrated(
  id: string,
  layer: CombatActionLayer,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatActionSupportEntry {
  return sourceRefs
    ? { id, layer, level: 'integrated', evidence, sourceRefs }
    : { id, layer, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  layer: CombatActionLayer,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatActionSupportEntry {
  return sourceRefs
    ? { id, layer, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, layer, level: 'helper-only', evidence, gap };
}

function unsupported(
  id: string,
  layer: CombatActionLayer,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatActionSupportEntry {
  return {
    id,
    layer,
    level: 'unsupported',
    evidence: 'No BattleMech combat action behavior wired',
    gap,
    ...(sourceRefs ? { sourceRefs } : {}),
  };
}

function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineRange}`,
    sourceVersion: 'MekStation working-tree',
  };
}

const MEGAMEK_GO_PRONE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MoveStepType defines GO_PRONE as the Prone movement step.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/enums/MoveStepType.java#L46',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek GoProneStep.preCompilation assigns 1 MP when the entity is not hull-down.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/GoProneStep.java#L50-L63',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MoveStep marks GO_PRONE illegal for already-prone units, non-Meks, or stuck entities.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L2379-L2381',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePathHandler resolves GO_PRONE by using step MP and setting entity prone.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L3572-L3592',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePath derives active MASC/Supercharger use from movement steps marked as using those boosters.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MovePath.java#L859-L879',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MoveStep tags either or both boosters on qualifying boosted movement steps and stores their target numbers.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L2581-L2610',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePathHandler checks active MASC/Supercharger on the first movement step and invokes the failure checks.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L1507-L1519',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_STABILIZE_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildMovementCommands exposes movement.stabilize as a product-visible tactical command that commits the local stabilize action id.',
    'src/components/gameplay/TacticalActionDock/commands/movementCommands.ts',
    'L193-L207',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_MOVEMENT_CANCEL_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildMovementCommands exposes movement.cancel as a local movement-preview reset command that commits the undo action id.',
    'src/components/gameplay/TacticalActionDock/commands/movementCommands.ts',
    'L211-L227',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_WEAPON_DECLARE_ATTACK_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildWeaponAttackCommands exposes weapon.declare-attack as a target-selection command that commits the local declare-attack action id.',
    'src/components/gameplay/TacticalActionDock/commands/weaponAttackCommands.ts',
    'L24-L46',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_WEAPON_CLEAR_ATTACKS_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildWeaponAttackCommands exposes weapon.clear-attacks as a local draft attack reset command that commits the clear action id.',
    'src/components/gameplay/TacticalActionDock/commands/weaponAttackCommands.ts',
    'L76-L90',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_WITHDRAW_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildUtilityCommands exposes utility.withdraw as a product-visible command that commits the local withdraw action id without an edge-selection payload.',
    'src/components/gameplay/TacticalActionDock/commands/utilityCommands.ts',
    'L50-L64',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_REQUEST_SPOT_COMMAND_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildUtilityCommands exposes utility.request-spot as a target-aware local spotting command that commits the request-spot action id.',
    'src/components/gameplay/TacticalActionDock/commands/utilityCommands.ts',
    'L85-L103',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_GAME_INTENT_SOURCE_REFS = {
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

function wireDispatchSourceRef(
  citation: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return mekstationDeviationSourceRef(
    citation,
    'src/lib/multiplayer/server/ServerMatchHostEngineDispatch.ts',
    lineRange,
  );
}

function wireProtocolSourceRef(
  citation: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return mekstationDeviationSourceRef(
    citation,
    'src/types/multiplayer/Protocol.ts',
    lineRange,
  );
}

const MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS = [
  wireProtocolSourceRef(
    'MekStation Protocol defines OccupySeat, LeaveSeat, ReassignSeat, SetAiSlot, SetHumanSlot, SetReady, and LaunchMatch as lobby intents for seat occupancy, readiness, and launch flow.',
    'L158-L213',
  ),
  wireDispatchSourceRef(
    'MekStation dispatchToEngine rejects lobby wire intents as non-engine intents instead of treating them as BattleMech combat actions.',
    'L72-L83',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS = [
  wireProtocolSourceRef(
    'MekStation Protocol defines MarkSeatAi and ForfeitMatch as reconnection/lobby timeout intents rather than BattleMech combat actions.',
    'L219-L245',
  ),
  wireDispatchSourceRef(
    'MekStation dispatchToEngine rejects reconnect and lobby timeout wire intents as non-engine intents instead of treating them as BattleMech combat actions.',
    'L72-L83',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_WIRE_INTENT_SOURCE_REFS = {
  AdvancePhase: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes AdvancePhase wire intents to InteractiveSession.advancePhase.',
      'L54-L56',
    ),
  ],
  Attack: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Attack wire intents to InteractiveSession.applyAttack.',
      'L42-L44',
    ),
  ],
  Concede: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Concede wire intents to InteractiveSession.concede after normalizing the side payload.',
      'L66-L70',
    ),
  ],
  Eject: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Eject wire intents to InteractiveSession.ejectUnit.',
      'L58-L60',
    ),
  ],
  Move: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Move wire intents to InteractiveSession.applyMovement.',
      'L15-L24',
    ),
    wireDispatchSourceRef(
      'MekStation parseMovementType normalizes Move wire movement strings before engine dispatch.',
      'L94-L111',
    ),
  ],
  Physical: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Physical wire intents to InteractiveSession.applyPhysicalAttack.',
      'L46-L52',
    ),
  ],
  GoProne: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes GoProne wire intents to InteractiveSession.goProne.',
      'L30-L32',
    ),
  ],
  ActivateMovementEnhancement: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes ActivateMovementEnhancement wire intents to InteractiveSession.activateMovementEnhancement.',
      'L34-L36',
    ),
  ],
  TorsoTwist: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes TorsoTwist wire intents to InteractiveSession.torsoTwist.',
      'L38-L40',
    ),
  ],
  Stand: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Stand wire intents to InteractiveSession.attemptStandUp.',
      'L26-L28',
    ),
  ],
  Withdraw: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Withdraw wire intents to InteractiveSession.declareWithdrawal.',
      'L62-L64',
    ),
  ],
  ForfeitMatch: MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS,
  LaunchMatch: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  LeaveSeat: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  MarkSeatAi: MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS,
  OccupySeat: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  ReassignSeat: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  SetAiSlot: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  SetHumanSlot: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  SetReady: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
} satisfies Record<
  IIntentPayload['kind'],
  readonly ICombatFeatureSourceReference[]
>;

const MEGAMEK_TAC_OPS_SPRINT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MoveStep.canUseSprint gates sprinting on the TacOps sprint option and BattleMech unit scope.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L3908-L3922',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getSprintMP calculates BattleMech sprint MP as 2x walk MP, or boosted through armed MASC/Supercharger sprint formulas.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L1041-L1055',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MPBoosters.calculateSprintMP uses ceil(walk MP * 2.5) for one active booster and 3x walk MP for MASC plus Supercharger.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/enums/MPBoosters.java#L89-L97',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getSprintHeat delegates sprint heat to the engine sprint heat calculation plus damaged-coolant-system heat.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L1075-L1078',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ranged to-hit calculation makes attacks by sprinting attackers automatic failures.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2678-L2680',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ranged to-hit calculation applies a -1 modifier when the target sprinted.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2847-L2850',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const COMBAT_COMMAND_ACTION_SUPPORT = {
  'movement.walk': integrated(
    'movement.walk',
    'tactical-command',
    'buildMovementCommands commits lock mode walk; declareMovement/Move carries authoritative movement',
  ),
  'movement.run': integrated(
    'movement.run',
    'tactical-command',
    'buildMovementCommands commits lock mode run; declareMovement/Move carries authoritative movement',
  ),
  'movement.jump': integrated(
    'movement.jump',
    'tactical-command',
    'buildMovementCommands commits lock mode jump; declareMovement/Move carries authoritative movement',
  ),
  'movement.stand': integrated(
    'movement.stand',
    'tactical-command',
    'buildMovementCommands commits stand; useGameplayStore, stand game intent, Stand wire payload, server dispatch, and P2P host command route through InteractiveSession.attemptStandUp',
  ),
  'movement.go-prone': integrated(
    'movement.go-prone',
    'tactical-command',
    'buildMovementCommands commits go-prone; useGameplayStore, goProne game intent, GoProne wire payload, server dispatch, P2P host command, and InteractiveSession.goProne emit a source-backed same-hex MovementDeclared goProne step with 1 MP and no heat',
    MEGAMEK_GO_PRONE_SOURCE_REFS,
  ),
  'movement.activate-masc': integrated(
    'movement.activate-masc',
    'tactical-command',
    'buildMovementCommands commits activate-masc; useGameplayStore, activateMovementEnhancement game intent, ActivateMovementEnhancement wire payload, server dispatch, P2P host command, and InteractiveSession.activateMovementEnhancement set replayable activeMASC state before the movement declaration consumes boosted MP and PSR checks',
    MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
  ),
  'movement.activate-supercharger': integrated(
    'movement.activate-supercharger',
    'tactical-command',
    'buildMovementCommands commits activate-supercharger; useGameplayStore, activateMovementEnhancement game intent, ActivateMovementEnhancement wire payload, server dispatch, P2P host command, and InteractiveSession.activateMovementEnhancement set replayable activeSupercharger state before the movement declaration consumes boosted MP and PSR checks',
    MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
  ),
  'movement.stabilize': unsupported(
    'movement.stabilize',
    'tactical-command',
    'Stabilize is exposed as a MekStation-local command id but has no authoritative combat-state mutation path, no game intent, no wire payload, no P2P translation, and no identified BattleMech rule source',
    MEKSTATION_STABILIZE_COMMAND_SOURCE_REFS,
  ),
  'movement.cancel': helperOnly(
    'movement.cancel',
    'tactical-command',
    'buildMovementCommands commits undo for local preview cancellation',
    'Local preview cancel is not an authoritative combat action and has no game intent or wire path',
    MEKSTATION_MOVEMENT_CANCEL_COMMAND_SOURCE_REFS,
  ),
  'facing.rotate-left': integrated(
    'facing.rotate-left',
    'tactical-command',
    'buildFacingCommands commits facing-left; useGameplayStore turns it into a same-hex MovementDeclared path and declareMovement/Move carries final facing over the existing movement wire protocol',
  ),
  'facing.rotate-right': integrated(
    'facing.rotate-right',
    'tactical-command',
    'buildFacingCommands commits facing-right; useGameplayStore turns it into a same-hex MovementDeclared path and declareMovement/Move carries final facing over the existing movement wire protocol',
  ),
  'facing.torso-twist': integrated(
    'facing.torso-twist',
    'tactical-command',
    'buildFacingCommands exposes source-backed torso-twist during WeaponAttack with a direction payload; useGameplayStore routes it to torsoTwist, which validates BattleMech legality and emits FacingChanged secondaryFacing state consumed by replay, AI weapon arcs, runner secondary-target math, game intent, wire, P2P, and server dispatch paths',
    MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  ),
  'weapon.declare-attack': helperOnly(
    'weapon.declare-attack',
    'tactical-command',
    'buildWeaponAttackCommands exposes a target-selection declaration command',
    'The command id is not the authoritative attack commit; declareAttack game intents and Attack wire payloads carry committed attacks',
    MEKSTATION_WEAPON_DECLARE_ATTACK_COMMAND_SOURCE_REFS,
  ),
  'weapon.fire-volley': integrated(
    'weapon.fire-volley',
    'tactical-command',
    'buildWeaponAttackCommands commits the irreversible volley; declareAttack/Attack/dispatchToEngine.applyAttack carry the authoritative attack path',
  ),
  'weapon.clear-attacks': helperOnly(
    'weapon.clear-attacks',
    'tactical-command',
    'buildWeaponAttackCommands clears queued local attack selections',
    'Clearing a draft attack list is local UI state and has no game intent or wire path',
    MEKSTATION_WEAPON_CLEAR_ATTACKS_COMMAND_SOURCE_REFS,
  ),
  'physical.punch': integrated(
    'physical.punch',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack punch; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.kick': integrated(
    'physical.kick',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack kick; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.push': integrated(
    'physical.push',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack push; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.charge': integrated(
    'physical.charge',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack charge; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.dfa': integrated(
    'physical.dfa',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack dfa; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.club': integrated(
    'physical.club',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack hatchet as the current club/melee command',
  ),
  'physical.sword': integrated(
    'physical.sword',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack sword; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.mace': integrated(
    'physical.mace',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack mace; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.lance': integrated(
    'physical.lance',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack lance; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.retractable-blade': integrated(
    'physical.retractable-blade',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack retractable-blade; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.flail': integrated(
    'physical.flail',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack flail; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'physical.wrecking-ball': integrated(
    'physical.wrecking-ball',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack wrecking-ball; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
  ),
  'heat.continue': integrated(
    'heat.continue',
    'tactical-command',
    'buildHeatEndCommands commits continue; useGameplayStore.handleAction advances Heat through InteractiveSession.advancePhase, while confirmHeat maps to AdvancePhase on server and a Heat-phase advance marker on P2P',
  ),
  'heat-end.end-phase': integrated(
    'heat-end.end-phase',
    'tactical-command',
    'buildHeatEndCommands commits phase advance; endPhase maps to AdvancePhase and dispatchToEngine.advancePhase',
  ),
  'heat-end.next-turn': integrated(
    'heat-end.next-turn',
    'tactical-command',
    'buildHeatEndCommands exposes end-phase next-turn and local gameplay reducers advance initiative/turn state',
  ),
  'utility.eject': integrated(
    'utility.eject',
    'tactical-command',
    'buildUtilityCommands commits eject; eject game intent, Eject wire payload, and InteractiveSession.ejectUnit are wired',
  ),
  'utility.withdraw': helperOnly(
    'utility.withdraw',
    'tactical-command',
    'InteractiveSession.declareWithdrawal, withdraw game intent, Withdraw wire payload, server dispatch, and P2P translation model player withdrawal',
    'The tactical command still has no edge-selection payload, so the UI command cannot directly produce the authoritative withdraw intent',
    MEKSTATION_WITHDRAW_COMMAND_SOURCE_REFS,
  ),
  'utility.concede': integrated(
    'utility.concede',
    'tactical-command',
    'buildUtilityCommands commits concede; concede game intent maps to Concede wire payload and server dispatch',
  ),
  'utility.request-spot': helperOnly(
    'utility.request-spot',
    'tactical-command',
    'buildUtilityCommands exposes target spotting during WeaponAttack',
    'No spotting lifecycle, TAG/NARC marker intent, wire payload, or dispatch path is wired',
    MEKSTATION_REQUEST_SPOT_COMMAND_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatActionSupportEntry>;

export const GM_COMMAND_EXCLUSION_SUPPORT = {
  'gm.advance-phase': unsupported(
    'gm.advance-phase',
    'tactical-command',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
  ),
  'gm.set-damage': unsupported(
    'gm.set-damage',
    'tactical-command',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
  ),
  'gm.grant-resource': unsupported(
    'gm.grant-resource',
    'tactical-command',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
  ),
} satisfies Record<string, ICombatActionSupportEntry>;

export const BATTLEMECH_ABSENT_ACTION_SUPPORT = {
  'movement.evade': unsupported(
    'movement.evade',
    'absent-action-surface',
    'Evade is a source-backed optional TacOps movement surface with running movement, evasion heat, attacker firing restrictions, and target to-hit modifiers; explicit evading attacker state now blocks ranged and physical attacks, and explicit target evasion now modifies ranged and physical to-hit, but tactical commands, MovementType, game intents, wire payloads, P2P translation, runner movement phases, authoritative evasion state creation, and Skilled Evasion scaling have no authoritative evade action path',
    MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS,
  ),
  'movement.sprint': unsupported(
    'movement.sprint',
    'absent-action-surface',
    'Sprint is a source-backed optional TacOps BattleMech movement surface with distinct MP, heat, and attack/targeting side effects, but MovementType, tactical commands, game intents, wire payloads, P2P translation, runner movement phases, and sprint attack restrictions have no authoritative sprint action path',
    MEGAMEK_TAC_OPS_SPRINT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatActionSupportEntry>;

export const COMBAT_DIRECT_UI_ACTION_SUPPORT = {
  'utility.withdraw-control': integrated(
    'utility.withdraw-control',
    'direct-ui-control',
    'WithdrawControl collects the withdrawal edge and calls InteractiveSession.declareWithdrawal(unitId, edge), which feeds the same withdrawal state/event lifecycle as the Withdraw wire intent',
  ),
} satisfies Record<string, ICombatActionSupportEntry>;

export const GAME_INTENT_TO_WIRE_KIND = {
  declareMovement: 'Move',
  stand: 'Stand',
  goProne: 'GoProne',
  activateMovementEnhancement: 'ActivateMovementEnhancement',
  torsoTwist: 'TorsoTwist',
  declareAttack: 'Attack',
  declarePhysical: 'Physical',
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

export const ENGINE_WIRE_COMBAT_INTENT_KINDS = [
  'AdvancePhase',
  'Attack',
  'Concede',
  'Eject',
  'Move',
  'Physical',
  'GoProne',
  'ActivateMovementEnhancement',
  'TorsoTwist',
  'Stand',
  'Withdraw',
] as const satisfies readonly IIntentPayload['kind'][];

export const NON_COMBAT_WIRE_INTENT_KINDS = [
  'ForfeitMatch',
  'LaunchMatch',
  'LeaveSeat',
  'MarkSeatAi',
  'OccupySeat',
  'ReassignSeat',
  'SetAiSlot',
  'SetHumanSlot',
  'SetReady',
] as const satisfies readonly IIntentPayload['kind'][];

export const WIRE_INTENT_KIND_ACTION_SUPPORT = {
  AdvancePhase: integrated(
    'AdvancePhase',
    'wire-intent',
    'dispatchToEngine routes AdvancePhase to InteractiveSession.advancePhase',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.AdvancePhase,
  ),
  Attack: integrated(
    'Attack',
    'wire-intent',
    'dispatchToEngine routes Attack to InteractiveSession.applyAttack',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Attack,
  ),
  Concede: integrated(
    'Concede',
    'wire-intent',
    'dispatchToEngine routes Concede to InteractiveSession.concede',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Concede,
  ),
  Eject: integrated(
    'Eject',
    'wire-intent',
    'dispatchToEngine routes Eject to InteractiveSession.ejectUnit',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Eject,
  ),
  Move: integrated(
    'Move',
    'wire-intent',
    'dispatchToEngine routes Move to InteractiveSession.applyMovement',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Move,
  ),
  GoProne: integrated(
    'GoProne',
    'wire-intent',
    'dispatchToEngine routes GoProne to InteractiveSession.goProne',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.GoProne,
      ...MEGAMEK_GO_PRONE_SOURCE_REFS,
    ],
  ),
  ActivateMovementEnhancement: integrated(
    'ActivateMovementEnhancement',
    'wire-intent',
    'dispatchToEngine routes ActivateMovementEnhancement to InteractiveSession.activateMovementEnhancement',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.ActivateMovementEnhancement,
      ...MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
    ],
  ),
  TorsoTwist: integrated(
    'TorsoTwist',
    'wire-intent',
    'dispatchToEngine routes TorsoTwist to InteractiveSession.torsoTwist',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.TorsoTwist,
      ...MEGAMEK_TORSO_TWIST_SOURCE_REFS,
    ],
  ),
  Stand: integrated(
    'Stand',
    'wire-intent',
    'dispatchToEngine routes Stand to InteractiveSession.attemptStandUp',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Stand,
  ),
  Physical: integrated(
    'Physical',
    'wire-intent',
    'dispatchToEngine routes Physical to InteractiveSession.applyPhysicalAttack',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Physical,
  ),
  Withdraw: integrated(
    'Withdraw',
    'wire-intent',
    'dispatchToEngine routes Withdraw to InteractiveSession.declareWithdrawal',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Withdraw,
  ),
  ForfeitMatch: unsupported(
    'ForfeitMatch',
    'wire-intent',
    'Reconnect/lobby timeout intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.ForfeitMatch,
  ),
  LaunchMatch: unsupported(
    'LaunchMatch',
    'wire-intent',
    'Lobby setup intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.LaunchMatch,
  ),
  LeaveSeat: unsupported(
    'LeaveSeat',
    'wire-intent',
    'Lobby seat intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.LeaveSeat,
  ),
  MarkSeatAi: unsupported(
    'MarkSeatAi',
    'wire-intent',
    'Reconnect/lobby seat intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.MarkSeatAi,
  ),
  OccupySeat: unsupported(
    'OccupySeat',
    'wire-intent',
    'Lobby seat intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.OccupySeat,
  ),
  ReassignSeat: unsupported(
    'ReassignSeat',
    'wire-intent',
    'Lobby host intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.ReassignSeat,
  ),
  SetAiSlot: unsupported(
    'SetAiSlot',
    'wire-intent',
    'Lobby slot intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.SetAiSlot,
  ),
  SetHumanSlot: unsupported(
    'SetHumanSlot',
    'wire-intent',
    'Lobby slot intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.SetHumanSlot,
  ),
  SetReady: unsupported(
    'SetReady',
    'wire-intent',
    'Lobby readiness intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.SetReady,
  ),
} satisfies Record<IIntentPayload['kind'], ICombatActionSupportEntry>;
