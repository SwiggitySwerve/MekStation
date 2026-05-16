/**
 * Aerospace / conventional-fighter family adapter — unit tests.
 *
 * Covers `selectAerospaceTemplate` (both keys) and `bindAerospace`
 * (`PipCounts` for the 4 arcs).
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import type {
  IAerospaceRecordSheetData,
  IRecordSheetHeader,
} from '@/types/printing';

import { bindAerospace, computeAerospacePipCounts } from '../bindings';
import { selectAerospaceTemplate } from '../selectTemplate';

function header(): IRecordSheetHeader {
  return {
    unitName: 'Shilone',
    chassis: 'Shilone',
    model: 'SL-15',
    tonnage: 65,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: 'Succession Wars',
    role: 'Striker',
    battleValue: 1815,
    cost: 5_000_000,
  };
}

function aerospace(
  overrides: Partial<IAerospaceRecordSheetData> = {},
): IAerospaceRecordSheetData {
  return {
    unitType: 'aerospace',
    header: header(),
    structuralIntegrity: 8,
    fuelPoints: 400,
    safeThrust: 5,
    maxThrust: 8,
    heatSinks: {
      type: 'Single',
      count: 16,
      capacity: 16,
      integrated: 10,
      external: 6,
    },
    armorType: 'Standard Aerospace',
    armorArcs: [
      { arc: 'Nose', current: 70, maximum: 70 },
      { arc: 'Left Wing', current: 60, maximum: 60 },
      { arc: 'Right Wing', current: 60, maximum: 60 },
      { arc: 'Aft', current: 50, maximum: 50 },
    ],
    equipment: [],
    bombBaySlots: 0,
    ...overrides,
  };
}

describe('selectAerospaceTemplate', () => {
  it('maps an aerospace fighter to fighter_aerospace', () => {
    expect(selectAerospaceTemplate(aerospace({ isConventional: false }))).toBe(
      'fighter_aerospace',
    );
  });

  it('treats an omitted isConventional flag as aerospace', () => {
    expect(selectAerospaceTemplate(aerospace())).toBe('fighter_aerospace');
  });

  it('maps a conventional fighter to fighter_conventional', () => {
    expect(selectAerospaceTemplate(aerospace({ isConventional: true }))).toBe(
      'fighter_conventional',
    );
  });
});

describe('bindAerospace — PipCounts', () => {
  it('computes per-arc pip counts equal to the fighter armor stats', () => {
    const counts = computeAerospacePipCounts(aerospace());
    expect(counts).toEqual({ NOS: 70, LWG: 60, RWG: 60, AFT: 50 });
  });

  it('defaults absent arcs to zero', () => {
    const partial = aerospace({
      armorArcs: [{ arc: 'Nose', current: 30, maximum: 30 }],
    });
    expect(computeAerospacePipCounts(partial)).toEqual({
      NOS: 30,
      LWG: 0,
      RWG: 0,
      AFT: 0,
    });
  });

  it('binds text only to catalogued template IDs', () => {
    const { texts } = bindAerospace(aerospace());
    expect(texts.type).toBe('Shilone SL-15');
    expect(texts.tonnage).toBe('65');
    expect(texts.textSI).toBe('8');
    expect(texts.textArmor_NOS).toBe('70');
    expect(texts.hsType).toBe('Single');
    expect(texts.hsCount).toBe('16');
  });

  it('emits one pip fill per armed arc with the correct count', () => {
    const { pips } = bindAerospace(aerospace());
    const byGroup = Object.fromEntries(pips.map((p) => [p.groupId, p.count]));
    expect(byGroup.armorPipsNOS).toBe(70);
    expect(byGroup.armorPipsLWG).toBe(60);
    expect(byGroup.armorPipsRWG).toBe(60);
    expect(byGroup.armorPipsAFT).toBe(50);
  });
});
