export interface IWeaponTemplate {
  readonly name: string;
  readonly shortRange: number;
  readonly mediumRange: number;
  readonly longRange: number;
  readonly damage: number;
  readonly heat: number;
  readonly minRange: number;
  readonly ammoPerTon: number;
}

export interface IUnitTemplate {
  readonly name: string;
  readonly tonnage: number;
  readonly walkMP: number;
  readonly jumpMP: number;
  readonly armor: Record<string, number>;
  readonly structure: Record<string, number>;
  readonly weapons: readonly IWeaponTemplate[];
}

export interface IGenerationOptions {
  readonly playerEdge: 'north' | 'south' | 'random';
}

export const DEFAULT_GENERATION_OPTIONS: IGenerationOptions = {
  playerEdge: 'north',
};
