import type { ICombatActionSupportEntry } from './CombatActionSupport.types';

import { integrated, outOfScope } from './CombatActionSupport.entries';
import {
  FACING_TORSO_TWIST_ACTION_SOURCE_REFS,
  MEGAMEK_TAC_OPS_SPRINT_SOURCE_REFS,
  MEKSTATION_FACING_ROTATE_LEFT_COMMAND_SOURCE_REFS,
  MEKSTATION_FACING_ROTATE_RIGHT_COMMAND_SOURCE_REFS,
  MEKSTATION_MOVEMENT_CANCEL_COMMAND_SOURCE_REFS,
  MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS,
  MEKSTATION_STABILIZE_COMMAND_SOURCE_REFS,
  MOVEMENT_ACTIVATE_MASC_ACTION_SOURCE_REFS,
  MOVEMENT_ACTIVATE_SUPERCHARGER_ACTION_SOURCE_REFS,
  MOVEMENT_GO_PRONE_ACTION_SOURCE_REFS,
} from './CombatActionSupport.movementSourceRefs';
import {
  MEKSTATION_WEAPON_CLEAR_ATTACKS_COMMAND_SOURCE_REFS,
  MEKSTATION_WEAPON_DECLARE_ATTACK_COMMAND_SOURCE_REFS,
  MEKSTATION_WEAPON_FIRE_VOLLEY_COMMAND_SOURCE_REFS,
} from './CombatActionSupport.physicalUtilitySourceRefs';
import { MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS } from './CombatPilotModifierSourceRefs';

export const MOVEMENT_COMMAND_ACTION_SUPPORT = {
  'movement.walk': integrated(
    'movement.walk',
    'tactical-command',
    'buildMovementCommands commits lock mode walk; declareMovement/Move carries authoritative movement',
    MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.walk'],
  ),
  'movement.run': integrated(
    'movement.run',
    'tactical-command',
    'buildMovementCommands commits lock mode run; declareMovement/Move carries authoritative movement',
    MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.run'],
  ),
  'movement.sprint': integrated(
    'movement.sprint',
    'tactical-command',
    'buildMovementCommands commits lock mode sprint; MovementType.Sprint uses source-backed sprint MP, run-based pathing/PSRs, normal-engine sprint heat, current-turn sprint state, and declareMovement/Move/P2P movement validation carry it through the existing movement action path; engine-variant/coolant sprint heat remains a cataloged heat-rule gap',
    [
      ...MEGAMEK_TAC_OPS_SPRINT_SOURCE_REFS,
      ...MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.sprint'],
    ],
  ),
  'movement.evade': integrated(
    'movement.evade',
    'tactical-command',
    'buildMovementCommands commits lock mode evade; MovementType.Evade uses run MP/pathing, creates authoritative evading/evasionBonus state, emits source-backed evasion heat, and declareMovement/Move/P2P movement validation carry it through the existing movement action path',
    [
      ...MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS,
      ...MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.evade'],
    ],
  ),
  'movement.jump': integrated(
    'movement.jump',
    'tactical-command',
    'buildMovementCommands commits lock mode jump; declareMovement/Move carries authoritative movement',
    MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.jump'],
  ),
  'movement.stand': integrated(
    'movement.stand',
    'tactical-command',
    'buildMovementCommands commits stand; useGameplayStore, stand game intent, Stand wire payload, server dispatch, and P2P host command route through InteractiveSession.attemptStandUp',
    MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.stand'],
  ),
  'movement.carefulStand': integrated(
    'movement.carefulStand',
    'tactical-command',
    'buildMovementCommands commits careful stand through the local stand-careful action path for prone BattleMechs with enough walk MP',
    MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.carefulStand'],
  ),
  'movement.hullDown': integrated(
    'movement.hullDown',
    'tactical-command',
    'buildMovementCommands commits hull-down through the local hull-down action path for Mek-style movement profiles with intact support',
    MEKSTATION_MOVEMENT_COMMAND_SOURCE_REFS['movement.hullDown'],
  ),
  'movement.goProne': integrated(
    'movement.goProne',
    'tactical-command',
    'buildMovementCommands commits go-prone; useGameplayStore, goProne game intent, GoProne wire payload, server dispatch, P2P host command, and InteractiveSession.goProne emit a source-backed same-hex MovementDeclared goProne step with 1 MP and no heat',
    MOVEMENT_GO_PRONE_ACTION_SOURCE_REFS,
  ),
  'movement.activate-masc': integrated(
    'movement.activate-masc',
    'tactical-command',
    'buildMovementCommands commits activate-masc; useGameplayStore, activateMovementEnhancement game intent, ActivateMovementEnhancement wire payload, server dispatch, P2P host command, and InteractiveSession.activateMovementEnhancement set replayable activeMASC state before the movement declaration consumes boosted MP and PSR checks',
    MOVEMENT_ACTIVATE_MASC_ACTION_SOURCE_REFS,
  ),
  'movement.activate-supercharger': integrated(
    'movement.activate-supercharger',
    'tactical-command',
    'buildMovementCommands commits activate-supercharger; useGameplayStore, activateMovementEnhancement game intent, ActivateMovementEnhancement wire payload, server dispatch, P2P host command, and InteractiveSession.activateMovementEnhancement set replayable activeSupercharger state before the movement declaration consumes boosted MP and PSR checks',
    MOVEMENT_ACTIVATE_SUPERCHARGER_ACTION_SOURCE_REFS,
  ),
  'movement.stabilize': outOfScope(
    'movement.stabilize',
    'tactical-command',
    'buildMovementCommands exposes movement.stabilize as a MekStation-local command surface without identified official BattleMech combat rule authority',
    'Stabilize is exposed as a MekStation-local command id but has no authoritative combat-state mutation path, no game intent, no wire payload, no P2P translation, and no identified BattleMech rule source',
    MEKSTATION_STABILIZE_COMMAND_SOURCE_REFS,
  ),
  'movement.cancel': outOfScope(
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
    MEKSTATION_FACING_ROTATE_LEFT_COMMAND_SOURCE_REFS,
  ),
  'facing.rotate-right': integrated(
    'facing.rotate-right',
    'tactical-command',
    'buildFacingCommands commits facing-right; useGameplayStore turns it into a same-hex MovementDeclared path and declareMovement/Move carries final facing over the existing movement wire protocol',
    MEKSTATION_FACING_ROTATE_RIGHT_COMMAND_SOURCE_REFS,
  ),
  'facing.torso-twist': integrated(
    'facing.torso-twist',
    'tactical-command',
    'buildFacingCommands exposes source-backed torso-twist during WeaponAttack with a direction payload; useGameplayStore routes it to torsoTwist, which validates BattleMech legality and emits FacingChanged secondaryFacing state consumed by replay, AI weapon arcs, runner secondary-target math, game intent, wire, P2P, and server dispatch paths',
    FACING_TORSO_TWIST_ACTION_SOURCE_REFS,
  ),
  'weapon.declare-attack': outOfScope(
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
    MEKSTATION_WEAPON_FIRE_VOLLEY_COMMAND_SOURCE_REFS,
  ),
  'weapon.clear-attacks': outOfScope(
    'weapon.clear-attacks',
    'tactical-command',
    'buildWeaponAttackCommands clears queued local attack selections',
    'Clearing a draft attack list is local UI state and has no game intent or wire path',
    MEKSTATION_WEAPON_CLEAR_ATTACKS_COMMAND_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatActionSupportEntry>;
