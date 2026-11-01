import type { IArmorConfig, IUnitDetails } from '@/types/pages';
import type { UnitFamily } from '@/types/unit/UnitIndex';

export interface IDetailMovementStat {
  readonly label: string;
  readonly value: number | undefined;
}

export function getCompendiumDetailPresentation(
  unit: IUnitDetails,
  family: UnitFamily,
): {
  armor: IArmorConfig | undefined;
  movementStats?: readonly IDetailMovementStat[];
} {
  const { armor, movement } = unit;
  if (family === 'vehicles') {
    return {
      armor: armor && { ...armor, allocation: armor.byLocation },
      movementStats: [
        { label: 'Cruise MP', value: movement?.cruiseMP },
        { label: 'Flank MP', value: movement?.flankMP },
        { label: 'Jump MP', value: movement?.jumpMP },
      ],
    };
  }
  if (family === 'aerospace') {
    return {
      armor: armor && { ...armor, allocation: armor.byArc },
      movementStats: [
        { label: 'Safe Thrust', value: movement?.safeThrust },
        { label: 'Max Thrust', value: movement?.maxThrust },
      ],
    };
  }
  return { armor };
}
