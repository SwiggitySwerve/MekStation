import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

export interface VehicleArmorLocationOption {
  location: VehicleLocation | VTOLLocation;
  label: string;
}

export const ARMOR_TYPE_OPTIONS: { value: ArmorTypeEnum; label: string }[] = [
  { value: ArmorTypeEnum.STANDARD, label: 'Standard' },
  { value: ArmorTypeEnum.FERRO_FIBROUS_IS, label: 'Ferro-Fibrous (IS)' },
  { value: ArmorTypeEnum.FERRO_FIBROUS_CLAN, label: 'Ferro-Fibrous (Clan)' },
  { value: ArmorTypeEnum.LIGHT_FERRO, label: 'Light Ferro-Fibrous' },
  { value: ArmorTypeEnum.HEAVY_FERRO, label: 'Heavy Ferro-Fibrous' },
  { value: ArmorTypeEnum.STEALTH, label: 'Stealth' },
  { value: ArmorTypeEnum.HARDENED, label: 'Hardened' },
  { value: ArmorTypeEnum.REACTIVE, label: 'Reactive' },
  { value: ArmorTypeEnum.REFLECTIVE, label: 'Reflective (Laser)' },
];

export const BASE_VEHICLE_LOCATIONS: VehicleArmorLocationOption[] = [
  { location: VehicleLocation.FRONT, label: 'Front' },
  { location: VehicleLocation.LEFT, label: 'Left Side' },
  { location: VehicleLocation.RIGHT, label: 'Right Side' },
  { location: VehicleLocation.REAR, label: 'Rear' },
  { location: VehicleLocation.TURRET, label: 'Turret' },
];
