import { MechLocation } from '@/types/construction';

import { SilhouetteConfig } from './MechSilhouette.types';

export const GEOMETRIC_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 360 400',
  locations: {
    [MechLocation.HEAD]: {
      x: 145,
      y: 0,
      width: 70,
      height: 55,
      path: `
        M 180 0
        L 215 15
        L 215 45
        L 180 55
        L 145 45
        L 145 15
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 125,
      y: 60,
      width: 110,
      height: 115,
      path: `
        M 145 60
        L 215 60
        L 235 90
        L 235 145
        L 215 175
        L 145 175
        L 125 145
        L 125 90
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 55,
      y: 70,
      width: 65,
      height: 105,
      path: `
        M 80 70
        L 120 70
        L 120 165
        L 100 175
        L 55 175
        L 55 85
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 240,
      y: 70,
      width: 65,
      height: 105,
      path: `
        M 280 70
        L 240 70
        L 240 165
        L 260 175
        L 305 175
        L 305 85
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 0,
      y: 75,
      width: 28,
      height: 150,
      path: `
        M 5 75
        L 28 85
        L 28 205
        L 18 225
        L 0 225
        L 0 85
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 332,
      y: 75,
      width: 28,
      height: 150,
      path: `
        M 355 75
        L 332 85
        L 332 205
        L 342 225
        L 360 225
        L 360 85
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 75,
      y: 180,
      width: 60,
      height: 160,
      path: `
        M 85 180
        L 135 180
        L 135 310
        L 125 340
        L 85 340
        L 75 310
        L 75 195
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 225,
      y: 180,
      width: 60,
      height: 160,
      path: `
        M 275 180
        L 225 180
        L 225 310
        L 235 340
        L 275 340
        L 285 310
        L 285 195
        Z
      `,
    },
  },
};
