import type { ICombatActionSupportEntry } from './CombatActionSupport.types';

import { integrated, outOfScope } from './CombatActionSupport.entries';
import {
  MEKSTATION_CONCEDE_COMMAND_SOURCE_REFS,
  MEKSTATION_EJECT_COMMAND_SOURCE_REFS,
  MEKSTATION_END_PHASE_COMMAND_SOURCE_REFS,
  MEKSTATION_HEAT_CONTINUE_COMMAND_SOURCE_REFS,
  MEKSTATION_NEXT_TURN_COMMAND_SOURCE_REFS,
  MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS,
  MEKSTATION_REQUEST_SPOT_COMMAND_SOURCE_REFS,
  MEKSTATION_WITHDRAW_COMMAND_SOURCE_REFS,
} from './CombatActionSupport.physicalUtilitySourceRefs';
import { MEGAMEK_REQUEST_SPOT_SOURCE_REFS } from './CombatSpottingSourceRefs';

export const ATTACK_UTILITY_COMMAND_ACTION_SUPPORT = {
  'physical.punch': integrated(
    'physical.punch',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack punch; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.punch'],
  ),
  'physical.kick': integrated(
    'physical.kick',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack kick; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.kick'],
  ),
  'physical.push': integrated(
    'physical.push',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack push; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.push'],
  ),
  'physical.trip': integrated(
    'physical.trip',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack trip; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.trip'],
  ),
  'physical.thrash': integrated(
    'physical.thrash',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack thrash; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.thrash'],
  ),
  'physical.jump-jet-attack': integrated(
    'physical.jump-jet-attack',
    'tactical-command',
    'buildPhysicalAttackCommands commits right-leg jump-jet attack; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack preserve the selected leg limb',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.jump-jet-attack'],
  ),
  'physical.brush-off': integrated(
    'physical.brush-off',
    'tactical-command',
    'buildPhysicalAttackCommands commits right-arm brush-off; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack preserve the selected arm limb',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.brush-off'],
  ),
  'physical.grapple': integrated(
    'physical.grapple',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack grapple; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.grapple'],
  ),
  'physical.break-grapple': integrated(
    'physical.break-grapple',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack break-grapple; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.break-grapple'],
  ),
  'physical.charge': integrated(
    'physical.charge',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack charge; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.charge'],
  ),
  'physical.dfa': integrated(
    'physical.dfa',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack dfa; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.dfa'],
  ),
  'physical.club': integrated(
    'physical.club',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack hatchet as the current club/melee command',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.club'],
  ),
  'physical.sword': integrated(
    'physical.sword',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack sword; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.sword'],
  ),
  'physical.mace': integrated(
    'physical.mace',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack mace; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.mace'],
  ),
  'physical.lance': integrated(
    'physical.lance',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack lance; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.lance'],
  ),
  'physical.retractable-blade': integrated(
    'physical.retractable-blade',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack retractable-blade; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.retractable-blade'],
  ),
  'physical.flail': integrated(
    'physical.flail',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack flail; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.flail'],
  ),
  'physical.wrecking-ball': integrated(
    'physical.wrecking-ball',
    'tactical-command',
    'buildPhysicalAttackCommands commits physical-attack wrecking-ball; declarePhysical/Physical/dispatchToEngine.applyPhysicalAttack carry it',
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.wrecking-ball'],
  ),
  'heat.continue': integrated(
    'heat.continue',
    'tactical-command',
    'buildHeatEndCommands commits continue; useGameplayStore.handleAction advances Heat through InteractiveSession.advancePhase, while confirmHeat maps to AdvancePhase on server and a Heat-phase advance marker on P2P',
    MEKSTATION_HEAT_CONTINUE_COMMAND_SOURCE_REFS,
  ),
  'heat-end.end-phase': integrated(
    'heat-end.end-phase',
    'tactical-command',
    'buildHeatEndCommands commits phase advance; endPhase maps to AdvancePhase and dispatchToEngine.advancePhase',
    MEKSTATION_END_PHASE_COMMAND_SOURCE_REFS,
  ),
  'heat-end.next-turn': integrated(
    'heat-end.next-turn',
    'tactical-command',
    'buildHeatEndCommands exposes end-phase next-turn and local gameplay reducers advance initiative/turn state',
    MEKSTATION_NEXT_TURN_COMMAND_SOURCE_REFS,
  ),
  'utility.eject': integrated(
    'utility.eject',
    'tactical-command',
    'buildUtilityCommands commits eject; eject game intent, Eject wire payload, and InteractiveSession.ejectUnit are wired',
    MEKSTATION_EJECT_COMMAND_SOURCE_REFS,
  ),
  'utility.withdraw': outOfScope(
    'utility.withdraw',
    'tactical-command',
    'InteractiveSession.declareWithdrawal, withdraw game intent, Withdraw wire payload, server dispatch, and P2P translation model player withdrawal',
    'The command-shell shortcut has no edge-selection payload and is superseded by the integrated edge-selecting WithdrawControl action path',
    MEKSTATION_WITHDRAW_COMMAND_SOURCE_REFS,
  ),
  'utility.concede': integrated(
    'utility.concede',
    'tactical-command',
    'buildUtilityCommands commits concede; concede game intent maps to Concede wire payload and server dispatch',
    MEKSTATION_CONCEDE_COMMAND_SOURCE_REFS,
  ),
  'utility.request-spot': integrated(
    'utility.request-spot',
    'tactical-command',
    'buildUtilityCommands commits request-spot with active/target payload; requestSpot emits SpottingDeclared, latches spotting state, clears on turn reset, and routes through game intent, wire dispatch, and P2P translation',
    [
      ...MEKSTATION_REQUEST_SPOT_COMMAND_SOURCE_REFS,
      ...MEGAMEK_REQUEST_SPOT_SOURCE_REFS,
    ],
  ),
} satisfies Record<string, ICombatActionSupportEntry>;
