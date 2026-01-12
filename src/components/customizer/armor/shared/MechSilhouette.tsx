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
  locations: Partial<Record<MechLocation, LocationPosition>>;
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
 * BattleMech-style silhouette with proper MegaMek-like proportions
 * Based on classic record sheet armor diagram layout
 */
export const BATTLEMECH_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 200 280',
  locations: {
    [MechLocation.HEAD]: {
      x: 75,
      y: 0,
      width: 50,
      height: 32,
      // Cockpit-style head
      path: `
        M 82 2
        L 118 2
        L 122 8
        L 122 26
        L 118 32
        L 82 32
        L 78 26
        L 78 8
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 72,
      y: 36,
      width: 56,
      height: 80,
      // Central torso - reactor housing
      path: `
        M 76 36
        L 124 36
        L 128 44
        L 128 108
        L 124 116
        L 76 116
        L 72 108
        L 72 44
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 30,
      y: 38,
      width: 40,
      height: 78,
      // Left side torso
      path: `
        M 34 42
        L 70 38
        L 70 116
        L 58 116
        L 34 112
        L 30 104
        L 30 50
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 130,
      y: 38,
      width: 40,
      height: 78,
      // Right side torso (mirrored)
      path: `
        M 166 42
        L 130 38
        L 130 116
        L 142 116
        L 166 112
        L 170 104
        L 170 50
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 2,
      y: 42,
      width: 26,
      height: 100,
      // Left arm with actuator segments
      path: `
        M 8 46
        L 26 42
        L 26 68
        L 22 74
        L 22 84
        L 26 90
        L 26 130
        L 22 138
        L 14 142
        L 8 142
        L 2 134
        L 2 54
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 172,
      y: 42,
      width: 26,
      height: 100,
      // Right arm (mirrored)
      path: `
        M 192 46
        L 174 42
        L 174 68
        L 178 74
        L 178 84
        L 174 90
        L 174 130
        L 178 138
        L 186 142
        L 192 142
        L 198 134
        L 198 54
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 42,
      y: 120,
      width: 46,
      height: 110,
      // Left leg with knee joint
      path: `
        M 46 120
        L 84 120
        L 88 132
        L 86 168
        L 82 178
        L 82 212
        L 88 224
        L 84 232
        L 46 232
        L 42 224
        L 48 212
        L 48 178
        L 44 168
        L 42 132
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 112,
      y: 120,
      width: 46,
      height: 110,
      // Right leg (mirrored)
      path: `
        M 154 120
        L 116 120
        L 112 132
        L 114 168
        L 118 178
        L 118 212
        L 112 224
        L 116 232
        L 154 232
        L 158 224
        L 152 212
        L 152 178
        L 156 168
        L 158 132
        Z
      `,
    },
  },
  outlinePath: `
    M 100 0
    C 85 0, 78 4, 78 12
    L 78 32
    L 70 36
    L 30 42
    L 26 42
    L 2 54
    L 2 142
    L 26 142
    L 30 120
    L 42 120
    L 42 232
    L 88 232
    L 88 120
    L 112 120
    L 112 232
    L 158 232
    L 158 120
    L 170 120
    L 174 142
    L 198 142
    L 198 54
    L 174 42
    L 170 42
    L 130 36
    L 122 32
    L 122 12
    C 122 4, 115 0, 100 0
    Z
  `,
};

/**
 * MegaMek-style silhouette - Faithful to PDF record sheet armor diagram
 * Classic blocky/rectangular style matching MegaMek record sheets
 * Simple, clean shapes with clear location boundaries
 */
export const MEGAMEK_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 200 320',
  locations: {
    [MechLocation.HEAD]: {
      x: 70,
      y: 8,
      width: 60,
      height: 44,
      // Classic MegaMek cockpit - rounded top, flat bottom
      path: `
        M 100 8
        C 80 8, 70 18, 70 28
        L 70 52
        L 130 52
        L 130 28
        C 130 18, 120 8, 100 8
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 70,
      y: 56,
      width: 60,
      height: 100,
      // Central torso - straight rectangular
      path: `
        M 70 56
        L 130 56
        L 130 156
        L 70 156
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 28,
      y: 60,
      width: 40,
      height: 96,
      // Left side torso - angled connection to CT
      path: `
        M 68 60
        L 32 68
        L 28 76
        L 28 148
        L 32 156
        L 68 156
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 132,
      y: 60,
      width: 40,
      height: 96,
      // Right side torso (mirrored)
      path: `
        M 132 60
        L 168 68
        L 172 76
        L 172 148
        L 168 156
        L 132 156
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 4,
      y: 56,
      width: 22,
      height: 120,
      // Left arm - simple rectangle with shoulder
      path: `
        M 26 56
        L 26 64
        L 8 72
        L 4 80
        L 4 168
        L 8 176
        L 22 176
        L 26 168
        L 26 64
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 174,
      y: 56,
      width: 22,
      height: 120,
      // Right arm (mirrored)
      path: `
        M 174 56
        L 174 64
        L 192 72
        L 196 80
        L 196 168
        L 192 176
        L 178 176
        L 174 168
        L 174 64
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 36,
      y: 160,
      width: 52,
      height: 152,
      // Left leg - hip to foot
      path: `
        M 88 160
        L 88 200
        L 84 210
        L 84 280
        L 88 292
        L 88 312
        L 36 312
        L 36 292
        L 40 280
        L 40 210
        L 36 200
        L 36 168
        L 44 160
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 112,
      y: 160,
      width: 52,
      height: 152,
      // Right leg (mirrored)
      path: `
        M 112 160
        L 112 200
        L 116 210
        L 116 280
        L 112 292
        L 112 312
        L 164 312
        L 164 292
        L 160 280
        L 160 210
        L 164 200
        L 164 168
        L 156 160
        Z
      `,
    },
  },
  outlinePath: `
    M 100 8
    C 80 8, 70 18, 70 28
    L 70 56
    L 26 56
    L 4 72
    L 4 176
    L 26 176
    L 28 156
    L 36 160
    L 36 312
    L 88 312
    L 88 160
    L 112 160
    L 112 312
    L 164 312
    L 164 160
    L 172 156
    L 174 176
    L 196 176
    L 196 72
    L 174 56
    L 130 56
    L 130 28
    C 130 18, 120 8, 100 8
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
 * Quad Mech silhouette - four-legged configuration
 * Used for QuadMechs with four legs instead of arms
 */
export const QUAD_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 300 280',
  locations: {
    [MechLocation.HEAD]: {
      x: 115,
      y: 0,
      width: 70,
      height: 45,
      path: `
        M 150 0
        L 175 10
        L 185 25
        L 185 40
        L 165 45
        L 135 45
        L 115 40
        L 115 25
        L 125 10
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 95,
      y: 50,
      width: 110,
      height: 90,
      path: `
        M 110 50
        L 190 50
        L 205 65
        L 205 125
        L 190 140
        L 110 140
        L 95 125
        L 95 65
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 45,
      y: 55,
      width: 48,
      height: 85,
      path: `
        M 93 55
        L 93 135
        L 65 140
        L 45 130
        L 45 70
        L 55 55
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 207,
      y: 55,
      width: 48,
      height: 85,
      path: `
        M 207 55
        L 207 135
        L 235 140
        L 255 130
        L 255 70
        L 245 55
        Z
      `,
    },
    [MechLocation.FRONT_LEFT_LEG]: {
      x: 10,
      y: 45,
      width: 35,
      height: 115,
      path: `
        M 35 45
        L 45 55
        L 45 95
        L 40 105
        L 40 145
        L 35 160
        L 15 160
        L 10 150
        L 10 95
        L 15 80
        L 15 55
        L 25 45
        Z
      `,
    },
    [MechLocation.FRONT_RIGHT_LEG]: {
      x: 255,
      y: 45,
      width: 35,
      height: 115,
      path: `
        M 265 45
        L 255 55
        L 255 95
        L 260 105
        L 260 145
        L 265 160
        L 285 160
        L 290 150
        L 290 95
        L 285 80
        L 285 55
        L 275 45
        Z
      `,
    },
    [MechLocation.REAR_LEFT_LEG]: {
      x: 55,
      y: 145,
      width: 40,
      height: 125,
      path: `
        M 75 145
        L 95 155
        L 95 200
        L 90 215
        L 90 255
        L 85 270
        L 60 270
        L 55 260
        L 55 205
        L 60 185
        L 60 155
        L 65 145
        Z
      `,
    },
    [MechLocation.REAR_RIGHT_LEG]: {
      x: 205,
      y: 145,
      width: 40,
      height: 125,
      path: `
        M 225 145
        L 205 155
        L 205 200
        L 210 215
        L 210 255
        L 215 270
        L 240 270
        L 245 260
        L 245 205
        L 240 185
        L 240 155
        L 235 145
        Z
      `,
    },
  },
  outlinePath: `
    M 150 0
    L 175 10
    L 185 25
    L 185 50
    L 245 55
    L 285 55
    L 290 95
    L 290 160
    L 265 160
    L 255 145
    L 255 140
    L 245 270
    L 215 270
    L 205 200
    L 205 155
    L 110 155
    L 95 200
    L 85 270
    L 55 270
    L 45 140
    L 35 145
    L 10 160
    L 10 95
    L 15 55
    L 55 55
    L 115 50
    L 115 25
    L 125 10
    Z
  `,
};

/**
 * Location labels for biped mechs
 */
export const LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
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
 * Location labels for quad mechs
 */
export const QUAD_LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.FRONT_LEFT_LEG]: 'FLL',
  [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
  [MechLocation.REAR_LEFT_LEG]: 'RLL',
  [MechLocation.REAR_RIGHT_LEG]: 'RRL',
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
