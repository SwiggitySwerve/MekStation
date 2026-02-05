import { IAcquisitionModifier } from './acquisitionRoll';

export enum PlanetaryRating {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

export interface IPlanetaryRatings {
  readonly tech: PlanetaryRating;
  readonly industry: PlanetaryRating;
  readonly output: PlanetaryRating;
}

export const TECH_MODIFIER: Record<PlanetaryRating, number> = {
  [PlanetaryRating.A]: -2,
  [PlanetaryRating.B]: -1,
  [PlanetaryRating.C]: 0,
  [PlanetaryRating.D]: 1,
  [PlanetaryRating.E]: 2,
  [PlanetaryRating.F]: 8,
};

export const INDUSTRY_MODIFIER: Record<PlanetaryRating, number | 'IMPOSSIBLE'> =
  {
    [PlanetaryRating.A]: -3,
    [PlanetaryRating.B]: -2,
    [PlanetaryRating.C]: -1,
    [PlanetaryRating.D]: 0,
    [PlanetaryRating.E]: 1,
    [PlanetaryRating.F]: 'IMPOSSIBLE',
  };

export const OUTPUT_MODIFIER: Record<PlanetaryRating, number | 'IMPOSSIBLE'> = {
  [PlanetaryRating.A]: -3,
  [PlanetaryRating.B]: -2,
  [PlanetaryRating.C]: -1,
  [PlanetaryRating.D]: 0,
  [PlanetaryRating.E]: 1,
  [PlanetaryRating.F]: 'IMPOSSIBLE',
};

export const DEFAULT_RATINGS: IPlanetaryRatings = {
  tech: PlanetaryRating.C,
  industry: PlanetaryRating.C,
  output: PlanetaryRating.C,
};

export function getPlanetaryModifiers(
  ratings: IPlanetaryRatings,
): readonly IAcquisitionModifier[] {
  const mods: IAcquisitionModifier[] = [];

  mods.push({ name: 'Tech', value: TECH_MODIFIER[ratings.tech] });

  const indMod = INDUSTRY_MODIFIER[ratings.industry];
  if (indMod === 'IMPOSSIBLE') {
    return [{ name: 'Industry F', value: 99 }];
  }
  mods.push({ name: 'Industry', value: indMod });

  const outMod = OUTPUT_MODIFIER[ratings.output];
  if (outMod === 'IMPOSSIBLE') {
    return [{ name: 'Output F', value: 99 }];
  }
  mods.push({ name: 'Output', value: outMod });

  return mods;
}
