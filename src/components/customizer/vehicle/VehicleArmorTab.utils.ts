import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

export type VehicleArmorLocation = VehicleLocation | VTOLLocation;

export interface IVehicleArmorProfile {
  readonly hasTurret: boolean;
  readonly isVTOL: boolean;
  readonly hasSecondaryTurret?: boolean;
}

export interface IGetMaxVehicleArmorForLocationInput {
  readonly tonnage: number;
  readonly location: VehicleArmorLocation;
  readonly profile: IVehicleArmorProfile;
}

export interface IGetMaxVehicleArmorInput {
  readonly tonnage: number;
  readonly profile: IVehicleArmorProfile;
}

interface IVehicleArmorLimitContext {
  readonly baseStructure: number;
  readonly profile: Required<IVehicleArmorProfile>;
}

type VehicleArmorLimitResolver = (context: IVehicleArmorLimitContext) => number;

const VEHICLE_ARMOR_LIMIT_RESOLVERS: ReadonlyMap<
  VehicleArmorLocation,
  VehicleArmorLimitResolver
> = new Map<VehicleArmorLocation, VehicleArmorLimitResolver>([
  [VehicleLocation.FRONT, ({ baseStructure }) => baseStructure * 4],
  [VehicleLocation.LEFT, ({ baseStructure }) => baseStructure * 3],
  [VehicleLocation.RIGHT, ({ baseStructure }) => baseStructure * 3],
  [VehicleLocation.REAR, ({ baseStructure }) => baseStructure * 2],
  [
    VehicleLocation.TURRET,
    ({ baseStructure, profile }) => (profile.hasTurret ? baseStructure * 2 : 0),
  ],
  [
    VehicleLocation.TURRET_2,
    ({ baseStructure, profile }) =>
      profile.hasSecondaryTurret ? baseStructure * 2 : 0,
  ],
  [VTOLLocation.ROTOR, ({ profile }) => (profile.isVTOL ? 2 : 0)],
]);

export function calculateArmorPoints(
  tonnage: number,
  armorType: ArmorTypeEnum,
): number {
  const def = getArmorDefinition(armorType);
  const pointsPerTon = def?.pointsPerTon ?? 16;
  return Math.floor(tonnage * pointsPerTon);
}

export function getMaxVehicleArmorForLocation(
  input: IGetMaxVehicleArmorForLocationInput | number,
  ...legacy:
    | []
    | [
        location: VehicleArmorLocation,
        hasTurret: boolean,
        isVTOL: boolean,
        hasSecondaryTurret?: boolean,
      ]
): number {
  const [location, hasTurret, isVTOL, hasSecondaryTurret] = legacy as [
    VehicleArmorLocation,
    boolean,
    boolean,
    boolean | undefined,
  ];
  const eventInput =
    typeof input !== 'number'
      ? input
      : {
          tonnage: input,
          location,
          profile: { hasTurret, isVTOL, hasSecondaryTurret },
        };
  const armorProfile: Required<IVehicleArmorProfile> = {
    ...eventInput.profile,
    hasSecondaryTurret: eventInput.profile.hasSecondaryTurret ?? false,
  };
  const baseStructure = Math.floor(eventInput.tonnage / 10) + 1;
  const resolver = VEHICLE_ARMOR_LIMIT_RESOLVERS.get(eventInput.location);
  return resolver?.({ baseStructure, profile: armorProfile }) ?? 0;
}

export function getMaxVehicleArmor(
  input: IGetMaxVehicleArmorInput | number,
  ...legacy:
    | []
    | [hasTurret: boolean, isVTOL: boolean, hasSecondaryTurret?: boolean]
): number {
  const [hasTurret, isVTOL, hasSecondaryTurret] = legacy as [
    boolean,
    boolean,
    boolean | undefined,
  ];
  const eventInput =
    typeof input !== 'number'
      ? input
      : {
          tonnage: input,
          profile: { hasTurret, isVTOL, hasSecondaryTurret },
        };
  let total = 0;
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.FRONT,
    profile: eventInput.profile,
  });
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.LEFT,
    profile: eventInput.profile,
  });
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.RIGHT,
    profile: eventInput.profile,
  });
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.REAR,
    profile: eventInput.profile,
  });
  if (eventInput.profile.hasTurret) {
    total += getMaxVehicleArmorForLocation({
      tonnage: eventInput.tonnage,
      location: VehicleLocation.TURRET,
      profile: eventInput.profile,
    });
  }
  if (eventInput.profile.hasSecondaryTurret === true) {
    total += getMaxVehicleArmorForLocation({
      tonnage: eventInput.tonnage,
      location: VehicleLocation.TURRET_2,
      profile: eventInput.profile,
    });
  }
  if (eventInput.profile.isVTOL) {
    total += getMaxVehicleArmorForLocation({
      tonnage: eventInput.tonnage,
      location: VTOLLocation.ROTOR,
      profile: eventInput.profile,
    });
  }
  return total;
}
