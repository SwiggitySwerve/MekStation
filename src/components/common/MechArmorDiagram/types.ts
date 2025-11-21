import { ArmorLocation } from '../../../types';

export type MechType = 'Biped' | 'Quad' | 'LAM' | 'Tripod';
export type DiagramSize = 'small' | 'medium' | 'large';
export type DiagramTheme = 'light' | 'dark';

export interface MechArmorDiagramProps {
  armorData: ArmorLocation[];
  mechType?: MechType;
  showRearArmor?: boolean;
  interactive?: boolean;
  size?: DiagramSize;
  theme?: DiagramTheme;
  className?: string;
}

export interface ArmorValueProps {
  location: string;
  value: number;
  rearValue?: number;
  x: number;
  y: number;
  size: DiagramSize;
  theme: DiagramTheme;
  interactive?: boolean;
  onHover?: (location: string | null) => void;
  onClick?: (location: string) => void;
}

export interface MechSilhouetteProps {
  mechType: MechType;
  size: DiagramSize;
  theme: DiagramTheme;
  hoveredLocation?: string | null;
  onLocationHover?: (location: string | null) => void;
  onLocationClick?: (location: string) => void;
}

export interface ArmorLocationMapping {
  location: string;
  x: number;
  y: number;
  rearX?: number;
  rearY?: number;
}

// Standard BattleMech armor locations with positioning
export const BIPED_ARMOR_POSITIONS: ArmorLocationMapping[] = [
  // Head
  { location: 'Head', x: 150, y: 40 },
  
  // Arms
  { location: 'Left Arm', x: 80, y: 120 },
  { location: 'Right Arm', x: 220, y: 120 },
  
  // Torso (front)
  { location: 'Left Torso', x: 100, y: 160, rearX: 100, rearY: 200 },
  { location: 'Center Torso', x: 150, y: 140, rearX: 150, rearY: 180 },
  { location: 'Right Torso', x: 200, y: 160, rearX: 200, rearY: 200 },
  
  // Legs
  { location: 'Left Leg', x: 120, y: 280 },
  { location: 'Right Leg', x: 180, y: 280 },
];

export const QUAD_ARMOR_POSITIONS: ArmorLocationMapping[] = [
  // Head
  { location: 'Head', x: 150, y: 40 },
  
  // Front Legs
  { location: 'Front Left Leg', x: 100, y: 120 },
  { location: 'Front Right Leg', x: 200, y: 120 },
  
  // Torso
  { location: 'Left Torso', x: 100, y: 180, rearX: 100, rearY: 220 },
  { location: 'Center Torso', x: 150, y: 160, rearX: 150, rearY: 200 },
  { location: 'Right Torso', x: 200, y: 180, rearX: 200, rearY: 220 },
  
  // Rear Legs
  { location: 'Rear Left Leg', x: 100, y: 280 },
  { location: 'Rear Right Leg', x: 200, y: 280 },
];

// Size configurations
export const SIZE_CONFIG = {
  small: {
    width: 240,
    height: 320,
    fontSize: 10,
    padding: 4,
  },
  medium: {
    width: 300,
    height: 400,
    fontSize: 12,
    padding: 6,
  },
  large: {
    width: 360,
    height: 480,
    fontSize: 14,
    padding: 8,
  },
};
