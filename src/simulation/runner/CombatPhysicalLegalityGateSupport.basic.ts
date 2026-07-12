import type { IPhysicalLegalityGateSupportEntry } from './CombatPhysicalLegalityGateSupport.types';

import * as physicalAuthority from './CombatPhysicalLegalityGateSupport.authorities';
import { integrated } from './CombatPhysicalLegalityGateSupport.builders';

export const BASIC_PHYSICAL_LEGALITY_GATE_SUPPORT = {
  'punch.selected-arm-present': integrated(
    'punch.selected-arm-present',
    'punch',
    'canPunch consumes attackerDestroyedLocations and rejects the selected punching arm as LimbMissing; eligibility, event-sourced declaration, and runner resolution thread unit destroyedLocations into the same helper',
    physicalAuthority.PUNCH_ACTION_LINES,
  ),
  'kick.both-legs-present': integrated(
    'kick.both-legs-present',
    'kick',
    'canKick consumes attackerDestroyedLocations and rejects missing left or right BattleMech legs as LimbMissing; eligibility, event-sourced declaration, and runner resolution thread unit destroyedLocations into the same helper',
    physicalAuthority.KICK_ACTION_LINES,
  ),
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
