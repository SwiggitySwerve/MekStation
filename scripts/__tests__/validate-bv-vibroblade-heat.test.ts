import type { UnitData } from '../validate-bv-types';

import { buildMechBVWeapons } from '../../src/utils/construction/mechBV/weaponInputs';
import { createEmptyCritScan } from '../validate-bv-crit-scan-types';
import { calculatePhysicalBVTotal } from '../validate-bv-physical-weapons';

const unit: UnitData = {
  id: 'vibroblade-heat',
  chassis: 'Test',
  model: 'Vibroblade',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 70,
  engine: { type: 'FUSION', rating: 280 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
  criticalSlots: {},
};

describe('mounted BV AES compatibility', () => {
  it('retains per-mount physical rounding and case-insensitive AES matching', () => {
    const crit = createEmptyCritScan();
    crit.aesLocs = ['left_arm'];
    crit.physicalWeapons = [
      { type: 'claw', location: 'LEFT_ARM' },
      { type: 'claw', location: 'RIGHT_ARM' },
    ];
    expect(calculatePhysicalBVTotal(crit, 70)).toBe(28.6875);
  });

  it('retains the weapon builder location parsing and AES flag', () => {
    const crit = createEmptyCritScan();
    crit.aesLocs = ['left_arm'];
    const result = buildMechBVWeapons(
      { ...unit, equipment: [{ id: 'medium-laser', location: 'LEFT_ARM' }] },
      crit,
      [],
    );
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0].hasAES).toBe(true);
    expect(result.weapons[0].bv).toBe(46);
  });
});
