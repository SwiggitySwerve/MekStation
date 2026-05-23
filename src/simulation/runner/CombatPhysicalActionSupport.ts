import type { PhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

import type { ICombatActionSupportEntry } from './CombatActionSupport';

function integrated(
  id: PhysicalAttackType,
  evidence: string,
): ICombatActionSupportEntry {
  return { id, layer: 'physical-attack-type', level: 'integrated', evidence };
}

export const PHYSICAL_ATTACK_ACTION_SUPPORT = {
  punch: integrated(
    'punch',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support punch',
  ),
  kick: integrated(
    'kick',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support kick',
  ),
  charge: integrated(
    'charge',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support charge, including automatic runner selection after running, target displacement, and attacker follow-through',
  ),
  dfa: integrated(
    'dfa',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support death from above, including automatic runner selection after jumping plus valid hit/miss displacement payloads',
  ),
  push: integrated(
    'push',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical phase support push, including target displacement and attacker follow-through',
  ),
  hatchet: integrated(
    'hatchet',
    'physical.club command commits hatchet and runner physical weapon support resolves hatchet damage',
  ),
  sword: integrated(
    'sword',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve sword',
  ),
  mace: integrated(
    'mace',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve mace',
  ),
  lance: integrated(
    'lance',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve lance',
  ),
  'retractable-blade': integrated(
    'retractable-blade',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve retractable blade',
  ),
  flail: integrated(
    'flail',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve source-backed flail',
  ),
  'wrecking-ball': integrated(
    'wrecking-ball',
    'Tactical command, game intent, wire schema, dispatcher, and runner physical weapon support resolve source-backed wrecking ball',
  ),
} satisfies Record<PhysicalAttackType, ICombatActionSupportEntry>;
