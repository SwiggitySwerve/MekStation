/**
 * Aerospace armor construction owner. Source adapters normalize transport facts.
 * MegaMek 48fcb2f64 SmallCraft:783-797; TestSmallCraft:99-139.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { TechBase } from '@/types/enums/TechBase';
import armorCodes from '@/types/formats/blk-armor-codes.json';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

/** Normalized construction facts; transport and source parsing stay with callers. */
export interface IAerospaceArmorInput {
  readonly armorCode: number;
  readonly clan: boolean;
  readonly structuralIntegrity: number;
  readonly spheroid: boolean;
  readonly large: boolean;
  readonly advanced: boolean;
  readonly tonnage: number;
  readonly allocated: number;
}

export const isPrimitiveAerospaceArmor = (code: number): boolean =>
  [39, 40].includes(code);

export interface IAerospaceArmorProfile {
  readonly pointsPerTon: number;
  readonly bonusPoints: number;
  readonly primitiveFactor: number;
  readonly maximumTonnage: number;
}

/** Density and limits owner. FWS BAR can extend this boundary with its own facts. */
export function aerospaceArmorProfile(
  input: Omit<IAerospaceArmorInput, 'allocated'>,
): IAerospaceArmorProfile | undefined {
  const { armorCode: key, clan, structuralIntegrity: si, spheroid } = input;
  const primitive = isPrimitiveAerospaceArmor(key);
  const primitiveLarge = primitive && input.large;
  const ferro = key === 19;
  if (![0, 19, 20, 21, 39, 40, 41].includes(key)) return undefined;
  if (!input.large && [20, 21].includes(key)) return undefined;
  let ppt = key === 39 ? 16 * 0.67 : ferro ? (clan ? 19.2 : 17.92) : 16;
  if (input.large) {
    const thresholds = spheroid
      ? [12500, 20000, 35000, 50000, 65000]
      : [6000, 9500, 12500, 17500, 25000];
    const index = thresholds.filter((t) => input.tonnage >= t).length;
    ppt = (
      key === 20
        ? [19.84, 17.36, 14.88, 12.4, 9.92, 7.44]
        : key === 21
          ? [16.96, 14.84, 12.72, 10.6, 8.48, 6.36]
          : ferro
            ? clan
              ? [24, 20.4, 16.8, 14.4, 12, 8.4]
              : [17.92, 15.68, 13.44, 11.2, 8.96, 6.72]
            : clan && !primitive
              ? [20, 17, 14, 12, 10, 7]
              : [16, 14, 12, 10, 8, 6]
    )[index];
  } else if (input.advanced) {
    if (key !== 41) return undefined;
    ppt = (clan ? [1, 0.7, 0.5] : [0.8, 0.6, 0.4])[
      input.tonnage < 150000 ? 0 : input.tonnage < 250000 ? 1 : 2
    ];
  }
  const bonus = input.large
    ? 4 * si
    : input.advanced
      ? 6 * Math.round(si / 10)
      : 0;
  return {
    pointsPerTon: ppt,
    bonusPoints: bonus,
    primitiveFactor: primitiveLarge ? 0.66 : 1,
    maximumTonnage: Math.floor(si * (spheroid ? 3.6 : 4.5) * 2) / 2,
  };
}

function pointsForTonnage(
  profile: IAerospaceArmorProfile,
  tons: number,
): number {
  return Math.trunc(
    Math.floor(tons * profile.pointsPerTon + profile.bonusPoints) *
      profile.primitiveFactor,
  );
}

function tonnageForPoints(
  profile: IAerospaceArmorProfile,
  points: number,
): number {
  const raw =
    profile.primitiveFactor === 1
      ? points
      : Math.ceil(points / profile.primitiveFactor);
  return ceilToHalfTon(
    Math.max(0, raw - profile.bonusPoints) / profile.pointsPerTon,
  );
}

export interface IAerospaceArmorResult {
  mass: number;
  maximum: number;
  available: number;
}

/** Stable sourceWeight API: retain its existing unsupported-mass boundaries. */
export function aerospaceArmor(
  input: IAerospaceArmorInput,
): IAerospaceArmorResult | undefined {
  if (![0, 19, 39, 40, 41].includes(input.armorCode)) return undefined;
  const profile = aerospaceArmorProfile(input);
  if (!profile) return undefined;
  const mass = tonnageForPoints(profile, input.allocated);
  const maximum = profile.maximumTonnage;
  return {
    mass,
    maximum,
    available: pointsForTonnage(
      profile,
      input.large ? Math.min(mass, maximum) : mass,
    ),
  };
}

export interface ISmallCraftArmorFacts {
  readonly tonnage: number;
  readonly structuralIntegrity: number;
  readonly motionType: AerospaceMotionType;
  readonly techBase: TechBase;
  readonly armorType: ArmorTypeEnum;
  readonly smallCraftArmorType?: string;
}

function smallCraftProfile(
  facts: ISmallCraftArmorFacts,
): IAerospaceArmorProfile {
  const aliases: Partial<Record<ArmorTypeEnum, number>> = {
    [ArmorTypeEnum.STANDARD]: 0,
    [ArmorTypeEnum.FERRO_FIBROUS_IS]: 19,
    [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: 19,
    [ArmorTypeEnum.LIGHT_FERRO]: 21,
    [ArmorTypeEnum.HEAVY_FERRO]: 20,
  };
  const native = facts.smallCraftArmorType;
  const nativeCode = native
    ? Number(Object.entries(armorCodes).find(([, tag]) => tag === native)?.[0])
    : undefined;
  // Older saved small craft use the shared fighter armor tags.
  const legacy =
    native === undefined ||
    [1, 5, 6].includes(nativeCode ?? -1) ||
    native === 'FERRO_FIBROUS_CLAN' ||
    native === 'FERRO_FIBROUS_IS';
  const armorCode = legacy ? aliases[facts.armorType] : nativeCode;
  // Component armor technology is absent from current catalog/editor facts (O3/F4).
  const clan =
    !legacy || facts.armorType === ArmorTypeEnum.STANDARD
      ? facts.techBase === TechBase.CLAN
      : facts.armorType === ArmorTypeEnum.FERRO_FIBROUS_CLAN;
  const profile =
    armorCode === undefined
      ? undefined
      : aerospaceArmorProfile({
          armorCode,
          clan,
          tonnage: facts.tonnage,
          structuralIntegrity: facts.structuralIntegrity,
          spheroid: facts.motionType === AerospaceMotionType.SPHEROID,
          large: true,
          advanced: false,
        });
  if (!profile)
    throw new RangeError(
      `Unsupported small-craft armor: ${native ?? facts.armorType}`,
    );
  return profile;
}

export interface ISmallCraftArmorLimits {
  readonly pointsPerTon: number;
  readonly maximumTonnage: number;
  readonly maximumPoints: number;
  readonly availablePoints: number;
}

/** TestSmallCraft:99-139 and TestEntity:1148-1153; no per-location maximum. */
export function smallCraftArmor(
  facts: ISmallCraftArmorFacts & { readonly armorTonnage: number },
): ISmallCraftArmorLimits {
  const profile = smallCraftProfile(facts);
  const maximumPoints = pointsForTonnage(profile, profile.maximumTonnage);
  return {
    pointsPerTon: profile.pointsPerTon,
    maximumTonnage: profile.maximumTonnage,
    maximumPoints,
    availablePoints: Math.min(
      maximumPoints,
      pointsForTonnage(profile, facts.armorTonnage),
    ),
  };
}

/** SmallCraft:783-797 reverses primitive rounding before subtracting SI armor. */
export function smallCraftArmorWeight(
  facts: ISmallCraftArmorFacts,
  points: number,
): number {
  return tonnageForPoints(smallCraftProfile(facts), points);
}
