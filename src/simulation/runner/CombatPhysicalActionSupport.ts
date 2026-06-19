import type { PhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

import type { ICombatActionSupportEntry } from './CombatActionSupport';
import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import { MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS } from './CombatActionSupport';

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatActionSupportEntry {
  return sourceRefs
    ? {
        id,
        layer: 'physical-attack-type',
        level: 'integrated',
        evidence,
        sourceRefs,
      }
    : {
        id,
        layer: 'physical-attack-type',
        level: 'integrated',
        evidence,
      };
}

const PHYSICAL_ATTACK_COMMAND_SOURCE_REFS = {
  punch: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.punch'],
  kick: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.kick'],
  charge: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.charge'],
  dfa: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.dfa'],
  push: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.push'],
  trip: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.trip'],
  thrash: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.thrash'],
  'jump-jet-attack':
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.jump-jet-attack'],
  'brush-off': MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.brush-off'],
  grapple: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.grapple'],
  'break-grapple':
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.break-grapple'],
  hatchet: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.club'],
  sword: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.sword'],
  mace: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.mace'],
  lance: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.lance'],
  'retractable-blade':
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.retractable-blade'],
  flail: MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.flail'],
  'wrecking-ball':
    MEKSTATION_PHYSICAL_COMMAND_SOURCE_REFS['physical.wrecking-ball'],
} satisfies Record<
  PhysicalAttackType,
  readonly ICombatFeatureSourceReference[]
>;

export const PHYSICAL_ATTACK_ACTION_SUPPORT = {
  punch: integrated(
    'punch',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support punch',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.punch,
  ),
  kick: integrated(
    'kick',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support kick',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.kick,
  ),
  charge: integrated(
    'charge',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support charge, including automatic runner selection after running, target displacement, and attacker follow-through',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.charge,
  ),
  dfa: integrated(
    'dfa',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support death from above, including automatic runner selection after jumping plus valid hit/miss displacement payloads',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.dfa,
  ),
  push: integrated(
    'push',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support push, including target displacement and attacker follow-through',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.push,
  ),
  trip: integrated(
    'trip',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support optional TacOps trip as a zero-damage target-PSR attack',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.trip,
  ),
  thrash: integrated(
    'thrash',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support prone BattleMech same-hex thrash as an automatic-hit infantry attack with attacker PSR',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.thrash,
  ),
  'jump-jet-attack': integrated(
    'jump-jet-attack',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support optional TacOps jump-jet attack with selected-leg damage and no self-PSR side effects',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS['jump-jet-attack'],
  ),
  'brush-off': integrated(
    'brush-off',
    'Tactical command, game intent, wire schema, dispatcher, event-sourced physical resolution, and runner physical phase support source-backed brush-off against swarming infantry, including hit dislodgement and miss self-damage',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS['brush-off'],
  ),
  grapple: integrated(
    'grapple',
    'Tactical command, game intent, wire schema, dispatcher, event-sourced physical resolution, and runner physical phase support source-backed normal TacOps grapple state without damage',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.grapple,
  ),
  'break-grapple': integrated(
    'break-grapple',
    'Tactical command, game intent, wire schema, dispatcher, event-sourced physical resolution, and runner physical phase support source-backed normal TacOps break-grapple state clearing without damage',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS['break-grapple'],
  ),
  hatchet: integrated(
    'hatchet',
    'physical.club command commits hatchet and runner physical weapon support resolves hatchet damage',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.hatchet,
  ),
  sword: integrated(
    'sword',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve sword',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.sword,
  ),
  mace: integrated(
    'mace',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve mace',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.mace,
  ),
  lance: integrated(
    'lance',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve lance',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.lance,
  ),
  'retractable-blade': integrated(
    'retractable-blade',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve retractable blade',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS['retractable-blade'],
  ),
  flail: integrated(
    'flail',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve source-backed flail',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS.flail,
  ),
  'wrecking-ball': integrated(
    'wrecking-ball',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve source-backed wrecking ball',
    PHYSICAL_ATTACK_COMMAND_SOURCE_REFS['wrecking-ball'],
  ),
} satisfies Record<PhysicalAttackType, ICombatActionSupportEntry>;
