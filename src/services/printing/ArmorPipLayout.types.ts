import { Bounds } from './ArmorPipLayout';

export interface ProcessLayoutParams {
  pipCount: number;
  staggered: boolean;
  bounds: Bounds;
  avgHeight: number;
  avgWidth: number;
  regions: Map<number, Bounds>;
  negativeRegions: Map<number, Bounds>;
  drawPip: (x: number, y: number, radius: number) => void;
}
