import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

const MEGAMEK_PHYSICAL_ACTION_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekPhysicalActionRef(
  citation: string,
  sourceClass: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_ACTION_SOURCE_VERSION}/megamek/src/megamek/common/actions/${sourceClass}.java#${lineRange}`,
    sourceVersion: MEGAMEK_PHYSICAL_ACTION_SOURCE_VERSION,
  };
}

const MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS = {
  'brush-off': [
    megamekPhysicalActionRef(
      'MegaMek BrushOffAttackAction models BattleMech brush-off attacks against swarming infantry or iNarc pods with arm, prone, target, and actuator gates.',
      'BrushOffAttackAction',
      'L123-L216',
    ),
  ],
  thrash: [
    megamekPhysicalActionRef(
      'MegaMek ThrashAttackAction models prone BattleMech thrash attacks against infantry in same-hex clear/pavement terrain with automatic-success damage.',
      'ThrashAttackAction',
      'L112-L189',
    ),
  ],
  trip: [
    megamekPhysicalActionRef(
      'MegaMek TripAttackAction models optional TacOps BattleMech trip attacks with Mek-only, facing, range, elevation, prone-state, limb, and actuator gates.',
      'TripAttackAction',
      'L75-L204',
    ),
  ],
  grapple: [
    megamekPhysicalActionRef(
      'MegaMek GrappleAttackAction models optional grappling for biped Meks and ProtoMeks with grapple state, arm, range, elevation, facing, prone-state, weapon-fire, and weight-class handling.',
      'GrappleAttackAction',
      'L93-L352',
    ),
  ],
  'break-grapple': [
    megamekPhysicalActionRef(
      'MegaMek BreakGrappleAttackAction models optional break-grapple attempts with grapple state, chain-whip, actuator, automatic-success, and weight-class handling.',
      'BreakGrappleAttackAction',
      'L81-L169',
    ),
  ],
  'jump-jet-attack': [
    megamekPhysicalActionRef(
      'MegaMek JumpJetAttackAction models optional TacOps jump-jet attacks with jump-jet damage, leg availability, prior-jump, weapon-fire, range, elevation, facing, and building auto-hit gates.',
      'JumpJetAttackAction',
      'L89-L287',
    ),
  ],
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;

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
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): IPhysicalActionClassScopeEntry {
  const entry: IPhysicalActionClassScopeEntry = {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope: 'battlemech',
    level: 'unsupported',
    evidence:
      'MegaMek source class exists, but no MekStation runtime action type is wired',
    gap,
  };

  return sourceRefs ? { ...entry, sourceRefs } : entry;
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
    'MekStation maps BattleMech club-family physical weapons to source-backed hatchet, sword, mace, lance, and retractable blade runtime attack types',
    ['hatchet', 'sword', 'mace', 'lance', 'retractable-blade'],
  ),
  'brush-off': unsupportedBattleMech(
    'brush-off',
    'BrushOffAttackAction',
    'Brush-off against swarming infantry/battle armor has no runtime PhysicalAttackType, tactical command, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS['brush-off'],
  ),
  thrash: unsupportedBattleMech(
    'thrash',
    'ThrashAttackAction',
    'Prone BattleMech thrash attacks against infantry have no runtime PhysicalAttackType, tactical command, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.thrash,
  ),
  trip: unsupportedBattleMech(
    'trip',
    'TripAttackAction',
    'Trip attacks have no runtime PhysicalAttackType, tactical command, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.trip,
  ),
  grapple: unsupportedBattleMech(
    'grapple',
    'GrappleAttackAction',
    'Grapple attacks have no runtime PhysicalAttackType, tactical command, grapple state, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.grapple,
  ),
  'break-grapple': unsupportedBattleMech(
    'break-grapple',
    'BreakGrappleAttackAction',
    'Breaking grapples has no runtime PhysicalAttackType, tactical command, grapple state, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS['break-grapple'],
  ),
  'jump-jet-attack': unsupportedBattleMech(
    'jump-jet-attack',
    'JumpJetAttackAction',
    'Jump-jet attacks have no runtime PhysicalAttackType, tactical command, jump-jet exposure model, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS['jump-jet-attack'],
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
