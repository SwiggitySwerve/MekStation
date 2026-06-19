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
  'gm.set-damage': outOfScope(
    'gm.set-damage',
    'tactical-command',
    'buildGmReferralCommands exposes gm.set-damage as a GM shell-mode command outside player BattleMech combat action handling',
    'GM referee commands are shell-mode tools, not player BattleMech combat actions',
    MEKSTATION_GM_COMMAND_SOURCE_REFS['gm.set-damage'],
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
