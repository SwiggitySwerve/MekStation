import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

export type PhysicalActionClassScope =
  | 'battlemech'
  | 'mixed'
  | 'non-battlemech';

export interface IPhysicalActionClassScopeEntry extends ICombatFeatureSupportEntry {
  readonly sourceClass: string;
  readonly sourcePath: string;
  readonly battleMechScope: PhysicalActionClassScope;
  readonly runtimeAttackTypes?: readonly string[];
}

function integrated(
  id: string,
  sourceClass: string,
  evidence: string,
  runtimeAttackTypes: readonly string[],
): IPhysicalActionClassScopeEntry {
  return {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope: 'battlemech',
    runtimeAttackTypes,
    level: 'integrated',
    evidence,
  };
}

function unsupportedBattleMech(
  id: string,
  sourceClass: string,
  gap: string,
): IPhysicalActionClassScopeEntry {
  return {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope: 'battlemech',
    level: 'unsupported',
    evidence:
      'MegaMek source class exists, but no MekStation runtime action type is wired',
    gap,
  };
}

function outOfScope(
  id: string,
  sourceClass: string,
  battleMechScope: PhysicalActionClassScope,
  gap: string,
): IPhysicalActionClassScopeEntry {
  return {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope,
    level: 'helper-only',
    evidence:
      'MegaMek source class exists and is intentionally split out of the BattleMech combat validation matrix',
    gap,
  };
}

export const MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES = [
  'AirMekRamAttackAction',
  'BAVibroClawAttackAction',
  'BreakGrappleAttackAction',
  'BrushOffAttackAction',
  'ChargeAttackAction',
  'ClubAttackAction',
  'DfaAttackAction',
  'GrappleAttackAction',
  'JumpJetAttackAction',
  'KickAttackAction',
  'LayExplosivesAttackAction',
  'ProtoMekPhysicalAttackAction',
  'PunchAttackAction',
  'PushAttackAction',
  'RamAttackAction',
  'ThrashAttackAction',
  'TripAttackAction',
] as const;

export const PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT = {
  punch: integrated(
    'punch',
    'PunchAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech punches',
    ['punch'],
  ),
  kick: integrated(
    'kick',
    'KickAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech kicks',
    ['kick'],
  ),
  push: integrated(
    'push',
    'PushAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech pushes with valid displacement',
    ['push'],
  ),
  charge: integrated(
    'charge',
    'ChargeAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech charges with hit and miss displacement',
    ['charge'],
  ),
  dfa: integrated(
    'dfa',
    'DfaAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support valid BattleMech DFA hit and miss displacement',
    ['dfa'],
  ),
  club: integrated(
    'club',
    'ClubAttackAction',
    'MekStation maps BattleMech club-family physical weapons to source-backed hatchet, sword, mace, and lance runtime attack types',
    ['hatchet', 'sword', 'mace', 'lance'],
  ),
  'brush-off': unsupportedBattleMech(
    'brush-off',
    'BrushOffAttackAction',
    'Brush-off against swarming infantry/battle armor has no runtime PhysicalAttackType, tactical command, or resolution path',
  ),
  thrash: unsupportedBattleMech(
    'thrash',
    'ThrashAttackAction',
    'Prone BattleMech thrash attacks against infantry have no runtime PhysicalAttackType, tactical command, or resolution path',
  ),
  trip: unsupportedBattleMech(
    'trip',
    'TripAttackAction',
    'Trip attacks have no runtime PhysicalAttackType, tactical command, or resolution path',
  ),
  grapple: unsupportedBattleMech(
    'grapple',
    'GrappleAttackAction',
    'Grapple attacks have no runtime PhysicalAttackType, tactical command, grapple state, or resolution path',
  ),
  'break-grapple': unsupportedBattleMech(
    'break-grapple',
    'BreakGrappleAttackAction',
    'Breaking grapples has no runtime PhysicalAttackType, tactical command, grapple state, or resolution path',
  ),
  'jump-jet-attack': unsupportedBattleMech(
    'jump-jet-attack',
    'JumpJetAttackAction',
    'Jump-jet attacks have no runtime PhysicalAttackType, tactical command, jump-jet exposure model, or resolution path',
  ),
  'airmek-ram': outOfScope(
    'airmek-ram',
    'AirMekRamAttackAction',
    'non-battlemech',
    'AirMek ram attacks belong in a LAM/AirMek validation matrix, not the BattleMech-only combat suite',
  ),
  'battle-armor-vibro-claw': outOfScope(
    'battle-armor-vibro-claw',
    'BAVibroClawAttackAction',
    'non-battlemech',
    'Battle armor vibro-claw attacks belong in a battle-armor validation matrix',
  ),
  'lay-explosives': outOfScope(
    'lay-explosives',
    'LayExplosivesAttackAction',
    'non-battlemech',
    'Infantry explosive-laying attacks belong in an infantry/building-demolition validation matrix',
  ),
  'protomek-physical': outOfScope(
    'protomek-physical',
    'ProtoMekPhysicalAttackAction',
    'non-battlemech',
    'ProtoMek physical attacks belong in a ProtoMek validation matrix',
  ),
  ram: outOfScope(
    'ram',
    'RamAttackAction',
    'non-battlemech',
    'Aerospace/capital ramming belongs in an aerospace validation matrix',
  ),
} satisfies Record<string, IPhysicalActionClassScopeEntry>;
