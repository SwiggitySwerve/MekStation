import { buildFacingCommands } from '@/components/gameplay/TacticalActionDock/commands/facingCommands';
import { buildGmReferralCommands } from '@/components/gameplay/TacticalActionDock/commands/gmReferralCommands';
import { buildHeatEndCommands } from '@/components/gameplay/TacticalActionDock/commands/heatEndCommands';
import { buildMovementCommands } from '@/components/gameplay/TacticalActionDock/commands/movementCommands';
import { buildPhysicalAttackCommands } from '@/components/gameplay/TacticalActionDock/commands/physicalAttackCommands';
import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import { buildWeaponAttackCommands } from '@/components/gameplay/TacticalActionDock/commands/weaponAttackCommands';
import {
  activateMovementEnhancementIntent,
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  goProneIntent,
  requestSpotIntent,
  standIntent,
  toServerIntent,
  torsoTwistIntent,
  withdrawIntent,
} from '@/lib/multiplayer/gameIntentMap';
import {
  GameSide,
  GAME_INTENT_TYPES,
  MovementType,
  type IGameIntent,
  type ITacticalCommand,
} from '@/types/gameplay';
import { SUPPORTED_PHYSICAL_ATTACK_TYPES } from '@/utils/gameplay/physicalAttacks/types';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  ENGINE_WIRE_COMBAT_INTENT_KINDS,
  GAME_INTENT_ACTION_SUPPORT,
  GAME_INTENT_TO_WIRE_KIND,
  GM_COMMAND_EXCLUSION_SUPPORT,
  NON_COMBAT_WIRE_INTENT_KINDS,
  P2P_INTENT_TRANSLATION_SUPPORT,
  WIRE_INTENT_KIND_ACTION_SUPPORT,
} from '../CombatActionSupport';
import {
  MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES,
  PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
} from '../CombatPhysicalActionClassScopeSupport';
import { PHYSICAL_ATTACK_ACTION_SUPPORT } from '../CombatPhysicalActionSupport';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from '../CombatPhysicalLegalityGateSupport';

export function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

export function commandIds(
  commands: readonly ITacticalCommand[],
): readonly string[] {
  return commands.map((command) => command.id).sort();
}

export function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

export function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

export {
  buildFacingCommands,
  buildGmReferralCommands,
  buildHeatEndCommands,
  buildMovementCommands,
  buildPhysicalAttackCommands,
  buildUtilityCommands,
  buildWeaponAttackCommands,
  activateMovementEnhancementIntent,
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  goProneIntent,
  requestSpotIntent,
  standIntent,
  toServerIntent,
  torsoTwistIntent,
  withdrawIntent,
  GameSide,
  GAME_INTENT_TYPES,
  MovementType,
  SUPPORTED_PHYSICAL_ATTACK_TYPES,
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  ENGINE_WIRE_COMBAT_INTENT_KINDS,
  GAME_INTENT_ACTION_SUPPORT,
  GAME_INTENT_TO_WIRE_KIND,
  GM_COMMAND_EXCLUSION_SUPPORT,
  NON_COMBAT_WIRE_INTENT_KINDS,
  P2P_INTENT_TRANSLATION_SUPPORT,
  WIRE_INTENT_KIND_ACTION_SUPPORT,
  MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES,
  PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
  PHYSICAL_ATTACK_ACTION_SUPPORT,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
};

export type { IGameIntent, ITacticalCommand, ICombatFeatureSupportEntry };
