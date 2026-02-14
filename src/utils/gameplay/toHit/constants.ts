import { HEAT_TO_HIT_TABLE } from '@/constants/heat';
import { MovementType, RangeBracket } from '@/types/gameplay';

export const RANGE_MODIFIERS: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 2,
  [RangeBracket.Long]: 4,
  [RangeBracket.Extreme]: 6,
  [RangeBracket.OutOfRange]: Infinity,
};

export const ATTACKER_MOVEMENT_MODIFIERS: Readonly<
  Record<MovementType, number>
> = {
  [MovementType.Stationary]: 0,
  [MovementType.Walk]: 1,
  [MovementType.Run]: 2,
  [MovementType.Jump]: 3,
};

export const HEAT_THRESHOLDS = HEAT_TO_HIT_TABLE;

export const PROBABILITY_TABLE: Readonly<Record<number, number>> = {
  2: 1.0,
  3: 35 / 36,
  4: 33 / 36,
  5: 30 / 36,
  6: 26 / 36,
  7: 21 / 36,
  8: 15 / 36,
  9: 10 / 36,
  10: 6 / 36,
  11: 3 / 36,
  12: 1 / 36,
  13: 0,
};

export const TMM_BRACKETS: readonly {
  min: number;
  max: number;
  tmm: number;
}[] = [
  { min: 0, max: 2, tmm: 0 },
  { min: 3, max: 4, tmm: 1 },
  { min: 5, max: 6, tmm: 2 },
  { min: 7, max: 9, tmm: 3 },
  { min: 10, max: 17, tmm: 4 },
  { min: 18, max: 24, tmm: 5 },
  { min: 25, max: Infinity, tmm: 6 },
];
