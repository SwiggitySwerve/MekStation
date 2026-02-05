import { MechLocation } from '@/types/construction';

import { SilhouetteConfig } from './MechSilhouette.types';

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
