import { MechLocation } from '@/types/construction';

import { SilhouetteConfig } from './MechSilhouette.types';

export const MEGAMEK_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 200 320',
  locations: {
    [MechLocation.HEAD]: {
      x: 70,
      y: 8,
      width: 60,
      height: 44,
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
      width: 24,
      height: 120,
      path: `
        M 28 56
        L 28 68
        L 4 72
        L 4 176
        L 28 176
        L 28 156
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 172,
      y: 56,
      width: 24,
      height: 120,
      path: `
        M 172 56
        L 172 68
        L 196 72
        L 196 176
        L 172 176
        L 172 156
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 36,
      y: 160,
      width: 52,
      height: 152,
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
