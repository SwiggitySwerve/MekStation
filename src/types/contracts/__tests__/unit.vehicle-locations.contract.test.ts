import { UnitContract } from '@/types/contracts';

describe('large support vehicle document storage (UL-05)', () => {
  it('preserves the generated mech object API used by custom combat', () => {
    const mech = UnitContract.options[0];
    expect(mech.shape.tonnage.safeParse(250).success).toBe(true);
    expect(mech.shape.tonnage.safeParse(251).success).toBe(false);
    expect(mech.omit({ fluff: true })).toBeDefined();
  });

  it.each(['Support Vehicle', 'SupportVehicle'])(
    'accepts the 600 t Adelante source as %s',
    (unitType) => {
      const unit = { id: 'adelante', unitType, tonnage: 600 };
      expect(UnitContract.parse(unit)).toEqual(unit);
    },
  );

  it.each(['Vehicle', 'VTOL', 'Aerospace', 'Conventional Fighter'])(
    'preserves the existing 250 t document limit for %s',
    (unitType) => {
      expect(
        UnitContract.safeParse({ id: 'boundary', unitType, tonnage: 250 })
          .success,
      ).toBe(true);
      expect(
        UnitContract.safeParse({ id: 'boundary', unitType, tonnage: 251 })
          .success,
      ).toBe(false);
    },
  );

  it('keeps support tonnage within the declared storage range', () => {
    for (const tonnage of [-1, 601]) {
      expect(
        UnitContract.safeParse({
          id: 'boundary',
          unitType: 'Support Vehicle',
          tonnage,
        }).success,
      ).toBe(false);
    }
  });
});
