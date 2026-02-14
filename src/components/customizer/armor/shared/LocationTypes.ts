import { LocationPosition } from './MechSilhouette';

export interface LocationArmorValues {
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
}

export interface LocationContentProps {
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  label: string;
  isSelected: boolean;
  isHovered: boolean;
}
