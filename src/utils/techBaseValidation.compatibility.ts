import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { ALL_TECH_BASES, TechBase } from '@/types/enums/TechBase';

/** Preserve component membership on its selected side or either side in Mixed mode. */
export function isComponentAllowedForTechMode(
  mode: TechBaseMode | undefined,
  unitSide: TechBase,
  supportedOnSide: (side: TechBase) => boolean,
): boolean {
  return mode === TechBaseMode.MIXED
    ? ALL_TECH_BASES.some((side) => supportedOnSide(side))
    : supportedOnSide(unitSide);
}
