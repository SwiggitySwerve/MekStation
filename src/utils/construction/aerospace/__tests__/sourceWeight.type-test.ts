import type { EngineType } from '@/types/construction/EngineType';
import type { AerospaceLocation } from '@/types/construction/UnitLocation';
import type { TechBase } from '@/types/enums/TechBase';
import type {
  AerospaceCockpitType,
  IAerospaceBreakdown as LegacyBreakdown,
} from '@/types/unit/AerospaceInterfaces';
import type { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';

import type {
  AerospaceArmorWeightInput,
  AerospaceFuelWeightInput,
  AerospaceWeightInput,
  AerospaceWeightResult,
  IAerospaceBreakdown,
  IAerospaceWeightIssue,
  IAerospaceWeightMount,
} from '../sourceWeight';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
type Assignable<From, To> = [From] extends [To] ? true : false;

type Mount = {
  readonly id: 'mount-1';
  readonly equipmentId: 'medium-laser';
  readonly name: 'Medium Laser';
  readonly location: AerospaceLocation.NOSE;
  readonly isAmmo: false;
  readonly size: 1;
  readonly noPhysicalLocation: false;
  readonly weaponGroup: false;
};
type Common = {
  readonly tonnage: 65;
  readonly safeThrust: 6;
  readonly year: 2796;
  readonly techBase: TechBase.INNER_SPHERE;
  readonly armor: {
    readonly kind: 'allocatedPoints';
    readonly nativeCode: 0;
    readonly techBase: TechBase.INNER_SPHERE;
    readonly locations: readonly [];
  };
  readonly fuel: { readonly unit: 'points'; readonly amount: 400 };
  readonly heatSinks: 20;
  readonly cockpit: AerospaceCockpitType.STANDARD;
  readonly equipment: readonly Mount[];
  readonly transporters: readonly string[];
};
type Fighter = Common & {
  readonly family: 'aerospaceFighter';
  readonly engineType: EngineType.STANDARD;
  readonly vstol: false;
};
type Conventional = Omit<Fighter, 'family'> & {
  readonly family: 'conventionalFighter';
};
type SmallCraft = Common & {
  readonly family: 'smallCraft';
  readonly clan: false;
  readonly originalBuildYear: 2331;
  readonly primitive: true;
  readonly motionType: AerospaceMotionType.AERODYNE;
  readonly structuralIntegrity: 5;
  readonly lifeBoats: 0;
  readonly escapePods: 0;
};
type Support = Common & {
  readonly family: 'fixedWingSupport';
  readonly engineType: EngineType.FISSION;
  readonly engineTechRating: 3;
  readonly structuralTechRating: 3;
  readonly armorTechRating: 3;
  readonly barRating: 10;
};
type Complete = Extract<AerospaceWeightResult, { status: 'complete' }>;
type Unresolved = Extract<AerospaceWeightResult, { status: 'unresolved' }>;

/** Compile-time contract tests included by the root no-emit tsc project. */
export type AerospaceWeightContractAssertions = [
  Assert<Equal<LegacyBreakdown, IAerospaceBreakdown>>,
  Assert<Assignable<Mount, IAerospaceWeightMount>>,
  Assert<Assignable<Fighter, AerospaceWeightInput>>,
  Assert<Assignable<Conventional, AerospaceWeightInput>>,
  Assert<Assignable<SmallCraft, AerospaceWeightInput>>,
  Assert<Assignable<Support, AerospaceWeightInput>>,
  Assert<
    Equal<
      AerospaceWeightInput['family'],
      | 'aerospaceFighter'
      | 'conventionalFighter'
      | 'smallCraft'
      | 'fixedWingSupport'
    >
  >,
  Assert<
    Equal<Assignable<Omit<Fighter, 'engineType'>, AerospaceWeightInput>, false>
  >,
  Assert<
    Equal<Assignable<Omit<Fighter, 'vstol'>, AerospaceWeightInput>, false>
  >,
  Assert<
    Equal<
      Assignable<Omit<SmallCraft, 'originalBuildYear'>, AerospaceWeightInput>,
      false
    >
  >,
  Assert<
    Equal<
      Assignable<Omit<SmallCraft, 'escapePods'>, AerospaceWeightInput>,
      false
    >
  >,
  Assert<
    Equal<
      Assignable<Omit<Support, 'engineTechRating'>, AerospaceWeightInput>,
      false
    >
  >,
  Assert<
    Equal<
      Assignable<Omit<Support, 'structuralTechRating'>, AerospaceWeightInput>,
      false
    >
  >,
  Assert<
    Equal<
      Assignable<Omit<Support, 'armorTechRating'>, AerospaceWeightInput>,
      false
    >
  >,
  Assert<
    Equal<Assignable<Omit<Support, 'barRating'>, AerospaceWeightInput>, false>
  >,
  Assert<Equal<Assignable<Omit<Mount, 'size'>, IAerospaceWeightMount>, false>>,
  Assert<
    Equal<Assignable<Omit<Mount, 'isAmmo'>, IAerospaceWeightMount>, false>
  >,
  Assert<
    Equal<Assignable<Omit<Mount, 'weaponGroup'>, IAerospaceWeightMount>, false>
  >,
  Assert<
    Equal<
      Assignable<Omit<Mount, 'noPhysicalLocation'>, IAerospaceWeightMount>,
      false
    >
  >,
  Assert<Equal<IAerospaceWeightMount['shots'], number | undefined>>,
  Assert<Equal<AerospaceFuelWeightInput['unit'], 'points' | 'tons'>>,
  Assert<
    Equal<
      AerospaceArmorWeightInput['kind'],
      'installedTonnage' | 'allocatedPoints'
    >
  >,
  Assert<Equal<Complete['breakdown'], IAerospaceBreakdown>>,
  Assert<Equal<Unresolved['breakdown'], null>>,
  Assert<Equal<Unresolved['issues'], readonly IAerospaceWeightIssue[]>>,
  Assert<
    Equal<
      Assignable<
        {
          status: 'unresolved';
          breakdown: IAerospaceBreakdown;
          issues: readonly [];
        },
        AerospaceWeightResult
      >,
      false
    >
  >,
  Assert<
    Equal<
      Assignable<
        { status: 'complete'; breakdown: null },
        AerospaceWeightResult
      >,
      false
    >
  >,
  Assert<
    Equal<
      keyof IAerospaceBreakdown,
      | 'engineTons'
      | 'structureTons'
      | 'armorTons'
      | 'heatSinkTons'
      | 'cockpitTons'
      | 'fuelTons'
      | 'equipmentTons'
      | 'equipment'
      | 'total'
      | 'roundedTotal'
      | 'remaining'
    >
  >,
];
