import type { IReferenceIdentity } from './unit-bv-provenance';

import { WeightOverflowValidation } from '../src/services/validation/rules/universal/WeightOverflowValidation';
/**
 * Verifier option constants (row 3.4 W3). MegaMek's TestEntityOption values are
 * constants of a verifier class, not facts of a unit, so they are compared once
 * per (family, verifierClass) cell against the local owner that plays the same
 * role. Measurement only: a gap is a finding, and an option no Java call site
 * reads is reported as a failing candidate unless explicitly accepted by D3
 * for the reference's verified pin and verifier configuration.
 * See unit-bv-parity.md "Opt-in verifier quantities and settings".
 */
import { ArmorTypeEnum } from '../src/types/construction/ArmorType';
import { GyroType } from '../src/types/construction/GyroType';
import { InternalStructureType } from '../src/types/construction/InternalStructureType';
import { TechBase } from '../src/types/enums/TechBase';
import { GroundMotionType } from '../src/types/unit/BaseUnitInterfaces';
import { TurretType } from '../src/types/unit/VehicleInterfaces';
import { calculateArmorWeight } from '../src/utils/construction/armorCalculations/weight';
import { INTRO_YEAR_MARGIN } from '../src/utils/construction/equipmentIntroduction';
import { calculateGyroWeight } from '../src/utils/construction/gyroCalculations';
import { calculateStructureWeight } from '../src/utils/construction/structureCalculations';
import { computeVehicleArmorWeight } from '../src/utils/construction/vehicle/armor';
import { computeVehicleControlsLiftWeights } from '../src/utils/construction/vehicle/controlsLift';
import { computePowerAmplifierWeight } from '../src/utils/construction/vehicle/powerAmplifier';
import { computeTurretWeight } from '../src/utils/construction/vehicle/turret';
import { calculateTargetingComputerWeight } from '../src/utils/equipment/targetingComputerUtils';
import acceptance from './unit-construction-settings-acceptance.json';

/** Per-row evidence a quantity capture leaves for the cell-level settings checks. */
export interface IProbes {
  /** Largest tested overweight (t) the local rule accepts, or no rule fired at all. */
  overweightTolerance?: number | 'no-check';
}
export interface ISettingContext {
  family: string;
  verifierClass: string;
  /** The Java option values of the cell (the exporter's settings object). */
  javaOptions: Record<string, unknown>;
  probes: ReadonlyArray<IProbes | undefined>;
}
export type LocalSetting = { value: unknown; owner: string } | { gap: string };
export type LocalSettingFn = (
  key: string,
  ctx: ISettingContext,
) => LocalSetting;

export const VERIFIER_CLASSES = [
  'TestMek',
  'TestProtoMek',
  'TestTank',
  'TestSupportVehicle',
  'TestAero',
  'TestSmallCraft',
  'TestAdvancedAerospace',
  'TestBattleArmor',
  'TestInfantry',
] as const;
export type VerifierClass = (typeof VERIFIER_CLASSES)[number];
const isVerifierClass = (name: string): name is VerifierClass =>
  (VERIFIER_CLASSES as readonly string[]).includes(name);

type Effect = 'numeric' | 'verdict' | 'report' | 'none';
interface ISettingSpec {
  key: string;
  effect: Effect;
  /** Java call sites that read the getter, per verifier class (pin 48fcb2f64). */
  consumers: Partial<Record<VerifierClass, string>>;
  /** What the pin shows about every call site, quoted in the evidence. */
  note: string;
  /** The getter is read, but a pinned value of another option switches it off. */
  gatedOff?: {
    by: string;
    when: (value: unknown) => boolean;
    evidence: string;
  };
}

// Verdict paths: correctEntity -> correctWeight(buff) (TestEntity.java:1063-1064).
const WEIGHT_VERDICT: Partial<Record<VerifierClass, string>> = {
  TestMek: 'TestMek.java:742',
  TestProtoMek: 'TestProtoMek.java:253',
  TestTank: 'TestTank.java:322',
  TestSupportVehicle: 'TestSupportVehicle.java:1006',
  TestAero: 'TestAero.java:793',
  TestSmallCraft: 'TestSmallCraft.java:560',
  TestAdvancedAerospace: 'TestAdvancedAerospace.java:661',
  TestBattleArmor: 'TestBattleArmor.java:1072',
};
const INTRO_YEAR: Partial<Record<VerifierClass, string>> = {
  TestMek: 'TestMek.java:769',
  TestProtoMek: 'TestProtoMek.java:271',
  TestTank: 'TestTank.java:426',
  TestSupportVehicle: 'TestSupportVehicle.java:1221',
  TestAero: 'TestAero.java:828',
  TestBattleArmor: 'TestBattleArmor.java:1090',
};
const SKIP: Partial<Record<VerifierClass, string>> = {
  TestMek: 'TestMek.java:738',
  TestProtoMek: 'TestProtoMek.java:249',
  TestTank: 'TestTank.java:319',
  TestSupportVehicle: 'TestSupportVehicle.java:1002',
  TestAero: 'TestAero.java:790',
  TestSmallCraft: 'TestSmallCraft.java:557',
  TestAdvancedAerospace: 'TestAdvancedAerospace.java:658',
  TestBattleArmor: 'TestBattleArmor.java:1069',
  TestInfantry: 'TestInfantry.java:179',
};

export const SETTING_SPECS: readonly ISettingSpec[] = [
  {
    key: 'getWeightCeilingEngine',
    effect: 'none',
    consumers: {},
    note: 'getter TestEntity.java:192 only; engine weight is engine.getWeightEngine(getEntity()) with no option (TestEntity.java:557-559); the :198 read is a null guard',
  },
  {
    key: 'getWeightCeilingStructure',
    effect: 'numeric',
    consumers: {
      TestMek: 'TestEntity.java:568',
      TestTank: 'TestEntity.java:568',
    },
    note: 'sole consumer is the base getWeightStructure (TestEntity.java:568); TestAero:1202, TestBattleArmor:499, TestInfantry:136, TestProtoMek:135 and TestSupportVehicle:778 override it without the option',
  },
  {
    key: 'getWeightCeilingArmor',
    effect: 'numeric',
    consumers: {
      TestMek: 'TestEntity.java:600-616 via :1018 (patchwork armor only)',
      TestTank: 'TestEntity.java:600-616 via :1018 (patchwork armor only)',
      TestAero:
        'TestEntity.java:600-616 via TestAero.java:1106 (patchwork armor only)',
      TestSupportVehicle:
        'TestEntity.java:600-616 via :1017-1018, inherited through TestSupportVehicle.java:773-774 super.calculateWeightExact() (patchwork armor only; TestSupportVehicle.java:79 extends TestEntity without overriding the getter or getWeightAllocatedArmor; :701 handles patchwork)',
    },
    note: 'sole consumer is getWeightAllocatedArmor (TestEntity.java:600-616); its callers are TestEntity.java:1018 (inherited by TestMek, TestTank and TestSupportVehicle via calculateWeightExact) and TestAero.java:1106; TestProtoMek.java:176 overrides it without the option. Zero corpus patchwork rows does not remove a callable numeric path',
  },
  {
    key: 'getWeightCeilingControls',
    effect: 'numeric',
    consumers: { TestTank: 'TestTank.java:248' },
    note: 'sole consumer is TestTank.getWeightControls (TestTank.java:248)',
  },
  {
    key: 'getWeightCeilingWeapons',
    effect: 'none',
    consumers: {},
    note: 'getter TestEntity.java:216 only; printed at TestXMLOption.java:247; no other call site in megamek/src',
  },
  {
    key: 'getWeightCeilingTargComp',
    effect: 'verdict',
    consumers: {
      TestMek: 'TestEntity.java:862-868 via calcMiscCrits, TestMek.java:442',
    },
    note: 'sole consumer is calcMiscCrits (TestEntity.java:828), whose only caller is TestMek.java:442',
  },
  {
    key: 'getWeightCeilingGyro',
    effect: 'numeric',
    consumers: { TestMek: 'TestMek.java:261' },
    note: 'sole consumer is TestMek.getWeightGyro (TestMek.java:261)',
  },
  {
    key: 'getWeightCeilingTurret',
    effect: 'numeric',
    consumers: { TestTank: 'TestTank.java:205,226,868,870' },
    note: 'sole consumer is TestTank (TestTank.java:205,226,868,870)',
  },
  {
    key: 'getWeightCeilingLifting',
    effect: 'numeric',
    consumers: { TestTank: 'TestTank.java:232' },
    note: 'sole consumer is TestTank.java:232',
  },
  {
    key: 'getWeightCeilingPowerAmp',
    effect: 'numeric',
    consumers: { TestMek: 'TestMek.java:220', TestTank: 'TestTank.java:762' },
    note: 'consumers are TestMek.java:220 and TestTank.java:762 only',
  },
  {
    key: 'getMaxOverweight',
    effect: 'verdict',
    consumers: WEIGHT_VERDICT,
    note: 'TestEntity.java:1083 inside correctWeight (TestBattleArmor.java:1038 has its own copy); TestInfantry.correctEntity never calls correctWeight, only its report at TestInfantry.java:512',
  },
  {
    key: 'getMinUnderweight',
    effect: 'verdict',
    consumers: WEIGHT_VERDICT,
    note: 'TestEntity.java:1088 inside correctWeight (TestBattleArmor.java:1044); TestInfantry has no verdict path',
    gatedOff: {
      by: 'showUnderweightEntity',
      when: (value) => value === false,
      evidence:
        'TestEntity.java:1064 calls correctWeight(buff, !showOverweightedEntity(), !showUnderweightEntity()); with showUnderweightEntity false the underweight branch (:1088) never runs on the verdict path',
    },
  },
  {
    key: 'showOverweightedEntity',
    effect: 'verdict',
    consumers: WEIGHT_VERDICT,
    note: 'TestEntity.java:1064 (true switches the overweight check on); TestInfantry has no verdict path',
  },
  {
    key: 'showUnderweightEntity',
    effect: 'verdict',
    consumers: WEIGHT_VERDICT,
    note: 'TestEntity.java:1064 (false switches the underweight check off); TestInfantry has no verdict path',
  },
  {
    key: 'showCorrectArmor',
    effect: 'verdict',
    consumers: {
      TestMek: 'TestMek.java:757',
      TestProtoMek: 'TestProtoMek.java:262',
      TestAero: 'TestAero.java:819',
      TestSmallCraft: 'TestSmallCraft.java:572',
      TestAdvancedAerospace: 'TestAdvancedAerospace.java:673',
      TestBattleArmor: 'TestBattleArmor.java:1078',
    },
    note: 'read in correctEntity of Mek, ProtoMek, Aero, SmallCraft, AdvancedAerospace and BattleArmor only',
  },
  {
    key: 'showCorrectCritical',
    effect: 'verdict',
    consumers: {
      TestMek: 'TestMek.java:760',
      TestAero: 'TestAero.java:822',
      TestBattleArmor: 'TestBattleArmor.java:1081',
    },
    note: 'read in correctEntity of Mek, Aero and BattleArmor only',
  },
  {
    key: 'showFailedEquip',
    effect: 'verdict',
    consumers: {
      TestMek: 'TestMek.java:763',
      TestProtoMek: 'TestProtoMek.java:265',
      TestTank: 'TestTank.java:420',
      TestSupportVehicle: 'TestSupportVehicle.java:1213',
      TestAero: 'TestAero.java:825',
      TestSmallCraft: 'TestSmallCraft.java:575',
      TestAdvancedAerospace: 'TestAdvancedAerospace.java:676',
      TestBattleArmor: 'TestBattleArmor.java:1084',
    },
    note: 'read in every correctEntity except TestInfantry',
  },
  {
    key: 'showIncorrectIntroYear',
    effect: 'verdict',
    consumers: INTRO_YEAR,
    note: 'TestEntity.java:286-287; read in correctEntity of Mek, ProtoMek, Tank, SupportVehicle, Aero and BattleArmor only (TestInfantry.java:~182 declines to test equipment intro years)',
  },
  {
    key: 'getIntroYearMargin',
    effect: 'verdict',
    consumers: Object.fromEntries(
      Object.entries(INTRO_YEAR).map(([cls, site]) => [
        cls,
        `TestEntity.java:1473 via hasIncorrectIntroYear, reached from ${site}`,
      ]),
    ),
    note: 'TestEntity.java:1473 is inside hasIncorrectIntroYear, which only the showIncorrectIntroYear gate reaches',
  },
  {
    key: 'skip',
    effect: 'verdict',
    consumers: SKIP,
    note: 'TestEntity.java:317-318; the first statement of correctEntity in every verifier class',
  },
  {
    key: 'getTargetingComputerCrits',
    effect: 'verdict',
    consumers: {
      TestMek: 'TestEntity.java:870-876 via calcMiscCrits, TestMek.java:442',
    },
    note: 'TestEntity.java:870-876 inside calcMiscCrits, whose only caller is TestMek.java:442',
    gatedOff: {
      by: 'getWeightCeilingTargComp',
      when: (value) => value === 'TON',
      evidence:
        'TestEntity.java:862-870 ceils the targeting-computer weight to a whole ton before switching on getTargetingComputerCrits; an integral weight rounds identically under CEIL, ROUND and FLOOR',
    },
  },
  {
    key: 'getPrintSize',
    effect: 'report',
    consumers: {},
    note: 'every call site is a print or makeLength helper (TestEntity.java:675,732,779 and StringUtil.makeLength(..., getPrintSize() - 5)); no numeric or verdict use',
  },
  {
    key: 'gameYear',
    effect: 'verdict',
    consumers: INTRO_YEAR,
    note: 'TestEntity.java:90 defaults to -1 ("use entity year", :310); read at :1613 inside the intro-year check, which only the showIncorrectIntroYear gate reaches',
  },
];

export const OPTION_KEYS: readonly string[] = SETTING_SPECS.map(
  (spec) => spec.key,
);
/** Everything the exporter writes under construction.settings. */
export const SETTING_KEYS: readonly string[] = [
  ...OPTION_KEYS,
  'ammoTechLevel',
];
const EXPECTED_TYPE: Record<string, 'number' | 'string' | 'boolean'> =
  Object.fromEntries(
    SETTING_KEYS.map((key) => [
      key,
      key.startsWith('getWeightCeiling')
        ? 'string'
        : key.startsWith('show') || key === 'skip'
          ? 'boolean'
          : 'number',
    ]),
  );
export const expectedSettingType = (
  key: string,
): 'number' | 'string' | 'boolean' | undefined => EXPECTED_TYPE[key];
export const settingSpec = (key: string): ISettingSpec | undefined =>
  SETTING_SPECS.find((spec) => spec.key === key);

// --- Local owners ------------------------------------------------------------

const STEPS: Record<string, (raw: number) => number> = {
  HALF_TON: (raw) => Math.ceil(Math.round(raw * 1e9) / 5e8) / 2,
  TON: (raw) => Math.ceil(Math.round(raw * 1e9) / 1e9),
  KILO: (raw) => Math.ceil(Math.round(raw * 1e6) / 1e3) / 1e3,
};
/** Which Java Ceil the owner's output shows for a discriminating raw input. */
export function observeCeiling(raw: number, ours: number): string | undefined {
  const hits = Object.entries(STEPS)
    .filter(([, step]) => Math.abs(step(raw) - ours) < 1e-9)
    .map(([name]) => name);
  return hits.length === 1 ? hits[0] : undefined;
}

interface ICeilingProbe {
  owner: string;
  raw: number;
  call: () => number;
}
const CEILING_PROBES: Record<
  string,
  Partial<Record<VerifierClass, ICeilingProbe>>
> = {
  getWeightCeilingStructure: {
    TestMek: {
      owner:
        'src/utils/construction/structureCalculations.ts:18 calculateStructureWeight(23 t, Standard)',
      raw: 2.3,
      call: () => calculateStructureWeight(23, InternalStructureType.STANDARD),
    },
  },
  getWeightCeilingArmor: {
    TestMek: {
      owner:
        'src/utils/construction/armorCalculations/weight.ts:14,16 calculateArmorWeight(5 points, Standard)',
      raw: 5 / 16,
      call: () => calculateArmorWeight(5, ArmorTypeEnum.STANDARD),
    },
    TestTank: {
      owner:
        'src/utils/construction/vehicle/armor.ts:180 computeVehicleArmorWeight(5 points, Standard)',
      raw: 5 / 16,
      call: () => computeVehicleArmorWeight(5, ArmorTypeEnum.STANDARD),
    },
  },
  getWeightCeilingControls: {
    TestTank: {
      owner:
        'src/utils/construction/vehicle/controlsLift.ts:23 computeVehicleControlsLiftWeights(23 t, Tracked)',
      raw: 23 / 20,
      call: () =>
        computeVehicleControlsLiftWeights({
          tonnage: 23,
          motionType: GroundMotionType.TRACKED,
        }).controls,
    },
  },
  getWeightCeilingLifting: {
    TestTank: {
      owner:
        'src/utils/construction/vehicle/controlsLift.ts:31 computeVehicleControlsLiftWeights(23 t, Hover)',
      raw: 23 / 10,
      call: () =>
        computeVehicleControlsLiftWeights({
          tonnage: 23,
          motionType: GroundMotionType.HOVER,
        }).lift,
    },
  },
  getWeightCeilingTurret: {
    TestTank: {
      owner:
        'src/utils/construction/vehicle/turret.ts:50 computeTurretWeight(single, 3 t)',
      raw: 0.3,
      call: () => computeTurretWeight(TurretType.SINGLE, 3),
    },
  },
  getWeightCeilingPowerAmp: {
    TestTank: {
      owner:
        'src/utils/construction/vehicle/powerAmplifier.ts:41 computePowerAmplifierWeight(23 t)',
      raw: 2.3,
      call: () => computePowerAmplifierWeight(23),
    },
  },
  getWeightCeilingTargComp: {
    TestMek: {
      owner:
        'src/utils/equipment/targetingComputerUtils.ts:26 calculateTargetingComputerWeight(5 t, Inner Sphere)',
      raw: 5 / 4,
      call: () => calculateTargetingComputerWeight(5, TechBase.INNER_SPHERE),
    },
  },
};

const GAP_NO_OWNER = 'no local owner located for this family';
const GAPS: Record<string, string> = {
  getWeightCeilingStructure: `${GAP_NO_OWNER}; the Tank structure mass has no scalar ceiling owner`,
  getWeightCeilingArmor: `${GAP_NO_OWNER}; no local patchwork-armor owner`,
  getWeightCeilingPowerAmp: `${GAP_NO_OWNER}; no BattleMech power-amplifier owner`,
  getWeightCeilingTargComp: 'targeting-computer owner unavailable',
  getTargetingComputerCrits: `${GAP_NO_OWNER}`,
  showCorrectArmor: `${GAP_NO_OWNER}; handler maxArmorPoints checks exist for vehicles but no probe shows them unconditional`,
  showCorrectCritical: `${GAP_NO_OWNER}; critical-slot allocation validators not probed`,
  showFailedEquip: `${GAP_NO_OWNER}; unresolved-equipment handling not probed`,
  showIncorrectIntroYear: `${GAP_NO_OWNER}; an intro-year check may exist (vehicle/introYear.ts:62, aerospace/sourceValidation.ts:31) but no probe shows it unconditional`,
  gameYear:
    'no local owner of a validation-year override; Java -1 means "use the unit year"',
  showUnderweightEntity: 'no local owner; absence cannot be cited',
  skip: 'no local owner; absence cannot be cited',
};

/** Largest tested overweight the rule accepts, 'no-check' if it never complains. */
export const OVERWEIGHT_GRID = [0, 0.1, 0.25, 0.3] as const;
export function toleranceFromProbe(
  accepts: (overweight: number) => boolean,
): number | 'no-check' {
  if (!accepts(0))
    throw new Error(
      'overweight probe: the rule rejects a design at its tonnage',
    );
  if (OVERWEIGHT_GRID.every(accepts)) return 'no-check';
  let tolerance = 0;
  for (const overweight of OVERWEIGHT_GRID) {
    if (!accepts(overweight)) break;
    tolerance = overweight;
  }
  return tolerance;
}
/** VAL-UNIV-014, the BattleMech editor's overweight rule, run on a probe design. */
export function probeMechOverweightTolerance(): number | 'no-check' {
  return toleranceFromProbe(
    (over) =>
      WeightOverflowValidation.validate({
        unit: { allocatedWeight: 50 + over, maxWeight: 50 },
      } as never).errors.length === 0,
  );
}

const overweightOwner = (verifierClass: string) =>
  verifierClass === 'TestMek'
    ? 'src/services/validation/rules/universal/WeightOverflowValidation.ts:54 (VAL-UNIV-014, allocated > max)'
    : 'src/services/units/handlers/AbstractUnitTypeHandler.ts:353 (totalWeight > tonnage)';
const INTRO_YEAR_OWNER: Record<string, string> = {
  TestTank:
    'src/utils/construction/vehicle/introYear.ts:62,92 via equipmentIntroduction.ts:5 INTRO_YEAR_MARGIN',
  TestSupportVehicle:
    'src/utils/construction/vehicle/introYear.ts:62,92 via equipmentIntroduction.ts:5 INTRO_YEAR_MARGIN',
  TestAero:
    'src/utils/construction/aerospace/sourceValidation.ts:31 via equipmentIntroduction.ts:5 INTRO_YEAR_MARGIN',
};

function gyroStepIsObservable(): boolean {
  const outputs = [
    GyroType.STANDARD,
    GyroType.XL,
    GyroType.COMPACT,
    GyroType.HEAVY_DUTY,
    GyroType.SUPERHEAVY,
  ].flatMap((type) =>
    [100, 230, 355, 400].map((rating) => calculateGyroWeight(rating, type)),
  );
  return outputs.some(
    (weight) => Math.abs(weight * 2 - Math.round(weight * 2)) > 1e-9,
  );
}

export const defaultLocalSetting: LocalSettingFn = (key, ctx) => {
  const cls = ctx.verifierClass;
  const probe = CEILING_PROBES[key]?.[cls as VerifierClass];
  if (key === 'getWeightCeilingGyro') {
    return gyroStepIsObservable()
      ? {
          gap: 'gyro owner emits sub-half-ton values; step classification not implemented',
        }
      : {
          gap: 'gyro step not observable: calculateGyroWeight (gyroCalculations.ts:37) emits only multiples of 0.5 t for every gyro type, so HALF_TON and KILO look alike',
        };
  }
  if (probe) {
    try {
      const ours = probe.call();
      const step = observeCeiling(probe.raw, ours);
      return step
        ? { value: step, owner: probe.owner }
        : {
            gap: `${probe.owner} returned ${ours} for raw ${probe.raw}, which matches no Java Ceil`,
          };
    } catch (error) {
      return { gap: `${GAPS[key] ?? 'owner unavailable'}: ${String(error)}` };
    }
  }
  if (key === 'getMaxOverweight' || key === 'showOverweightedEntity') {
    const seen = ctx.probes
      .map((p) => p?.overweightTolerance)
      .filter((value): value is number | 'no-check' => value !== undefined);
    if (!seen.length)
      return { gap: 'no overweight probe captured for this cell' };
    if (new Set(seen).size > 1)
      return { gap: 'overweight probes differ between rows of this cell' };
    if (seen[0] === 'no-check')
      return {
        gap: 'no overweight check ran: the local rule accepted a +0.3 t design',
      };
    return key === 'getMaxOverweight'
      ? { value: seen[0], owner: overweightOwner(cls) }
      : { value: true, owner: overweightOwner(cls) };
  }
  if (key === 'getIntroYearMargin') {
    return INTRO_YEAR_OWNER[cls]
      ? { value: INTRO_YEAR_MARGIN, owner: INTRO_YEAR_OWNER[cls] }
      : { gap: `no local intro-year check uses INTRO_YEAR_MARGIN for ${cls}` };
  }
  return { gap: GAPS[key] ?? GAP_NO_OWNER };
};

// --- Cell comparison -----------------------------------------------------------

export interface ISettingsRow {
  path: string;
  family: string;
  /** Simple class name, e.g. TestMek. */
  verifierClass: string;
  settings: Record<string, unknown>;
  /** Java quantities, for the overweight band evidence. */
  javaWeights: { exact?: number; rounded?: number; design?: number };
  probe?: IProbes;
}
export type SettingStatus =
  | 'matched'
  | 'different'
  | 'missing-local'
  | 'accepted-inapplicable'
  | 'inapplicable-candidate';
export interface ISettingResult {
  key: string;
  java: unknown;
  ours: unknown;
  status: SettingStatus;
  owner: string | null;
  reason: string | null;
  evidence: string | null;
}
export interface ISettingsCell {
  family: string;
  verifierClass: string;
  rows: number;
  results: ISettingResult[];
}

export interface IInapplicableCandidate {
  family: string;
  verifierClass: string;
  key: string;
  reason: string;
  javaEvidence: string;
}
export interface ISettingsReport {
  drift: string[];
  cells: ISettingsCell[];
  counts: Record<SettingStatus, number>;
  inapplicableCandidates: IInapplicableCandidate[];
  perRow: {
    ammoTechLevel: {
      rows: number;
      missingLocal: number;
      reason: string;
      values: Record<string, number>;
    };
    gameYear: { findings: string[] };
  };
  errors: string[];
}

const typeName = (value: unknown) => (value === null ? 'null' : typeof value);
const canon = (value: unknown) => JSON.stringify(value);
const acceptedCells = new Set(
  acceptance.cells.map(({ family, verifierClass, key }) =>
    JSON.stringify([family, verifierClass, key]),
  ),
);

export function compareSettings(
  rows: readonly ISettingsRow[],
  localSettings: LocalSettingFn = defaultLocalSetting,
  referenceIdentity?: Partial<IReferenceIdentity>,
): ISettingsReport {
  const drift: string[] = [];
  const identityMatches =
    referenceIdentity?.megamekCommit === acceptance.reference.megamekCommit &&
    referenceIdentity?.verifierConfigSha256 ===
      acceptance.reference.verifierConfigSha256;
  const cellRows = new Map<string, ISettingsRow[]>();
  const perRowValues: Record<string, Record<string, number>> = {
    ammoTechLevel: {},
  };
  let ammoRows = 0;
  for (const row of [...rows].sort((a, b) => a.path.localeCompare(b.path))) {
    const present = Object.keys(row.settings);
    for (const name of SETTING_KEYS.filter((k) => !present.includes(k)))
      drift.push(`settings-key-drift: ${row.path} missing ${name}`);
    for (const name of present.filter((k) => !SETTING_KEYS.includes(k)).sort())
      drift.push(`settings-key-drift: ${row.path} unexpected ${name}`);
    for (const name of present.filter((k) => SETTING_KEYS.includes(k))) {
      if (typeName(row.settings[name]) !== EXPECTED_TYPE[name])
        drift.push(
          `settings-type-drift: ${row.path} ${name} ${typeName(row.settings[name])}`,
        );
    }
    if ('ammoTechLevel' in row.settings) {
      ammoRows++;
      const value = canon(row.settings.ammoTechLevel);
      perRowValues.ammoTechLevel[value] =
        (perRowValues.ammoTechLevel[value] ?? 0) + 1;
    }
    const id = `${row.family}/${row.verifierClass}`;
    cellRows.set(id, [...(cellRows.get(id) ?? []), row]);
  }

  const gameYearFindings: string[] = [];
  const cells: ISettingsCell[] = [...cellRows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, members]) => {
      const first = members[0];
      const { family, verifierClass } = first;
      const known = isVerifierClass(verifierClass);
      if (!known) drift.push(`unknown-verifier-class: ${id}`);
      const javaOptions = first.settings;
      for (const name of OPTION_KEYS) {
        const distinct = new Set(members.map((m) => canon(m.settings[name])));
        if (distinct.size <= 1) continue;
        if (name === 'gameYear')
          gameYearFindings.push(...members.map((m) => m.path));
        else drift.push(`settings-varies-in-cell: ${id} ${name}`);
      }
      const ctx: ISettingContext = {
        family,
        verifierClass,
        javaOptions,
        probes: members.map((m) => m.probe),
      };
      const results = OPTION_KEYS.map((name): ISettingResult => {
        const java = javaOptions[name] ?? null;
        const base = {
          key: name,
          java,
          ours: null,
          owner: null,
          reason: null,
          evidence: null,
        };
        const spec = settingSpec(name)!;
        if (!known)
          return {
            ...base,
            status: 'missing-local',
            reason: 'verifier class is not in the pinned classification',
          };
        const site = spec.consumers[verifierClass];
        const listed = acceptedCells.has(
          JSON.stringify([family, verifierClass, name]),
        );
        const candidate =
          !site || spec.gatedOff?.when(javaOptions[spec.gatedOff.by]);
        if (listed && !candidate)
          drift.push(`accepted-inapplicable-consumer-drift: ${id} ${name}`);
        const candidateStatus: SettingStatus =
          listed && identityMatches
            ? 'accepted-inapplicable'
            : 'inapplicable-candidate';
        if (!site)
          return {
            ...base,
            status: candidateStatus,
            reason: 'no Java call site reads this option for the class',
            evidence: `${spec.note}. No call site in ${verifierClass}.`,
          };
        if (spec.gatedOff?.when(javaOptions[spec.gatedOff.by]))
          return {
            ...base,
            status: candidateStatus,
            reason: `gated off by the pinned ${spec.gatedOff.by} = ${canon(javaOptions[spec.gatedOff.by])}`,
            evidence: `${spec.gatedOff.evidence}. Read at ${site}.`,
          };
        const local = localSettings(name, ctx);
        let evidence: string | null = `Java: ${site}`;
        if (name === 'getMaxOverweight') {
          const max = typeof java === 'number' ? java : 0;
          const inBand = members.filter((m) =>
            [m.javaWeights.exact, m.javaWeights.rounded].some((w) => {
              const over = (w ?? NaN) - (m.javaWeights.design ?? NaN);
              return over > 1e-9 && over <= max + 1e-9;
            }),
          ).length;
          evidence += `; ${inBand} rows lie in the (0, ${max}] t band of ${members.length} rows (Java exact and rounded weight over design weight)`;
        }
        if ('gap' in local)
          return {
            ...base,
            status: 'missing-local',
            reason: local.gap,
            evidence,
          };
        return {
          ...base,
          ours: local.value,
          owner: local.owner,
          status: canon(local.value) === canon(java) ? 'matched' : 'different',
          evidence,
        };
      });
      return { family, verifierClass, rows: members.length, results };
    });

  const counts: Record<SettingStatus, number> = {
    matched: 0,
    different: 0,
    'missing-local': 0,
    'inapplicable-candidate': 0,
    'accepted-inapplicable': 0,
  };
  const inapplicableCandidates: {
    family: string;
    verifierClass: string;
    key: string;
    reason: string;
    javaEvidence: string;
  }[] = [];
  for (const cell of cells)
    for (const item of cell.results) {
      counts[item.status]++;
      if (item.status === 'inapplicable-candidate')
        inapplicableCandidates.push({
          family: cell.family,
          verifierClass: cell.verifierClass,
          key: item.key,
          reason: item.reason ?? '',
          javaEvidence: item.evidence ?? '',
        });
    }
  const errors = cells.flatMap((cell) =>
    cell.results
      .filter(
        (item) =>
          item.status !== 'matched' && item.status !== 'accepted-inapplicable',
      )
      .map(
        (item) =>
          `settings-${item.status}: ${cell.family}/${cell.verifierClass} ${item.key}`,
      ),
  );
  if (ammoRows)
    errors.push(`settings-missing-local: ammoTechLevel on ${ammoRows} rows`);
  return {
    drift,
    cells,
    counts,
    inapplicableCandidates,
    perRow: {
      ammoTechLevel: {
        rows: ammoRows,
        missingLocal: ammoRows,
        reason:
          'ammoTechLevel is entity.getTechLevel() fed to hasIllegalTechLevels (TestEntity.java:1238-1292); no local owner exports the Java compound tech-level integer (VAL-BM-012 compares rulesLevel enums), and W3 adds no mapping',
        values: perRowValues.ammoTechLevel,
      },
      gameYear: { findings: [...new Set(gameYearFindings)].sort() },
    },
    errors,
  };
}
