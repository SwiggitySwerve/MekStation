import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export const ITEMS_PER_PAGE = 36;

export const UNIT_TYPE_CONFIG: Record<
  string,
  { label: string; badgeVariant: string; color: string }
> = {
  [UnitType.BATTLEMECH]: {
    label: 'BattleMech',
    badgeVariant: 'emerald',
    color: 'bg-emerald-500',
  },
  [UnitType.OMNIMECH]: {
    label: 'OmniMech',
    badgeVariant: 'teal',
    color: 'bg-teal-500',
  },
  [UnitType.INDUSTRIALMECH]: {
    label: 'IndustrialMech',
    badgeVariant: 'slate',
    color: 'bg-slate-500',
  },
  [UnitType.PROTOMECH]: {
    label: 'ProtoMech',
    badgeVariant: 'violet',
    color: 'bg-violet-500',
  },
  [UnitType.VEHICLE]: {
    label: 'Vehicle',
    badgeVariant: 'amber',
    color: 'bg-amber-500',
  },
  [UnitType.VTOL]: { label: 'VTOL', badgeVariant: 'sky', color: 'bg-sky-500' },
  [UnitType.SUPPORT_VEHICLE]: {
    label: 'Support Vehicle',
    badgeVariant: 'slate',
    color: 'bg-slate-400',
  },
  [UnitType.AEROSPACE]: {
    label: 'Aerospace',
    badgeVariant: 'cyan',
    color: 'bg-cyan-500',
  },
  [UnitType.CONVENTIONAL_FIGHTER]: {
    label: 'Conv. Fighter',
    badgeVariant: 'sky',
    color: 'bg-sky-400',
  },
  [UnitType.SMALL_CRAFT]: {
    label: 'Small Craft',
    badgeVariant: 'indigo',
    color: 'bg-indigo-500',
  },
  [UnitType.DROPSHIP]: {
    label: 'DropShip',
    badgeVariant: 'fuchsia',
    color: 'bg-fuchsia-500',
  },
  [UnitType.JUMPSHIP]: {
    label: 'JumpShip',
    badgeVariant: 'purple',
    color: 'bg-purple-500',
  },
  [UnitType.WARSHIP]: {
    label: 'WarShip',
    badgeVariant: 'rose',
    color: 'bg-rose-500',
  },
  [UnitType.SPACE_STATION]: {
    label: 'Space Station',
    badgeVariant: 'pink',
    color: 'bg-pink-500',
  },
  [UnitType.INFANTRY]: {
    label: 'Infantry',
    badgeVariant: 'lime',
    color: 'bg-lime-500',
  },
  [UnitType.BATTLE_ARMOR]: {
    label: 'Battle Armor',
    badgeVariant: 'yellow',
    color: 'bg-yellow-500',
  },
};

export const WEIGHT_CLASS_CONFIG: Record<
  WeightClass,
  { label: string; color: string }
> = {
  [WeightClass.ULTRALIGHT]: { label: 'Ultralight', color: 'text-slate-400' },
  [WeightClass.LIGHT]: { label: 'Light', color: 'text-green-400' },
  [WeightClass.MEDIUM]: { label: 'Medium', color: 'text-yellow-400' },
  [WeightClass.HEAVY]: { label: 'Heavy', color: 'text-orange-400' },
  [WeightClass.ASSAULT]: { label: 'Assault', color: 'text-red-400' },
  [WeightClass.SUPERHEAVY]: { label: 'Superheavy', color: 'text-rose-500' },
};

export function getUnitTypeDisplay(unitType: string): {
  label: string;
  badgeVariant: string;
  color: string;
} {
  return (
    UNIT_TYPE_CONFIG[unitType] || {
      label: unitType,
      badgeVariant: 'slate',
      color: 'bg-slate-500',
    }
  );
}

export function getWeightClassDisplay(weightClass: WeightClass): {
  label: string;
  color: string;
} {
  return (
    WEIGHT_CLASS_CONFIG[weightClass] || {
      label: weightClass,
      color: 'text-slate-400',
    }
  );
}
