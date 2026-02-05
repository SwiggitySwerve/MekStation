import { MechLocation } from '@/types/construction';

import { SilhouetteConfig } from './MechSilhouette.types';

export const FIGHTER_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 300 280',
  locations: {
    [MechLocation.NOSE]: {
      x: 115,
      y: 0,
      width: 70,
      height: 60,
      path: `
        M 150 0
        L 175 15
        L 185 35
        L 180 60
        L 120 60
        L 115 35
        L 125 15
        Z
      `,
    },
    [MechLocation.FUSELAGE]: {
      x: 105,
      y: 65,
      width: 90,
      height: 150,
      path: `
        M 120 65
        L 180 65
        L 185 80
        L 185 200
        L 175 215
        L 125 215
        L 115 200
        L 115 80
        Z
      `,
    },
    [MechLocation.LEFT_WING]: {
      x: 5,
      y: 70,
      width: 105,
      height: 100,
      path: `
        M 110 70
        L 110 140
        L 70 165
        L 5 145
        L 5 120
        L 50 85
        L 90 70
        Z
      `,
    },
    [MechLocation.RIGHT_WING]: {
      x: 190,
      y: 70,
      width: 105,
      height: 100,
      path: `
        M 190 70
        L 190 140
        L 230 165
        L 295 145
        L 295 120
        L 250 85
        L 210 70
        Z
      `,
    },
    [MechLocation.AFT]: {
      x: 115,
      y: 220,
      width: 70,
      height: 55,
      path: `
        M 125 220
        L 175 220
        L 180 235
        L 185 270
        L 170 275
        L 130 275
        L 115 270
        L 120 235
        Z
      `,
    },
  },
  outlinePath: `
    M 150 0
    L 175 15
    L 185 35
    L 185 70
    L 295 120
    L 295 145
    L 185 200
    L 185 270
    L 170 275
    L 130 275
    L 115 270
    L 115 200
    L 5 145
    L 5 120
    L 115 70
    L 115 35
    L 125 15
    Z
  `,
};
