import { MechLocation } from '@/types/construction';
import { SilhouetteConfig } from './MechSilhouette.types';

export const TRIPOD_SILHOUETTE: SilhouetteConfig = {
  viewBox: '0 0 300 380',
  locations: {
    [MechLocation.HEAD]: {
      x: 120,
      y: 5,
      width: 60,
      height: 50,
      path: `
        M 135 5
        C 125 5, 120 15, 120 25
        L 120 45
        C 120 50, 125 55, 135 55
        L 165 55
        C 175 55, 180 50, 180 45
        L 180 25
        C 180 15, 175 5, 165 5
        Z
      `,
    },
    [MechLocation.CENTER_TORSO]: {
      x: 100,
      y: 60,
      width: 100,
      height: 100,
      path: `
        M 115 60
        L 185 60
        C 195 60, 200 70, 200 80
        L 200 140
        C 200 150, 195 160, 185 160
        L 115 160
        C 105 160, 100 150, 100 140
        L 100 80
        C 100 70, 105 60, 115 60
        Z
      `,
    },
    [MechLocation.LEFT_TORSO]: {
      x: 30,
      y: 70,
      width: 65,
      height: 90,
      path: `
        M 45 70
        L 95 70
        L 95 150
        C 95 155, 90 160, 85 160
        L 45 160
        C 35 160, 30 155, 30 145
        L 30 85
        C 30 75, 35 70, 45 70
        Z
      `,
    },
    [MechLocation.RIGHT_TORSO]: {
      x: 205,
      y: 70,
      width: 65,
      height: 90,
      path: `
        M 255 70
        L 205 70
        L 205 150
        C 205 155, 210 160, 215 160
        L 255 160
        C 265 160, 270 155, 270 145
        L 270 85
        C 270 75, 265 70, 255 70
        Z
      `,
    },
    [MechLocation.LEFT_ARM]: {
      x: 0,
      y: 75,
      width: 28,
      height: 130,
      path: `
        M 8 75
        L 25 75
        C 28 75, 28 80, 28 85
        L 28 185
        C 28 195, 25 205, 20 205
        L 8 205
        C 3 205, 0 195, 0 185
        L 0 85
        C 0 80, 3 75, 8 75
        Z
      `,
    },
    [MechLocation.RIGHT_ARM]: {
      x: 272,
      y: 75,
      width: 28,
      height: 130,
      path: `
        M 292 75
        L 275 75
        C 272 75, 272 80, 272 85
        L 272 185
        C 272 195, 275 205, 280 205
        L 292 205
        C 297 205, 300 195, 300 185
        L 300 85
        C 300 80, 297 75, 292 75
        Z
      `,
    },
    [MechLocation.LEFT_LEG]: {
      x: 40,
      y: 170,
      width: 50,
      height: 130,
      path: `
        M 50 170
        L 85 170
        C 90 170, 90 175, 90 180
        L 90 280
        C 90 290, 85 300, 75 300
        L 55 300
        C 45 300, 40 290, 40 280
        L 40 180
        C 40 175, 45 170, 50 170
        Z
      `,
    },
    [MechLocation.RIGHT_LEG]: {
      x: 210,
      y: 170,
      width: 50,
      height: 130,
      path: `
        M 250 170
        L 215 170
        C 210 170, 210 175, 210 180
        L 210 280
        C 210 290, 215 300, 225 300
        L 245 300
        C 255 300, 260 290, 260 280
        L 260 180
        C 260 175, 255 170, 250 170
        Z
      `,
    },
    [MechLocation.CENTER_LEG]: {
      x: 125,
      y: 165,
      width: 50,
      height: 145,
      path: `
        M 135 165
        L 165 165
        C 172 165, 175 172, 175 180
        L 175 290
        C 175 302, 168 310, 158 310
        L 142 310
        C 132 310, 125 302, 125 290
        L 125 180
        C 125 172, 128 165, 135 165
        Z
      `,
    },
  },
  outlinePath: `
    M 150 5
    C 130 5, 120 20, 120 35
    L 120 50
    L 95 60
    L 30 70
    L 0 80
    L 0 205
    L 28 205
    L 28 75
    L 95 70
    L 95 160
    L 40 170
    L 40 300
    L 90 300
    L 90 170
    L 125 165
    L 125 310
    L 175 310
    L 175 165
    L 210 170
    L 210 300
    L 260 300
    L 260 170
    L 205 160
    L 205 70
    L 272 75
    L 272 205
    L 300 205
    L 300 80
    L 270 70
    L 205 60
    L 180 50
    L 180 35
    C 180 20, 170 5, 150 5
    Z
  `,
};
