import { calculateVehicleBV, calculateVehicleOffensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

describe('Vehicle offensive BV - weapon modifiers', () => {
  it('single weapon, no turret, no TC -> raw weapon BV x speed factor', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 6,
        weapons: [{ id: 'ppc', location: 'front', bvOverride: 176 }],
      }),
    );
    expect(off.weaponBV).toBe(176);
    expect(off.total).toBeCloseTo(176 * 1.12, 2);
    expect(off.turretModifier).toBe(1.0);
  });

  it('turret-mounted weapon gets +5% bonus (single turret)', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 176,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(176 * 1.05, 4);
    expect(off.turretModifier).toBe(1.05);
  });

  it('sponson-mounted weapon gets +2.5% bonus', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        secondaryTurret: { kind: 'sponson' },
        weapons: [
          {
            id: 'medium-laser',
            location: 'right',
            bvOverride: 46,
            isSponsonMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(46 * 1.025, 4);
    expect(off.turretModifier).toBe(1.025);
  });

  it('rear-mounted, non-turret weapon -> 0.5x BV', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        weapons: [
          {
            id: 'medium-laser',
            location: 'rear',
            bvOverride: 46,
            isRearMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(46 * 0.5, 4);
  });

  it('rear-mounted turret weapon does NOT get the 0.5x rear penalty', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 176,
            isTurretMounted: true,
            isRearMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(176 * 1.05, 4);
  });

  it('TC adds +25% to direct-fire weapons only', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        weapons: [
          { id: 'ppc', location: 'front', bvOverride: 176 },
          { id: 'lrm-10', location: 'front', bvOverride: 90 },
        ],
        offensiveEquipment: [
          {
            id: 'targeting-computer',
            location: 'body',
            isTargetingComputer: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(176 * 1.25 + 90, 4);
  });

  it('artemis-iv linked weapon gets +20%', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        weapons: [
          {
            id: 'lrm-10',
            location: 'front',
            bvOverride: 90,
            artemisType: 'iv',
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(90 * 1.2, 4);
  });
});

describe('Vehicle final BV', () => {
  it('4/5 pilot -> multiplier 1.0 (baseline)', () => {
    const bv = calculateVehicleBV(
      baseInput({
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
        weapons: [{ id: 'ppc', location: 'front', bvOverride: 100 }],
        gunnery: 4,
        piloting: 5,
      }),
    );
    expect(bv.pilotMultiplier).toBe(1.0);
    expect(bv.final).toBe(Math.round(436.5));
  });

  it('3/4 pilot -> multiplier 1.32', () => {
    const bv = calculateVehicleBV(
      baseInput({
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
        weapons: [{ id: 'ppc', location: 'front', bvOverride: 100 }],
        gunnery: 3,
        piloting: 4,
      }),
    );
    expect(bv.pilotMultiplier).toBe(1.32);
    expect(bv.final).toBe(Math.round(436.5 * 1.32));
  });

  it('breakdown contains required fields per spec', () => {
    const bv = calculateVehicleBV(
      baseInput({
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 100,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(bv).toHaveProperty('defensive');
    expect(bv).toHaveProperty('offensive');
    expect(bv).toHaveProperty('pilotMultiplier');
    expect(bv).toHaveProperty('turretModifier');
    expect(bv).toHaveProperty('final');
    expect(bv.turretModifier).toBe(1.05);
  });
});
