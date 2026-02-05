import { MechLocation } from '@/types/construction';

import { SilhouetteConfig } from './MechSilhouette.types';

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
