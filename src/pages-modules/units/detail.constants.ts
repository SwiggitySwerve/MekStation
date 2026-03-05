import { UnitType } from '@/types/unit/BattleMechInterfaces';

export const UNIT_TYPE_CONFIG: Record<
  string,
  { label: string; badgeVariant: string }
> = {
  [UnitType.BATTLEMECH]: { label: 'BattleMech', badgeVariant: 'emerald' },
  [UnitType.OMNIMECH]: { label: 'OmniMech', badgeVariant: 'teal' },
  [UnitType.INDUSTRIALMECH]: { label: 'IndustrialMech', badgeVariant: 'slate' },
  [UnitType.PROTOMECH]: { label: 'ProtoMech', badgeVariant: 'violet' },
  [UnitType.VEHICLE]: { label: 'Vehicle', badgeVariant: 'amber' },
  [UnitType.VTOL]: { label: 'VTOL', badgeVariant: 'sky' },
  [UnitType.SUPPORT_VEHICLE]: {
    label: 'Support Vehicle',
    badgeVariant: 'slate',
  },
  [UnitType.AEROSPACE]: { label: 'Aerospace', badgeVariant: 'cyan' },
  [UnitType.CONVENTIONAL_FIGHTER]: {
    label: 'Conv. Fighter',
    badgeVariant: 'sky',
  },
  [UnitType.SMALL_CRAFT]: { label: 'Small Craft', badgeVariant: 'indigo' },
  [UnitType.DROPSHIP]: { label: 'DropShip', badgeVariant: 'fuchsia' },
  [UnitType.JUMPSHIP]: { label: 'JumpShip', badgeVariant: 'purple' },
  [UnitType.WARSHIP]: { label: 'WarShip', badgeVariant: 'rose' },
  [UnitType.SPACE_STATION]: { label: 'Space Station', badgeVariant: 'pink' },
  [UnitType.INFANTRY]: { label: 'Infantry', badgeVariant: 'lime' },
  [UnitType.BATTLE_ARMOR]: { label: 'Battle Armor', badgeVariant: 'yellow' },
};

export function getUnitTypeDisplay(unitType: string): { label: string; badgeVariant: string } {
  return (
    UNIT_TYPE_CONFIG[unitType] || { label: unitType, badgeVariant: 'slate' }
  );
}
