export interface IStarmapTravelRules {
  readonly maxJumpDistanceLy: number;
  readonly rechargeDaysPerJump: number;
  readonly transitBufferDays: number;
  readonly maxJumpsPerTravelOrder: number;
  readonly baseTravelFeeCbills: number;
  readonly feePerJumpCbills: number;
  readonly feePerLightYearCbills: number;
  readonly routeAssumptions: readonly string[];
}

export const DEFAULT_STARMAP_TRAVEL_RULES: IStarmapTravelRules = Object.freeze({
  maxJumpDistanceLy: 30,
  rechargeDaysPerJump: 7,
  transitBufferDays: 2,
  maxJumpsPerTravelOrder: 20,
  baseTravelFeeCbills: 5_000,
  feePerJumpCbills: 25_000,
  feePerLightYearCbills: 100,
  routeAssumptions: Object.freeze([
    'Each K-F jump is capped at 30 light-years.',
    'Sparse seed-map routes use abstract recharge-point legs until the full route graph lands.',
    'Travel time includes one recharge window per jump plus a two-day transit buffer.',
    'Travel fees are charged before daily upkeep and repair progress are projected.',
  ]),
});
