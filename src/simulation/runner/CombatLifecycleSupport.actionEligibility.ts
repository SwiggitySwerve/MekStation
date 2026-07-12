/* oxlint-disable max-lines -- Combat support catalogs stay centralized until the OpenSpec change is archived. */

import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  ACTION_REMOVAL_SOURCE_REFS,
  EJECTED_ACTION_SOURCE_REFS,
  EJECTED_TARGETABILITY_SOURCE_REFS,
  LOCAL_EJECTION_SOURCE_REFS,
  LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  RETREATED_ACTION_SOURCE_REFS,
  RETREATED_TARGETABILITY_SOURCE_REFS,
  SHUTDOWN_TARGETABILITY_SOURCE_REFS,
} from './CombatLifecycleSourceRefs';

export const ACTION_ELIGIBILITY_COMBAT_SUPPORT = {
  destroyed: integrated(
    'destroyed',
    'gameStateReducer action predicates plus runner movement/weapon/physical phases skip destroyed units',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  shutdown: integrated(
    'shutdown',
    'gameStateReducer action predicates, interactive action queries, and runner action phases skip shutdown units',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  unconscious: integrated(
    'unconscious',
    'gameStateReducer action predicates, interactive action queries, and runner action phases skip pilotConscious=false units',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  retreated: integrated(
    'retreated',
    'gameStateReducer action predicates, target filters, and runner attack phases skip hasRetreated units',
    RETREATED_ACTION_SOURCE_REFS,
  ),
  ejected: integrated(
    'ejected',
    'UnitEjected reducer, interactive action queries, and runner attack phases skip hasEjected units',
    EJECTED_ACTION_SOURCE_REFS,
  ),
  'shutdown-targetability': integrated(
    'shutdown-targetability',
    'interactive target filtering keeps shutdown enemy units targetable while removing them as actors',
    SHUTDOWN_TARGETABILITY_SOURCE_REFS,
  ),
  'retreated-targetability': integrated(
    'retreated-targetability',
    'interactive, runner, ranged attack, physical attack, and objective target filters reject hasRetreated units as targets',
    RETREATED_TARGETABILITY_SOURCE_REFS,
  ),
  'ejected-targetability': integrated(
    'ejected-targetability',
    'interactive, runner, ranged attack, physical attack, and objective target filters reject hasEjected units as targets',
    EJECTED_TARGETABILITY_SOURCE_REFS,
  ),
  'ejection-damage-preservation': integrated(
    'ejection-damage-preservation',
    'UnitEjected reducer marks hasEjected without mutating armor, structure, destroyed, or pilotConscious',
    LOCAL_EJECTION_SOURCE_REFS,
  ),
  'force-survivor-counts': integrated(
    'force-survivor-counts',
    'checkVictoryConditions excludes destroyed, retreated, and ejected units from remaining force counts',
    LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
