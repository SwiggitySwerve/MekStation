import {
  MOVEMENT_ENHANCEMENT_DEFINITIONS,
  MovementEnhancementType,
} from '@/types/construction/MovementEnhancement';

import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_MOVEMENT_SOURCE_VERSION } from './CombatRuleSupport.sourceRefs';

const MEGAMEK_TSM_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek BipedMek.getWalkMP applies active TSM as +2 walk MP at heat 9+ after heat movement penalties.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/BipedMek.java#L258-L268`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek QuadMek.getWalkMP applies the same active TSM +2 walk MP gate for quad BattleMechs.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/QuadMek.java#L342-L352`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getRunMP derives running MP from the heat/TSM-adjusted walk MP.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L993-L1007`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getRunMP asks armed MASC/Supercharger boosters to calculate boosted running MP from current walk MP.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L993-L1007`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MPBoosters.calculateRunMP doubles walk MP for MASC xor Supercharger and uses ceil(walk MP * 2.5) when both are active.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/enums/MPBoosters.java#L79-L86`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePathHandler checks active MASC/Supercharger on the first movement step and invokes the failure checks during movement resolution.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L1507-L1519`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity stores the standard MASC/Supercharger fixed failure target-number table used by prior-use turn count.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L858-L860`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity derives MASC and Supercharger failure targets from previous consecutive-use turn counters, then increments used boosters, clears active-use flags, and applies the idle decay marker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13660-L13770`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MASC failure applies one random hittable critical slot in each leg and explicitly does not destroy the MASC system.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13966-L13976`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Supercharger failure rolls a separate engine-damage table, damages the Supercharger slot, and then applies the resulting critical slots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L6022-L6048`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5944-L5974`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5994-L6024`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS = [
  ...MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MPBoosters.calculateSprintMP uses ceil(walk MP * 2.5) for one active MASC/Supercharger booster and 3x walk MP when both are active.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/enums/MPBoosters.java#L89-L97`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity stores standard, alternate, and alternate-enhanced MASC/Supercharger failure target-number tables selected by advanced game options.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L858-L860`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity chooses the active MASC/Supercharger failure target table from alternate_masc and alternate_masc_enhanced game options.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13763-L13769`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_SUPERCHARGER_NON_BATTLEMECH_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Supercharger equipment is legal for Mek, Tank, and Support Tank unit families, so vehicle branches are separate from the BattleMech suite.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/equipment/MiscType.java#L2415-L2426`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek applies a -1 Supercharger failure roll adjustment for IndustrialMek, SupportTank, and SupportVTOL units.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13846-L13852`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek non-Mek Supercharger failure maps engine-table hits into Tank and VTOL motive-system critical branches rather than BattleMech center-torso engine slots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13915-L13954`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager marks a non-Mek Supercharger mount hit directly, while Mek Supercharger failure applies the matching mounted critical slot first.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L6022-L6048`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PARTIAL_WING_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getJumpMP applies a Partial Wing jump bonus only when the Mek already has positive jump MP, and getPartialWingJumpBonus subtracts bad torso critical slots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L1081-L1231`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getJumpHeat subtracts the Partial Wing jump bonus from moved MP before engine jump heat is applied.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L1281-L1301`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MiscType creates IS and Clan Partial Wing equipment with Mek and F_PARTIAL_WING flags.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/equipment/MiscType.java#L2278-L2314`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT = {
  [MovementEnhancementType.MASC]: integrated(
    MovementEnhancementType.MASC,
    'UnitHydration detects installed MASC, runMovementPhase consumes explicit active MASC run and sprint MP, movementEnhancementPsr queues createMASCFailurePSR before MovementDeclared with source-backed standard, alternate_masc, and alternate_masc_enhanced fixed failure target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and applies one critical hit to each leg when the final check fails, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers expose sprint_masc formula support',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  'masc-battlemech-represented-side-paths': integrated(
    'masc-battlemech-represented-side-paths',
    'Represented BattleMech MASC side-path accounting covers replayable activation, active run/sprint MP expansion, pre-MovementDeclared failure trigger stamping, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge reroll consumption, failed-check leg critical damage, prior-use counter lifecycle, active-use clearing, and construction sprint_masc formula support',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  'masc-side-paths': integrated(
    'masc-side-paths',
    'Represented BattleMech MASC side-path accounting covers replayable activation, active run/sprint MP expansion, named MASC failure trigger source stamping before MovementDeclared, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge rerolls, failed-check leg critical damage, prior-use counter lifecycle, and active-use clearing without queuing side effects for validation-rejected movement',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  [MovementEnhancementType.SUPERCHARGER]: integrated(
    MovementEnhancementType.SUPERCHARGER,
    'UnitHydration detects installed Supercharger, runMovementPhase consumes explicit active Supercharger run and sprint MP, movementEnhancementPsr queues createSuperchargerFailurePSR before MovementDeclared with source-backed standard, alternate_masc, and alternate_masc_enhanced fixed failure target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and destroys the Supercharger slot plus applies the source-backed engine critical table when the final check fails, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers expose sprint_combined formula support',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  'supercharger-battlemech-represented-side-paths': integrated(
    'supercharger-battlemech-represented-side-paths',
    'Represented BattleMech Supercharger side-path accounting covers replayable activation, active run/sprint MP expansion, pre-MovementDeclared failure trigger stamping, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge reroll consumption, failed-check Supercharger slot plus engine-table damage, prior-use counter lifecycle, active-use clearing, and construction sprint_combined formula support',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  'supercharger-side-paths': integrated(
    'supercharger-side-paths',
    'Represented BattleMech Supercharger side-path accounting covers replayable activation, active run/sprint MP expansion, named Supercharger failure trigger source stamping before MovementDeclared, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge rerolls, failed-check Supercharger slot plus engine-table damage, prior-use counter lifecycle, and active-use clearing without queuing side effects for validation-rejected movement',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  'supercharger-non-battlemech-side-paths': outOfScope(
    'supercharger-non-battlemech-side-paths',
    'MegaMek Supercharger has explicit Tank, SupportTank, SupportVTOL, and non-Mek failure-damage branches, but this catalog is scoped to BattleMech combat validation',
    'Non-BattleMech Supercharger support-unit roll adjustment and vehicle motive-damage branches stay outside this BattleMech suite instead of being counted as BattleMech movement-enhancement blockers',
    MEGAMEK_SUPERCHARGER_NON_BATTLEMECH_SOURCE_REFS,
  ),
  [MovementEnhancementType.TSM]: integrated(
    MovementEnhancementType.TSM,
    'UnitHydration, physical damage resolution, getHeatAdjustedMovementCapability, and runMovementPhase consume source-backed active TSM for heat-gated melee damage and movement validation',
    MEGAMEK_TSM_MOVEMENT_SOURCE_REFS,
  ),
  [MovementEnhancementType.PARTIAL_WING]: integrated(
    MovementEnhancementType.PARTIAL_WING,
    'UnitHydration derives source-backed BattleMech Partial Wing jump bonus state, runMovementPhase applies it only when base jump MP exists, and validateMovement subtracts it from generated jump heat',
    MEGAMEK_PARTIAL_WING_MOVEMENT_SOURCE_REFS,
  ),
} satisfies Record<
  (typeof MOVEMENT_ENHANCEMENT_DEFINITIONS)[number]['type'],
  ICombatFeatureSupportEntry
> &
  Record<string, ICombatFeatureSupportEntry>;
