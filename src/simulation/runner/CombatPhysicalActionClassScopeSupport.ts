import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { MEKSTATION_PHYSICAL_ACTION_HELPER_REFS } from './CombatPhysicalActionClassHelperRefs';

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
      'L81-L175',
    ),
    megamekPhysicalActionRef(
      'MegaMek GrappleAttackAction supplies the shared grapple weight-class modifier branches reused by break-grapple attempts.',
      'GrappleAttackAction',
      'L203-L212',
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

const MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS = {
  punch: [
    megamekPhysicalActionRef(
      'MegaMek PunchAttackAction models BattleMech punch legality, to-hit, and damage boundaries.',
      'PunchAttackAction',
      'L65-L229',
    ),
  ],
  kick: [
    megamekPhysicalActionRef(
      'MegaMek KickAttackAction models BattleMech kick legality, to-hit, and damage boundaries.',
      'KickAttackAction',
      'L61-L277',
    ),
  ],
  push: [
    megamekPhysicalActionRef(
      'MegaMek PushAttackAction models BattleMech push legality, to-hit, and displacement boundaries.',
      'PushAttackAction',
      'L58-L292',
    ),
  ],
  charge: [
    megamekPhysicalActionRef(
      'MegaMek ChargeAttackAction models BattleMech charge legality, to-hit, and displacement boundaries.',
      'ChargeAttackAction',
      'L64-L394',
    ),
  ],
  dfa: [
    megamekPhysicalActionRef(
      'MegaMek DfaAttackAction models death-from-above legality, to-hit, displacement, and damage boundaries.',
      'DfaAttackAction',
      'L70-L355',
    ),
  ],
  club: [
    megamekPhysicalActionRef(
      'MegaMek ClubAttackAction models BattleMech club and melee-weapon damage, to-hit, and legality boundaries.',
      'ClubAttackAction',
      'L65-L517',
    ),
  ],
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;

const MEGAMEK_NON_BATTLEMECH_PHYSICAL_ACTION_REFS = {
  'airmek-ram': [
    megamekPhysicalActionRef(
      'MegaMek AirMekRamAttackAction is gated to airborne LandAirMek ram attacks rather than standard BattleMech physical attacks.',
      'AirMekRamAttackAction',
      'L68-L118',
    ),
  ],
  'battle-armor-vibro-claw': [
    megamekPhysicalActionRef(
      'MegaMek BAVibroClawAttackAction is gated to BattleArmor attackers and infantry targets.',
      'BAVibroClawAttackAction',
      'L54-L143',
    ),
  ],
  'lay-explosives': [
    megamekPhysicalActionRef(
      'MegaMek LayExplosivesAttackAction is gated to infantry attackers laying explosives against buildings.',
      'LayExplosivesAttackAction',
      'L50-L115',
    ),
  ],
  'protomek-physical': [
    megamekPhysicalActionRef(
      'MegaMek ProtoMekPhysicalAttackAction is gated to ProtoMek combo physical attacks.',
      'ProtoMekPhysicalAttackAction',
      'L57-L168',
    ),
  ],
  ram: [
    megamekPhysicalActionRef(
      'MegaMek RamAttackAction is gated to Aero ramming, separate from ground BattleMech physical attacks.',
      'RamAttackAction',
      'L69-L119',
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
  sourceRefs: readonly ICombatFeatureSourceReference[],
): IPhysicalActionClassScopeEntry {
  return {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope: 'battlemech',
    runtimeAttackTypes,
    level: 'integrated',
    evidence,
    sourceRefs,
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
function helperOnlyBattleMech(
  id: string,
  sourceClass: string,
  evidence: string,
  gap: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): IPhysicalActionClassScopeEntry {
  return {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope: 'battlemech',
    level: 'helper-only',
    evidence,
    gap,
    sourceRefs,
  };
}
function outOfScope(
  id: string,
  sourceClass: string,
  battleMechScope: PhysicalActionClassScope,
  gap: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): IPhysicalActionClassScopeEntry {
  return {
    id,
    sourceClass,
    sourcePath: `E:/Projects/megamek/megamek/src/megamek/common/actions/${sourceClass}.java`,
    battleMechScope,
    level: 'out-of-scope',
    evidence:
      'MegaMek source class exists and is intentionally split out of the BattleMech combat validation matrix',
    gap,
    sourceRefs,
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
    MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.punch,
  ),
  kick: integrated(
    'kick',
    'KickAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech kicks',
    ['kick'],
    MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.kick,
  ),
  push: integrated(
    'push',
    'PushAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech pushes with valid displacement',
    ['push'],
    MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.push,
  ),
  charge: integrated(
    'charge',
    'ChargeAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support BattleMech charges with hit and miss displacement',
    ['charge'],
    MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.charge,
  ),
  dfa: integrated(
    'dfa',
    'DfaAttackAction',
    'MekStation runtime PhysicalAttackType, tactical command, runner, and event-sourced physical resolution support valid BattleMech DFA hit and miss displacement',
    ['dfa'],
    MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.dfa,
  ),
  club: integrated(
    'club',
    'ClubAttackAction',
    'MekStation maps BattleMech club-family physical weapons to source-backed hatchet, sword, mace, lance, and retractable blade runtime attack types',
    ['hatchet', 'sword', 'mace', 'lance', 'retractable-blade'],
    MEGAMEK_SUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.club,
  ),
  'brush-off': helperOnlyBattleMech(
    'brush-off',
    'BrushOffAttackAction',
    'canBrushOff helper coverage applies source-backed swarming-infantry/iNarc target legality, arm gates, dedicated brush-off modifiers, and punch-equivalent damage',
    'Brush-off attacks still have no runtime PhysicalAttackType, tactical command, event-sourced declaration, miss self-damage handling, or resolution path',
    [
      ...MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS['brush-off'],
      ...MEKSTATION_PHYSICAL_ACTION_HELPER_REFS['brush-off'],
    ],
  ),
  thrash: helperOnlyBattleMech(
    'thrash',
    'ThrashAttackAction',
    'canThrash helper coverage applies source-backed prone-Mek same-hex infantry legality gates, automatic-success classification, and weight-based damage',
    'Thrash attacks still have no runtime PhysicalAttackType, tactical command, event-sourced declaration, miss/self-damage PSR handling, or resolution path',
    [
      ...MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.thrash,
      ...MEKSTATION_PHYSICAL_ACTION_HELPER_REFS.thrash,
    ],
  ),
  trip: helperOnlyBattleMech(
    'trip',
    'TripAttackAction',
    'canTrip helper coverage applies source-backed optional TacOps trip legality gates and exposes the Trip base to-hit adjustment',
    'Trip attacks still have no runtime PhysicalAttackType, tactical command, event-sourced declaration, or resolution path',
    [
      ...MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.trip,
      ...MEKSTATION_PHYSICAL_ACTION_HELPER_REFS.trip,
    ],
  ),
  grapple: unsupportedBattleMech(
    'grapple',
    'GrappleAttackAction',
    'Grapple attacks have no runtime PhysicalAttackType, tactical command, grapple state, or resolution path',
    MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS.grapple,
  ),
  'break-grapple': helperOnlyBattleMech(
    'break-grapple',
    'BreakGrappleAttackAction',
    'canBreakGrapple helper coverage applies source-backed optional-rule, airborne, common locked-grapple, chain-whip, unit-type, grapple-target, automatic-success, actuator/AES, and weight-class modifier branches',
    'Breaking grapples still has no runtime PhysicalAttackType, tactical command, event-sourced grapple state, declaration, or resolution path',
    [
      ...MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS['break-grapple'],
      ...MEKSTATION_PHYSICAL_ACTION_HELPER_REFS['break-grapple'],
    ],
  ),
  'jump-jet-attack': helperOnlyBattleMech(
    'jump-jet-attack',
    'JumpJetAttackAction',
    'canJumpJetAttack helper coverage applies source-backed optional-rule, LAM mode, selected-leg, Mek-only, leg, jump-jet, movement, weapon-fire, range, elevation, facing, automatic adjacent-building success, source-specific modifiers, and jump-jet damage branches',
    'Jump-jet attacks still have no runtime PhysicalAttackType, tactical command, event-sourced declaration, selected-leg payload, or resolution path',
    [
      ...MEGAMEK_UNSUPPORTED_BATTLEMECH_PHYSICAL_ACTION_REFS['jump-jet-attack'],
      ...MEKSTATION_PHYSICAL_ACTION_HELPER_REFS['jump-jet-attack'],
    ],
  ),
  'airmek-ram': outOfScope(
    'airmek-ram',
    'AirMekRamAttackAction',
    'non-battlemech',
    'AirMek ram attacks belong in a LAM/AirMek validation matrix, not the BattleMech-only combat suite',
    MEGAMEK_NON_BATTLEMECH_PHYSICAL_ACTION_REFS['airmek-ram'],
  ),
  'battle-armor-vibro-claw': outOfScope(
    'battle-armor-vibro-claw',
    'BAVibroClawAttackAction',
    'non-battlemech',
    'Battle armor vibro-claw attacks belong in a battle-armor validation matrix',
    MEGAMEK_NON_BATTLEMECH_PHYSICAL_ACTION_REFS['battle-armor-vibro-claw'],
  ),
  'lay-explosives': outOfScope(
    'lay-explosives',
    'LayExplosivesAttackAction',
    'non-battlemech',
    'Infantry explosive-laying attacks belong in an infantry/building-demolition validation matrix',
    MEGAMEK_NON_BATTLEMECH_PHYSICAL_ACTION_REFS['lay-explosives'],
  ),
  'protomek-physical': outOfScope(
    'protomek-physical',
    'ProtoMekPhysicalAttackAction',
    'non-battlemech',
    'ProtoMek physical attacks belong in a ProtoMek validation matrix',
    MEGAMEK_NON_BATTLEMECH_PHYSICAL_ACTION_REFS['protomek-physical'],
  ),
  ram: outOfScope(
    'ram',
    'RamAttackAction',
    'non-battlemech',
    'Aerospace/capital ramming belongs in an aerospace validation matrix',
    MEGAMEK_NON_BATTLEMECH_PHYSICAL_ACTION_REFS.ram,
  ),
} satisfies Record<string, IPhysicalActionClassScopeEntry>;
