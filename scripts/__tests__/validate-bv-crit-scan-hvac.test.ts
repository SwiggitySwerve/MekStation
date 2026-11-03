/**
 * HVAC explosive penalty: MegaMek 48fcb2f6 MekBVCalculator.java:205-215 gives an
 * HVAC weapon the reduced 1-point penalty, and :252-253 counts it once per
 * mounted weapon regardless of slot count (Temax Cat Ninjabolt TMC-NB: 31).
 */
import type { UnitData } from '../validate-bv-types';

import { EngineType } from '../../src/types/construction/EngineType';
import { calculateExplosivePenalties } from '../../src/utils/construction/battleValueExplosivePenalties';
import { scanCrits } from '../validate-bv-crit-scan';

const HVAC10 = 'Hyper Velocity Auto Cannon/10';

function unitWith(criticalSlots: Record<string, (string | null)[]>): UnitData {
  return {
    id: 'hvac-test',
    chassis: 'Test',
    model: 'HVAC',
    tonnage: 65,
    techBase: 'INNER_SPHERE',
    configuration: 'Biped',
    engine: { type: 'XL', rating: 260 },
    equipment: [],
    armor: { type: 'STANDARD', allocation: {} },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'DOUBLE', count: 10 },
    movement: { walk: 4, jump: 4 },
    criticalSlots,
  } as unknown as UnitData;
}

const hvacEntries = (unit: UnitData) =>
  scanCrits(unit).explosive.filter((e) => e.penaltyCategory === 'hvac');

describe('HVAC explosive penalty counts mounted weapons, not slots', () => {
  it('records one entry for a six-slot HVAC/10', () => {
    const unit = unitWith({
      RIGHT_TORSO: ['Fusion Engine', ...Array(6).fill(HVAC10), null],
    });
    expect(hvacEntries(unit)).toEqual([
      { location: 'RT', slots: 1, penaltyCategory: 'hvac' },
    ]);
  });

  it('records two entries for two HVACs separated by another item', () => {
    const unit = unitWith({
      RIGHT_TORSO: [
        ...Array(6).fill(HVAC10),
        'Heat Sink',
        ...Array(6).fill(HVAC10),
      ],
    });
    expect(hvacEntries(unit)).toHaveLength(2);
  });

  it('gives the Temax Cat layout Java 31: 2 ammo x 15 + HVAC 1', () => {
    const scan = scanCrits(
      unitWith({
        LEFT_TORSO: [
          'Fusion Engine',
          'Fusion Engine',
          'Fusion Engine',
          'Medium Laser',
          'ISEnhancedLRM15 Ammo',
          'IS Ammo HVAC/10',
          'ISCASE',
        ],
        RIGHT_TORSO: [
          'Fusion Engine',
          'Fusion Engine',
          'Fusion Engine',
          ...Array(6).fill(HVAC10),
        ],
      }),
    );
    expect(
      calculateExplosivePenalties({
        equipment: scan.explosive,
        caseLocations: ['LT'],
        caseIILocations: [],
        // IS XL: three side-torso slots, so LT CASE still takes the penalty.
        engineType: EngineType.XL_IS,
      }).totalPenalty,
    ).toBe(31);
  });
});
