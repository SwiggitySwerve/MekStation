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
  structuralIntegrity?: number;
} {
  const { armor, movement } = unit;
  switch (family) {
    case 'battlemechs':
      return { armor };
    case 'vehicles':
      return {
        armor: armor && { ...armor, allocation: armor.byLocation },
        movementStats: [
          { label: 'Cruise MP', value: movement?.cruiseMP },
          { label: 'Flank MP', value: movement?.flankMP },
          { label: 'Jump MP', value: movement?.jumpMP },
        ],
      };
    case 'aerospace':
    case 'capital': {
      const movementStats = [
        { label: 'Safe Thrust', value: movement?.safeThrust },
        { label: 'Max Thrust', value: movement?.maxThrust },
      ];
      return {
        armor: armor && { ...armor, allocation: armor.byArc },
        movementStats:
          family === 'capital'
            ? movementStats.filter(({ value }) => value !== undefined)
            : movementStats,
        structuralIntegrity:
          family === 'capital' ? unit.structuralIntegrity : undefined,
      };
    }
    case 'battlearmor':
    case 'infantry': {
      const squadMovement =
        movement ?? (family === 'battlearmor' ? unit : undefined);
      return {
        armor,
        movementStats: [
          { label: 'Ground MP', value: squadMovement?.groundMP },
          { label: 'Jump MP', value: squadMovement?.jumpMP },
          { label: 'UMU MP', value: squadMovement?.umuMP },
        ].filter(({ value }) => value !== undefined),
      };
    }
  }
  const exhaustive: never = family;
  throw new Error(`Unsupported unit family: ${exhaustive}`);
}
