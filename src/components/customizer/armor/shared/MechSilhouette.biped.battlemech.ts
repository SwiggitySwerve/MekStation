import { MechLocation } from '@/types/construction';

import { SilhouetteConfig } from './MechSilhouette.types';

export const BATTLEMECH_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 200 280',
  locations: {
    [MechLocation.HEAD]: {
      x: 75,
      y: 0,
      width: 50,
      height: 32,
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
