import type {
  IAerospaceToken,
  IBattleArmorToken,
  IGameUnit,
  IHexCoordinate,
  IInfantryToken,
  IMechToken,
  IProtoMechToken,
  IUnitToken,
  IVehicleToken,
} from '@/types/gameplay';
import type {
  ArmorPipState,
  BipedPipLocation,
  PipLocationState,
  QuadPipLocation,
} from '@/types/gameplay/UnitSpriteTypes';

import { Facing, TokenUnitType } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

export interface UnitAccumulator {
  readonly unitId: string;
  readonly name: string;
  readonly side: IGameUnit['side'];
  readonly unitType: TokenUnitType;
  position: IHexCoordinate;
  facing: Facing;
  isDestroyed: boolean;
  prone: boolean;
  currentHeat: number;
  pilotWounds: number;
  damagedLocations: ReadonlySet<string>;
  armorPipState?: ArmorPipState;
  perType?: {
    altitude?: number;
    trooperCount?: number;
    infantryCount?: number;
    platoonCount?: number;
    protoCount?: number;
    isGlider?: boolean;
    hasMainGun?: boolean;
  };
}

function tokenTypeFor(unitType: UnitType | undefined): TokenUnitType {
  switch (unitType) {
    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
    case UnitType.SMALL_CRAFT:
    case UnitType.DROPSHIP:
    case UnitType.JUMPSHIP:
    case UnitType.WARSHIP:
    case UnitType.SPACE_STATION:
      return TokenUnitType.Aerospace;
    case UnitType.PROTOMECH:
      return TokenUnitType.ProtoMech;
    case UnitType.BATTLE_ARMOR:
      return TokenUnitType.BattleArmor;
    case UnitType.INFANTRY:
      return TokenUnitType.Infantry;
    case UnitType.VEHICLE:
    case UnitType.VTOL:
      return TokenUnitType.Vehicle;
    case UnitType.BATTLEMECH:
    case UnitType.OMNIMECH:
    case UnitType.INDUSTRIALMECH:
    default:
      return TokenUnitType.Mech;
  }
}

function designationFor(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((word) => (word.length > 0 ? word[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

export function seedAccumulator(unit: IGameUnit): UnitAccumulator {
  const tokenType = tokenTypeFor(unit.unitType);
  const acc: UnitAccumulator = {
    unitId: unit.id,
    name: unit.name,
    side: unit.side,
    unitType: tokenType,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isDestroyed: false,
    prone: false,
    currentHeat: 0,
    pilotWounds: 0,
    damagedLocations: new Set<string>(),
  };

  switch (tokenType) {
    case TokenUnitType.Aerospace:
      acc.perType = {
        altitude: unit.aerospaceInit?.altitude ?? 0,
      };
      break;
    case TokenUnitType.BattleArmor:
      acc.perType = {
        trooperCount: unit.battleArmorInit?.squadSize ?? 1,
      };
      break;
    case TokenUnitType.Infantry:
      acc.perType = {
        infantryCount: unit.infantryInit?.platoonStrength ?? 1,
        platoonCount: 1,
      };
      break;
    case TokenUnitType.ProtoMech:
      acc.perType = {
        protoCount: 1,
        isGlider: unit.protoMechInit?.chassisType === ProtoChassis.GLIDER,
        hasMainGun: unit.protoMechInit?.hasMainGun ?? false,
      };
      break;
    default:
      break;
  }

  return acc;
}

export function accumulatorToToken(acc: UnitAccumulator): IUnitToken {
  const designation = designationFor(acc.name);
  const base = {
    unitId: acc.unitId,
    name: acc.name,
    side: acc.side,
    position: acc.position,
    facing: acc.facing,
    isSelected: false,
    isValidTarget: false,
    isActiveTarget: false,
    isDestroyed: acc.isDestroyed,
    // Audit 2026-06-09 G (W5.1b): the accumulator's prone state was
    // write-only — UnitFell/UnitStood and posture-as-movement events
    // mutated it but the token never carried the result. Project it so
    // the replay viewer can render prone tokens.
    isProne: acc.prone,
    designation,
  } as const;

  switch (acc.unitType) {
    case TokenUnitType.Aerospace: {
      const token: IAerospaceToken = {
        ...base,
        unitType: TokenUnitType.Aerospace,
        altitude: acc.perType?.altitude ?? 0,
      };
      return token;
    }
    case TokenUnitType.Vehicle: {
      const token: IVehicleToken = {
        ...base,
        unitType: TokenUnitType.Vehicle,
      };
      return token;
    }
    case TokenUnitType.BattleArmor: {
      const token: IBattleArmorToken = {
        ...base,
        unitType: TokenUnitType.BattleArmor,
        trooperCount: acc.perType?.trooperCount ?? 1,
      };
      return token;
    }
    case TokenUnitType.Infantry: {
      const token: IInfantryToken = {
        ...base,
        unitType: TokenUnitType.Infantry,
        infantryCount: acc.perType?.infantryCount ?? 1,
        platoonCount: acc.perType?.platoonCount ?? 1,
      };
      return token;
    }
    case TokenUnitType.ProtoMech: {
      const token: IProtoMechToken = {
        ...base,
        unitType: TokenUnitType.ProtoMech,
        protoCount: acc.isDestroyed ? 0 : (acc.perType?.protoCount ?? 1),
        isGlider: acc.perType?.isGlider ?? false,
        hasMainGun: acc.perType?.hasMainGun ?? false,
      };
      return token;
    }
    case TokenUnitType.Mech:
    default: {
      const token: IMechToken = {
        ...base,
        unitType: TokenUnitType.Mech,
        ...(acc.armorPipState !== undefined && {
          armorPipState: acc.armorPipState,
        }),
      };
      return token;
    }
  }
}

const INTERNAL_COMPONENT_TYPES: ReadonlySet<string> = new Set([
  'engine',
  'gyro',
  'weapon',
  'actuator',
  'heat_sink',
  'cockpit',
  'sensor',
  'life_support',
  'jump_jet',
  'ammo',
]);

function bipedLocationFromCode(code: string): BipedPipLocation | null {
  switch (code) {
    case 'HD':
      return 'head';
    case 'CT':
      return 'centerTorso';
    case 'LT':
      return 'leftTorso';
    case 'RT':
      return 'rightTorso';
    case 'LA':
      return 'leftArm';
    case 'RA':
      return 'rightArm';
    case 'LL':
      return 'leftLeg';
    case 'RL':
      return 'rightLeg';
    default:
      return null;
  }
}

function quadLocationFromCode(code: string): QuadPipLocation | null {
  switch (code) {
    case 'HD':
      return 'head';
    case 'CT':
      return 'centerTorso';
    case 'FLL':
      return 'frontLeftLeg';
    case 'FRL':
      return 'frontRightLeg';
    case 'RLL':
      return 'rearLeftLeg';
    case 'RRL':
      return 'rearRightLeg';
    default:
      return null;
  }
}

function emptyArmorPipState(): ArmorPipState {
  const fullLocations: Record<BipedPipLocation, PipLocationState> = {
    head: 'full',
    centerTorso: 'full',
    leftTorso: 'full',
    rightTorso: 'full',
    leftArm: 'full',
    rightArm: 'full',
    leftLeg: 'full',
    rightLeg: 'full',
  };
  return {
    archetype: 'humanoid',
    locations: fullLocations,
  };
}

export function applyComponentDestroyedToPips(
  prev: ArmorPipState | undefined,
  locationCode: string,
  componentType: string,
  locationAlreadyDestroyed: boolean,
): ArmorPipState | undefined {
  const base = prev ?? emptyArmorPipState();
  if (base.archetype === 'quad') {
    const key = quadLocationFromCode(locationCode);
    if (key === null) return prev;
    const current = base.locations[key];
    const next = nextPipState(current, componentType, locationAlreadyDestroyed);
    if (next === current) return prev;
    return {
      archetype: 'quad',
      locations: { ...base.locations, [key]: next },
    };
  }

  const key = bipedLocationFromCode(locationCode);
  if (key === null) return prev;
  const current = base.locations[key];
  const next = nextPipState(current, componentType, locationAlreadyDestroyed);
  if (next === current) return prev;
  return {
    archetype: base.archetype,
    locations: { ...base.locations, [key]: next },
  };
}

function nextPipState(
  current: PipLocationState,
  componentType: string,
  locationAlreadyDestroyed: boolean,
): PipLocationState {
  if (current === 'destroyed' || current === 'missing') return current;
  if (locationAlreadyDestroyed) return 'destroyed';
  if (INTERNAL_COMPONENT_TYPES.has(componentType)) return 'structure';
  if (current === 'full') return 'partial';
  return current;
}
