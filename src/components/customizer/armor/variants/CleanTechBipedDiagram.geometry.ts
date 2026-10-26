import { MechLocation } from '@/types/construction';

export interface BipedArmorPlate {
  readonly path: string;
  /** Horizontal centre of the plate's text block. */
  readonly x: number;
  /** Text anchor: label baseline for torsos, label row for the other plates. */
  readonly y: number;
  readonly label: string;
  /** Torso plates carry a second (rear) armor face. */
  readonly hasRear?: boolean;
}

/**
 * Local presentation geometry (viewBox 0 0 360 440); allocation limits come
 * from ArmorTab's projection. Arms are narrow and side torsos wide so every
 * plate stays a comfortable tap target and torso values stay readable when the
 * diagram is scaled down on a phone. Left-side plates mirror the right side
 * about x = 180.
 */
export const BIPED_ARMOR_PLATES: Partial<
  Record<MechLocation, BipedArmorPlate>
> = {
  [MechLocation.HEAD]: {
    path: 'M156 26 H204 L214 42 L207 82 H153 L146 42 Z',
    x: 180,
    y: 43,
    label: 'HD',
  },
  [MechLocation.CENTER_TORSO]: {
    path: 'M149 93 H211 L220 131 L210 204 L198 220 H162 L150 204 L140 131 Z',
    x: 180,
    y: 126,
    label: 'CT',
    hasRear: true,
  },
  [MechLocation.LEFT_TORSO]: {
    path: 'M223 93 L293 103 L288 181 L258 215 L221 203 L228 133 Z',
    x: 257,
    y: 126,
    label: 'LT',
    hasRear: true,
  },
  [MechLocation.RIGHT_TORSO]: {
    path: 'M137 93 L67 103 L72 181 L102 215 L139 203 L132 133 Z',
    x: 103,
    y: 126,
    label: 'RT',
    hasRear: true,
  },
  [MechLocation.LEFT_ARM]: {
    path: 'M302 99 L334 111 L345 161 L340 204 L348 250 L332 269 L303 256 L298 217 L306 176 L295 138 Z',
    x: 321,
    y: 169,
    label: 'LA',
  },
  [MechLocation.RIGHT_ARM]: {
    path: 'M58 99 L26 111 L15 161 L20 204 L12 250 L28 269 L57 256 L62 217 L54 176 L65 138 Z',
    x: 39,
    y: 169,
    label: 'RA',
  },
  [MechLocation.LEFT_LEG]: {
    path: 'M190 235 L245 228 L258 290 L247 327 L264 399 L247 415 H185 L186 373 L199 326 L184 280 Z',
    x: 222,
    y: 283,
    label: 'LL',
  },
  [MechLocation.RIGHT_LEG]: {
    path: 'M170 235 L115 228 L102 290 L113 327 L96 399 L113 415 H175 L174 373 L161 326 L176 280 Z',
    x: 138,
    y: 283,
    label: 'RL',
  },
};
