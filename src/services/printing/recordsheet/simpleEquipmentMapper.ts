import { IRecordSheetEquipment } from '@/types/printing';

export interface ISimpleEquipmentInput {
  readonly id?: string;
  readonly name: string;
  readonly location: string;
  readonly heat?: number;
  readonly damage?: number | string;
  readonly ranges?: {
    readonly minimum: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
  };
  readonly isWeapon?: boolean;
  readonly isAmmo?: boolean;
  readonly ammoCount?: number;
}

export function mapSimpleRecordSheetEquipment(
  equipment: readonly ISimpleEquipmentInput[] | undefined,
): IRecordSheetEquipment[] {
  return (equipment ?? []).map((eq, index) => ({
    id: eq.id ?? String(index),
    name: eq.name,
    location: eq.location,
    locationAbbr: eq.location.substring(0, 3).toUpperCase(),
    heat: eq.heat ?? '-',
    damage: eq.damage ?? '-',
    damageCode: undefined,
    minimum: eq.ranges?.minimum ?? '-',
    short: eq.ranges?.short ?? '-',
    medium: eq.ranges?.medium ?? '-',
    long: eq.ranges?.long ?? '-',
    quantity: 1,
    isWeapon: eq.isWeapon ?? false,
    isAmmo: eq.isAmmo ?? false,
    ammoCount: eq.ammoCount,
  }));
}
