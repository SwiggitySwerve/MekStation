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
    'Stabilize is exposed as a command id but has no authoritative combat-state mutation path',
  ),
  'movement.cancel': helperOnly(
    'movement.cancel',
    'tactical-command',
    'buildMovementCommands commits undo for local preview cancellation',
    'Local preview cancel is not an authoritative combat action and has no game intent or wire path',
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
  'facing.torso-twist': helperOnly(
    'facing.torso-twist',
    'tactical-command',
    'buildFacingCommands exposes source-backed torso-twist during WeaponAttack and firing-arc helpers model twist context',
    'No authoritative secondary-facing torso-twist state, game intent, wire protocol, P2P translation, or server dispatch path exists',
    MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  ),
  'weapon.declare-attack': helperOnly(
    'weapon.declare-attack',
    'tactical-command',
    'buildWeaponAttackCommands exposes a target-selection declaration command',
    'The command id is not the authoritative attack commit; declareAttack game intents and Attack wire payloads carry committed attacks',
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
    'Evade is a source-backed optional TacOps movement surface with running movement, evasion heat, attacker firing restrictions, and target to-hit modifiers, but tactical commands, MovementType, game intents, wire payloads, P2P translation, runner movement phases, evasion state, and evasion attack restrictions have no authoritative evade action path',
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
  ),
  stand: integrated(
    'stand',
    'game-intent',
    'toServerIntent maps stand to Stand',
  ),
  goProne: integrated(
    'goProne',
    'game-intent',
    'toServerIntent maps goProne to GoProne',
    MEGAMEK_GO_PRONE_SOURCE_REFS,
  ),
  activateMovementEnhancement: integrated(
    'activateMovementEnhancement',
    'game-intent',
    'toServerIntent maps activateMovementEnhancement to ActivateMovementEnhancement',
    MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
  ),
  declareAttack: integrated(
    'declareAttack',
    'game-intent',
    'toServerIntent maps declareAttack to Attack',
  ),
  declarePhysical: integrated(
    'declarePhysical',
    'game-intent',
    'toServerIntent maps declarePhysical to Physical',
  ),
  confirmHeat: integrated(
    'confirmHeat',
    'game-intent',
    'toServerIntent maps confirmHeat to AdvancePhase',
  ),
  endPhase: integrated(
    'endPhase',
    'game-intent',
    'toServerIntent maps endPhase to AdvancePhase',
  ),
  eject: integrated(
    'eject',
    'game-intent',
    'toServerIntent maps eject to Eject',
  ),
  withdraw: integrated(
    'withdraw',
    'game-intent',
    'toServerIntent maps withdraw to Withdraw',
  ),
  concede: integrated(
    'concede',
    'game-intent',
    'toServerIntent maps concede to Concede',
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
  ),
  Attack: integrated(
    'Attack',
    'wire-intent',
    'dispatchToEngine routes Attack to InteractiveSession.applyAttack',
  ),
  Concede: integrated(
    'Concede',
    'wire-intent',
    'dispatchToEngine routes Concede to InteractiveSession.concede',
  ),
  Eject: integrated(
    'Eject',
    'wire-intent',
    'dispatchToEngine routes Eject to InteractiveSession.ejectUnit',
  ),
  Move: integrated(
    'Move',
    'wire-intent',
    'dispatchToEngine routes Move to InteractiveSession.applyMovement',
  ),
  GoProne: integrated(
    'GoProne',
    'wire-intent',
    'dispatchToEngine routes GoProne to InteractiveSession.goProne',
    MEGAMEK_GO_PRONE_SOURCE_REFS,
  ),
  ActivateMovementEnhancement: integrated(
    'ActivateMovementEnhancement',
    'wire-intent',
    'dispatchToEngine routes ActivateMovementEnhancement to InteractiveSession.activateMovementEnhancement',
    MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
  ),
  Stand: integrated(
    'Stand',
    'wire-intent',
    'dispatchToEngine routes Stand to InteractiveSession.attemptStandUp',
  ),
  Physical: integrated(
    'Physical',
    'wire-intent',
    'dispatchToEngine routes Physical to InteractiveSession.applyPhysicalAttack',
  ),
  Withdraw: integrated(
    'Withdraw',
    'wire-intent',
    'dispatchToEngine routes Withdraw to InteractiveSession.declareWithdrawal',
  ),
  ForfeitMatch: unsupported(
    'ForfeitMatch',
    'wire-intent',
    'Reconnect/lobby timeout intent; not a BattleMech combat action',
  ),
  LaunchMatch: unsupported(
    'LaunchMatch',
    'wire-intent',
    'Lobby setup intent; not a BattleMech combat action',
  ),
  LeaveSeat: unsupported(
    'LeaveSeat',
    'wire-intent',
    'Lobby seat intent; not a BattleMech combat action',
  ),
  MarkSeatAi: unsupported(
    'MarkSeatAi',
    'wire-intent',
    'Reconnect/lobby seat intent; not a BattleMech combat action',
  ),
  OccupySeat: unsupported(
    'OccupySeat',
    'wire-intent',
    'Lobby seat intent; not a BattleMech combat action',
  ),
  ReassignSeat: unsupported(
    'ReassignSeat',
    'wire-intent',
    'Lobby host intent; not a BattleMech combat action',
  ),
  SetAiSlot: unsupported(
    'SetAiSlot',
    'wire-intent',
    'Lobby slot intent; not a BattleMech combat action',
  ),
  SetHumanSlot: unsupported(
    'SetHumanSlot',
    'wire-intent',
    'Lobby slot intent; not a BattleMech combat action',
  ),
  SetReady: unsupported(
    'SetReady',
    'wire-intent',
    'Lobby readiness intent; not a BattleMech combat action',
  ),
} satisfies Record<IIntentPayload['kind'], ICombatActionSupportEntry>;
