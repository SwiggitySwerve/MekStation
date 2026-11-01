import { getCompendiumDetailPresentation } from '@/pages-modules/units/compendiumDetail.presentation';
import { type IUnitDetails, calculateTotalArmor } from '@/types/pages';

it.each(['DropShip', 'JumpShip', 'WarShip', 'Space Station'])(
  'adapts %s arcs without replacing zero thrust or SI',
  (unitType) => {
    const unit: IUnitDetails = {
      id: 'capital',
      tonnage: 1000,
      unitType,
      movement: { safeThrust: 0 },
      structuralIntegrity: 0,
      armor: { type: 'AEROSPACE', byArc: { NOSE: 12, AFT: 8 } },
    };
    const view = getCompendiumDetailPresentation(unit, 'capital');
    expect(view.movementStats).toEqual([{ label: 'Safe Thrust', value: 0 }]);
    expect(view.structuralIntegrity).toBe(0);
    expect(view.armor?.allocation).toEqual({ NOSE: 12, AFT: 8 });
    expect(calculateTotalArmor(view.armor)).toBe(20);
    expect(unit.armor?.allocation).toBeUndefined();
  },
);

it.each(['battlearmor', 'infantry'] as const)(
  'does not invent omitted %s squad movement',
  (family) => {
    const unit: IUnitDetails = {
      id: 'squad',
      tonnage: 1,
      movement: { groundMP: 2 },
    };
    expect(getCompendiumDetailPresentation(unit, family).movementStats).toEqual(
      [{ label: 'Ground MP', value: 2 }],
    );
  },
);
