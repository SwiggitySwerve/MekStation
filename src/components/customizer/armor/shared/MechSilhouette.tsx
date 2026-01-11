/**
 * Mech Silhouette SVG Paths
 *
 * Provides path data and positioning for different mech silhouette styles.
 */

import { MechLocation } from '@/types/construction';

/**
 * Position and dimensions for an armor location
 */
export interface LocationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional path for non-rectangular shapes */
  path?: string;
}

/**
 * Silhouette configuration for a mech type
 */
export interface SilhouetteConfig {
  viewBox: string;
  locations: Record<MechLocation, LocationPosition>;
  /** Optional outline path for wireframe style */
  outlinePath?: string;
}

/**
 * Realistic mech silhouette with smooth contours
 * Based on a classic BattleMech humanoid form
 */
export const REALISTIC_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 300 400',
  locations: {
    [MechLocation.HEAD]: {
      x: 120,
      y: 5,
      width: 60,
      height: 55,
      path: `
        M 135 5
        C 125 5, 120 15, 120 25
        L 120 50
        C 120 55, 125 60, 135 60
        L 165 60
        C 175 60, 180 55, 180 50
        L 180 25
        C 180 15, 175 5, 165 5
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 100,
      y: 65,
      width: 100,
      height: 110,
      path: `
        M 115 65
        L 185 65
        C 195 65, 200 75, 200 85
        L 200 155
        C 200 165, 195 175, 185 175
        L 115 175
        C 105 175, 100 165, 100 155
        L 100 85
        C 100 75, 105 65, 115 65
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 30,
      y: 75,
      width: 65,
      height: 100,
      path: `
        M 45 75
        L 95 75
        L 95 165
        C 95 170, 90 175, 85 175
        L 45 175
        C 35 175, 30 170, 30 160
        L 30 90
        C 30 80, 35 75, 45 75
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 205,
      y: 75,
      width: 65,
      height: 100,
      path: `
        M 255 75
        L 205 75
        L 205 165
        C 205 170, 210 175, 215 175
        L 255 175
        C 265 175, 270 170, 270 160
        L 270 90
        C 270 80, 265 75, 255 75
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 0,
      y: 80,
      width: 28,
      height: 140,
      path: `
        M 8 80
        L 25 80
        C 28 80, 28 85, 28 90
        L 28 200
        C 28 210, 25 220, 20 220
        L 8 220
        C 3 220, 0 210, 0 200
        L 0 90
        C 0 85, 3 80, 8 80
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 272,
      y: 80,
      width: 28,
      height: 140,
      path: `
        M 292 80
        L 275 80
        C 272 80, 272 85, 272 90
        L 272 200
        C 272 210, 275 220, 280 220
        L 292 220
        C 297 220, 300 210, 300 200
        L 300 90
        C 300 85, 297 80, 292 80
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 50,
      y: 185,
      width: 55,
      height: 150,
      path: `
        M 60 185
        L 100 185
        C 105 185, 105 190, 105 195
        L 105 310
        C 105 320, 100 335, 90 335
        L 70 335
        C 55 335, 50 320, 50 310
        L 50 195
        C 50 190, 55 185, 60 185
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 195,
      y: 185,
      width: 55,
      height: 150,
      path: `
        M 240 185
        L 200 185
        C 195 185, 195 190, 195 195
        L 195 310
        C 195 320, 200 335, 210 335
        L 230 335
        C 245 335, 250 320, 250 310
        L 250 195
        C 250 190, 245 185, 240 185
        Z
      `,
    },
  },
  outlinePath: `
    M 150 5
    C 130 5, 120 20, 120 35
    L 120 55
    L 95 65
    L 30 75
    L 0 85
    L 0 220
    L 28 220
    L 28 80
    L 95 75
    L 95 175
    L 50 185
    L 50 335
    L 105 335
    L 105 185
    L 195 185
    L 195 335
    L 250 335
    L 250 185
    L 205 175
    L 205 75
    L 272 80
    L 272 220
    L 300 220
    L 300 85
    L 270 75
    L 205 65
    L 180 55
    L 180 35
    C 180 20, 170 5, 150 5
    Z
  `,
};

/**
 * BattleMech-style silhouette with iconic mech features
 * Inspired by classic designs: broad shoulders, cockpit visor, weapon pods
 */
export const BATTLEMECH_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 320 420',
  locations: {
    [MechLocation.HEAD]: {
      x: 125,
      y: 0,
      width: 70,
      height: 50,
      // Angular cockpit with visor and sensor dome
      path: `
        M 145 0
        L 175 0
        L 185 8
        L 190 25
        L 185 40
        L 175 50
        L 145 50
        L 135 40
        L 130 25
        L 135 8
        Z
        M 140 18
        L 180 18
        L 180 35
        L 140 35
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 110,
      y: 55,
      width: 100,
      height: 120,
      // Broad armored chest with reactor housing
      path: `
        M 120 55
        L 200 55
        L 210 70
        L 210 145
        L 200 165
        L 185 175
        L 135 175
        L 120 165
        L 110 145
        L 110 70
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 20,
      y: 55,
      width: 85,
      height: 115,
      // Left shoulder pod with missile rack styling
      path: `
        M 40 55
        L 105 55
        L 105 160
        L 90 175
        L 40 175
        L 20 155
        L 20 75
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 215,
      y: 55,
      width: 85,
      height: 115,
      // Right shoulder pod mirrored
      path: `
        M 280 55
        L 215 55
        L 215 160
        L 230 175
        L 280 175
        L 300 155
        L 300 75
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 0,
      y: 70,
      width: 35,
      height: 165,
      // Weapon arm with actuator joints
      path: `
        M 10 70
        L 35 80
        L 35 130
        L 30 140
        L 30 200
        L 25 215
        L 20 235
        L 5 235
        L 0 215
        L 0 90
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 285,
      y: 70,
      width: 35,
      height: 165,
      // Mirrored weapon arm
      path: `
        M 310 70
        L 285 80
        L 285 130
        L 290 140
        L 290 200
        L 295 215
        L 300 235
        L 315 235
        L 320 215
        L 320 90
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 55,
      y: 180,
      width: 70,
      height: 180,
      // Heavy leg with armored thigh and foot pad
      path: `
        M 65 180
        L 120 180
        L 125 200
        L 120 260
        L 115 280
        L 115 340
        L 125 360
        L 120 375
        L 60 375
        L 55 360
        L 65 340
        L 65 280
        L 60 260
        L 55 200
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 195,
      y: 180,
      width: 70,
      height: 180,
      // Mirrored right leg
      path: `
        M 255 180
        L 200 180
        L 195 200
        L 200 260
        L 205 280
        L 205 340
        L 195 360
        L 200 375
        L 260 375
        L 265 360
        L 255 340
        L 255 280
        L 260 260
        L 265 200
        Z
      `,
    },
  },
  outlinePath: `
    M 160 0
    C 145 0, 130 8, 130 25
    L 130 45
    L 105 55
    L 40 55
    L 20 75
    L 0 90
    L 0 235
    L 30 235
    L 35 180
    L 55 180
    L 55 375
    L 125 375
    L 125 180
    L 195 180
    L 195 375
    L 265 375
    L 265 180
    L 285 180
    L 290 235
    L 320 235
    L 320 90
    L 300 75
    L 280 55
    L 215 55
    L 190 45
    L 190 25
    C 190 8, 175 0, 160 0
    Z
  `,
};

/**
 * Geometric/polygonal silhouette with angular shapes
 * Low-poly aesthetic with hexagonal influence
 */
export const GEOMETRIC_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 300 400',
  locations: {
    [MechLocation.HEAD]: {
      x: 115,
      y: 0,
      width: 70,
      height: 55,
      path: `
        M 150 0
        L 185 15
        L 185 45
        L 150 55
        L 115 45
        L 115 15
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 95,
      y: 60,
      width: 110,
      height: 115,
      path: `
        M 115 60
        L 185 60
        L 205 90
        L 205 145
        L 185 175
        L 115 175
        L 95 145
        L 95 90
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 25,
      y: 70,
      width: 65,
      height: 105,
      path: `
        M 50 70
        L 90 70
        L 90 165
        L 70 175
        L 25 175
        L 25 85
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 210,
      y: 70,
      width: 65,
      height: 105,
      path: `
        M 250 70
        L 210 70
        L 210 165
        L 230 175
        L 275 175
        L 275 85
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 0,
      y: 75,
      width: 22,
      height: 150,
      path: `
        M 5 75
        L 22 85
        L 22 205
        L 15 225
        L 0 225
        L 0 85
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 278,
      y: 75,
      width: 22,
      height: 150,
      path: `
        M 295 75
        L 278 85
        L 278 205
        L 285 225
        L 300 225
        L 300 85
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 45,
      y: 180,
      width: 60,
      height: 160,
      path: `
        M 55 180
        L 105 180
        L 105 310
        L 95 340
        L 55 340
        L 45 310
        L 45 195
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 195,
      y: 180,
      width: 60,
      height: 160,
      path: `
        M 245 180
        L 195 180
        L 195 310
        L 205 340
        L 245 340
        L 255 310
        L 255 195
        Z
      `,
    },
  },
};

/**
 * Get the center point of a location for text placement
 */
export function getLocationCenter(pos: LocationPosition): { x: number; y: number } {
  return {
    x: pos.x + pos.width / 2,
    y: pos.y + pos.height / 2,
  };
}

/**
 * Get split positions for front/rear on torso locations
 */
export function getTorsoSplit(
  pos: LocationPosition,
  frontRatio: number = 0.7
): { front: LocationPosition; rear: LocationPosition } {
  const frontHeight = pos.height * frontRatio;
  const rearHeight = pos.height * (1 - frontRatio);

  return {
    front: {
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: frontHeight,
    },
    rear: {
      x: pos.x,
      y: pos.y + frontHeight,
      width: pos.width,
      height: rearHeight,
    },
  };
}

/**
 * Location labels
 */
export const LOCATION_LABELS: Record<MechLocation, string> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
};

/**
 * Locations that have rear armor
 */
export const TORSO_LOCATIONS = [
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
] as const;

export function hasTorsoRear(location: MechLocation): boolean {
  return TORSO_LOCATIONS.includes(location as typeof TORSO_LOCATIONS[number]);
}
