import { combatFeatureSourceRef as pilotModifierApplicationSourceRef } from './CombatFeatureSourceReference';
import { type ICombatFeatureSourceReference } from './CombatFeatureSupport';
import { MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS } from './CombatPilotModifierSourceRefs';

export const MEGAMEK_EAGLE_EYES_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEKSTATION_EAGLE_EYES_ACTIVE_PROBE_RANGE_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Entity.getBAPRange adds a +1 active-probe range bonus when the pilot has MISC_EAGLE_EYES.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EAGLE_EYES_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6033-L6056`,
    MEGAMEK_EAGLE_EYES_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation represented active-probe ECM counter range accepts eagleEyesRangeBonus and adds one hex without changing base probe ranges.',
    'src/utils/gameplay/electronicWarfare/probes.ts#L20-L37',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation createInitialState seeds eagleEyesRangeBonus from hydrated fullUnit ability ids for represented active-probe state.',
    'src/simulation/runner/SimulationRunnerState.ts#L120-L131',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation electronic warfare coverage proves Eagle Eyes extends represented active-probe Guardian ECM countering by one hex.',
    'src/utils/gameplay/__tests__/electronicWarfare.test.ts#L493-L547',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation GameCreated coverage proves hydrated eagle_eyes ability state is projected onto active probes as eagleEyesRangeBonus.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L283-L321',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EAGLE_EYES_MINEFIELD_DETONATION_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EAGLE_EYES_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7498-L7506`,
    MEGAMEK_EAGLE_EYES_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation represented TerrainType.Mines entry damage resolves a deterministic minefield detonation target roll and applies Eagle Eyes +2 target-number relief before BattleMech leg damage.',
    'src/simulation/runner/phases/movementMines.ts#L132-L774',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L1917-L1965',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_TRIPLE_CORE_PROCESSOR_AIMED_SHOT_SOURCE_REFS = [
  ...MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS.filter(
    ({ citation }) =>
      citation.includes('AimedShot') || citation.includes('aimed-shot'),
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation buildWeaponAttackAttackerToHitState grants represented targeting-computer eligibility for called-shot attacks only when Triple-Core Processor is paired with VDNI or Buffered VDNI.',
    'src/utils/gameplay/toHit/stateHydration.ts#L36-L52',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation shared to-hit state hydration tests prove Triple-Core Processor plus VDNI grants called-shot targeting-computer eligibility and fails closed without called-shot intent or neural-interface pairing.',
    'src/utils/gameplay/toHit/__tests__/stateHydration.test.ts#L61-L99',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation interactive declareAttack coverage proves Triple-Core Processor plus VDNI applies both the TacOps called-shot penalty and represented Targeting Computer -1 relief.',
    'src/utils/gameplay/__tests__/declareAttack.toHitStateHydration.test.ts#L487-L528',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runner weapon-attack coverage proves Triple-Core Processor plus Buffered VDNI applies both the TacOps called-shot penalty and represented Targeting Computer -1 relief in AttackDeclared events.',
    'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts#L2377-L2425',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
