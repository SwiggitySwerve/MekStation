/* oxlint-disable max-lines -- Combat support catalogs stay centralized until the OpenSpec change is archived. */

import { type ICombatFeatureSourceReference } from './CombatFeatureSupport';

export const MEGAMEK_COMBAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
export const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

export const OUT_OF_CONTROL_PSR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16908-L16920`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation createOutOfControlPSR stamps represented out_of_control pending PSRs and runPSRPhase resolves them through standard PSR target-number modifiers.',
    url: 'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L111',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const CONTROLLED_SIDESLIP_PSR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.checkSideSlip queues a controlled-sideslip piloting roll at -1 unless walking Maneuvering Ace suppresses the check.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L11988-L11995`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation queueMovementControlPSRs emits PSRTrigger.ControlledSideslip for represented lateral movement steps and suppresses walking Maneuvering Ace lateral shifts.',
    url: 'src/simulation/runner/phases/movementControlPsr.ts#L34-L91',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation createControlledSideslipPSR stamps the controlled_sideslip reason code, -1 modifier, and optional movement-step trigger source.',
    url: 'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L111-L127',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const FLANKING_AND_TURNING_PSR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.checkSideSlip queues a flanking-and-turning piloting roll when run or sprint movement changes facing after moving more than one hex, with Maneuvering Ace applying -1.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L11968-L11987`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation createFlankingAndTurningPSR stamps the flanking_and_turning reason code and optional movement-step trigger source for represented pending PSR consumers.',
    url: 'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L133-L143',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation queueMovementControlPSRs emits represented flanking-and-turning movement-step PSRs for BattleMech run/sprint moves that turn after moving more than one hex.',
    url: 'src/simulation/runner/phases/movementControlPsr.ts#L47-L221',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculatePSRModifiers consumes Maneuvering Ace relief for represented flanking_and_turning pending PSRs without claiming movement declaration producer parity.',
    url: 'src/utils/gameplay/pilotingSkillRolls/modifierResolution.ts#L326-L377',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PSR_QUEUE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Game.addPSR stores PilotingRollData in the pending phase queue and Game.getPSRs exposes that queue for later resolution.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/common/game/Game.java#L2505-L2521`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek resolvePilotingRolls consumes game.getPSRs, combines cumulative PSR modifiers, rolls piloting skill, applies fall handling on failure, and resets the PSR queue.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16289-L16636`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_FAILED_PSR_FALL_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek doSkillCheckWhileMoving rolls piloting skill and routes failed fall PSRs into doEntityFallsInto when the failure should cause a fall.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L8666-L8736`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek doEntityFall rolls pilot fall-damage avoidance after fall damage and applies pilot damage when that avoidance roll fails.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23233-L23357`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const LOCAL_PSR_RESOLUTION_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runPSRPhase resolves unit.pendingPSRs, emits PSRResolved/UnitFell/PilotHit/UnitDestroyed, and clears pendingPSRs after resolution.',
    url: 'src/simulation/runner/phases/postCombatPsr.ts#L272-L323',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolveAllPSRs computes target numbers, rolls each pending PSR, reports first failure as unitFell, and returns clearedPSRs for skipped queue entries.',
    url: 'src/utils/gameplay/pilotingSkillRolls/resolution.ts#L148-L268',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolvePendingPSRs mirrors interactive/session PSR resolution, fall emission, fall-sourced PilotHit emission, and reasonCode propagation.',
    url: 'src/utils/gameplay/gameSessionPSRResolution.ts#L54-L410',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const LOCAL_PSR_REASON_CODE_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation applyPSRTriggered preserves PSRTriggered.reasonCode into unit.pendingPSRs and applyUnitFell clears pending PSRs after fall resolution.',
    url: 'src/utils/gameplay/gameState/pilotingState.ts#L14-L64',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation queueRunnerShutdownPSR stamps heat-shutdown PSR triggers with createShutdownPSR reasonCode and appends the pending PSR.',
    url: 'src/simulation/runner/phases/heatShutdownPsr.ts#L9-L37',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const PSR_ROLL_RESOLUTION_SOURCE_REFS = [
  ...MEGAMEK_PSR_QUEUE_SOURCE_REFS,
  ...LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PSR_REASON_CODE_SOURCE_REFS = [
  ...LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_PSR_REASON_CODE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PSR_FALL_SOURCE_REFS = [
  ...MEGAMEK_FAILED_PSR_FALL_SOURCE_REFS,
  ...LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
