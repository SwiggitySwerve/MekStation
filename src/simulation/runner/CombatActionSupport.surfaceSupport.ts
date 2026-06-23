import type { ICombatActionSupportEntry } from './CombatActionSupport.types';

import { integrated, outOfScope } from './CombatActionSupport.entries';
import {
  MEKSTATION_GM_COMMAND_SOURCE_REFS,
  MEKSTATION_WITHDRAW_CONTROL_SOURCE_REFS,
} from './CombatActionSupport.physicalUtilitySourceRefs';

export const GM_COMMAND_EXCLUSION_SUPPORT = {
  'gm.advance-phase': outOfScope(
    'gm.advance-phase',
    'tactical-command',
    'buildGmReferralCommands exposes gm.advance-phase as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.advance-phase'],
  ),
  'gm.set-position-facing': outOfScope(
    'gm.set-position-facing',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-position-facing as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-position-facing'],
  ),
  'gm.set-damage': outOfScope(
    'gm.set-damage',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-damage as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-damage'],
  ),
  'gm.set-heat-ammo': outOfScope(
    'gm.set-heat-ammo',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-heat-ammo as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-heat-ammo'],
  ),
  'gm.set-initiative': outOfScope(
    'gm.set-initiative',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-initiative as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-initiative'],
  ),
  'gm.set-lifecycle': outOfScope(
    'gm.set-lifecycle',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-lifecycle as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-lifecycle'],
  ),
  'gm.correct-attack': outOfScope(
    'gm.correct-attack',
    'tactical-command',
    'buildGmReferralCommands exposes gm.correct-attack as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.correct-attack'],
  ),
  'gm.set-objective': outOfScope(
    'gm.set-objective',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-objective as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-objective'],
  ),
  'gm.reload-unit': outOfScope(
    'gm.reload-unit',
    'tactical-command',
    'buildGmReferralCommands exposes gm.reload-unit as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.reload-unit'],
  ),
  'gm.grant-resource': outOfScope(
    'gm.grant-resource',
    'tactical-command',
    'buildGmReferralCommands exposes gm.grant-resource as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.grant-resource'],
  ),
} satisfies Record<string, ICombatActionSupportEntry>;

export const BATTLEMECH_ABSENT_ACTION_SUPPORT = {} satisfies Record<
  string,
  ICombatActionSupportEntry
>;
export const COMBAT_DIRECT_UI_ACTION_SUPPORT = {
  'utility.withdraw-control': integrated(
    'utility.withdraw-control',
    'direct-ui-control',
    'WithdrawControl collects the withdrawal edge and calls InteractiveSession.declareWithdrawal(unitId, edge), which feeds the same withdrawal state/event lifecycle as the Withdraw wire intent',
    MEKSTATION_WITHDRAW_CONTROL_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatActionSupportEntry>;
