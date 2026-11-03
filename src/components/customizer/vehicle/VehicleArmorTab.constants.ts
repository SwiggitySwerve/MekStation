import { ArmorTypeEnum } from '@/types/construction/ArmorType';

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
  { value: ArmorTypeEnum.FERRO_LAMELLOR, label: 'Ferro-Lamellor' },
  { value: ArmorTypeEnum.BALLISTIC_REINFORCED, label: 'Ballistic-Reinforced' },
];
