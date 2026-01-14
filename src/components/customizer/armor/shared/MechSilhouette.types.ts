import { MechLocation } from '@/types/construction';

export interface LocationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  path?: string;
}

export interface SilhouetteConfig {
  viewBox: string;
  locations: Partial<Record<MechLocation, LocationPosition>>;
  outlinePath?: string;
}
