/**
 * Conventional Infantry family adapter — unit tests.
 *
 * Covers `selectInfantryTemplate` (per-unit block key) and
 * `bindInfantry` (catalogued text IDs, platoon `PipCounts`, and the
 * 30-value damage row).
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry and Battle Armor Record Sheet Adapters)
 */

import type { IInfantryRecordSheetData } from '@/types/printing';

import { INFANTRY_TEMPLATE_IDS } from '../../templateElementIds';
import {
  bindInfantry,
  computeDamagePerTrooper,
  computeInfantryPipCounts,
} from '../bindings';
import { selectInfantryTemplate } from '../selectTemplate';

/** Build a 28-trooper foot rifle platoon fixture. */
function platoon(
  overrides: Partial<IInfantryRecordSheetData> = {},
): IInfantryRecordSheetData {
  return {
    unitType: 'infantry',
    header: {
      unitName: 'Foot Platoon',
      chassis: 'Foot Platoon',
      model: '(Rifle)',
      tonnage: 3,
      techBase: 'Inner Sphere',
      rulesLevel: 'Standard',
      era: '3025',
      role: 'Infantry',
      battleValue: 90,
      cost: 0,
    },
    platoonSize: 28,
    platoonComposition: { squads: 4, troopersPerSquad: 7 },
    motiveType: 'Foot',
    armorKit: 'None',
    primaryWeapon: {
      name: 'Rifle',
      damage: '1/10',
      infantryDamage: 0.28,
      minimumRange: 0,
      shortRange: 1,
      mediumRange: 2,
      longRange: 3,
    },
    secondaryWeapons: [],
    antiMechTraining: false,
    gunnery: 4,
    antiMech: 5,
    ...overrides,
  };
}

describe('selectInfantryTemplate', () => {
  it('returns the per-unit block key, not the multi-slot outer sheet', () => {
    expect(selectInfantryTemplate(platoon())).toBe(
      'conventional_infantry_platoon',
    );
  });

  it('is a pure deterministic function', () => {
    const fixture = platoon();
    expect(selectInfantryTemplate(fixture)).toBe(
      selectInfantryTemplate(fixture),
    );
  });
});

describe('computeInfantryPipCounts', () => {
  it('platoon pip count equals the platoon trooper count', () => {
    expect(computeInfantryPipCounts(platoon()).platoonSize).toBe(28);
  });

  it('floors a negative platoon size at zero', () => {
    expect(
      computeInfantryPipCounts(platoon({ platoonSize: -5 })).platoonSize,
    ).toBe(0);
  });
});

describe('computeDamagePerTrooper', () => {
  it('reproduces the MegaMek formula for a primary-only platoon', () => {
    // squadSize 7, primary 0.28, no secondaries -> perTrooper 0.28
    expect(computeDamagePerTrooper(platoon())).toBeCloseTo(0.28, 10);
  });

  it('includes secondary-weapon damage when present', () => {
    const data = platoon({
      secondaryWeapons: [
        {
          name: 'SRM Launcher',
          damage: '1/6',
          infantryDamage: 0.57,
          minimumRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          perTrooperRatio: 0,
          count: 2,
        },
      ],
    });
    // damage = 0.28 * (7 - 2) + 0.57 * 2 = 1.4 + 1.14 = 2.54 -> /7
    expect(computeDamagePerTrooper(data)).toBeCloseTo(2.54 / 7, 10);
  });
});

describe('bindInfantry', () => {
  it('binds only catalogued template element IDs', () => {
    const { texts } = bindInfantry(platoon());
    const catalogIds = new Set<string>(Object.values(INFANTRY_TEMPLATE_IDS));
    const damagePrefix = INFANTRY_TEMPLATE_IDS.damagePrefix;
    for (const id of Object.keys(texts)) {
      // damage_N IDs are the numbered family — accept the prefix match.
      const ok = catalogIds.has(id) || id.startsWith(damagePrefix);
      expect(ok).toBe(true);
    }
  });

  it('binds the header type, role, BV, and armor kit', () => {
    const { texts } = bindInfantry(platoon());
    expect(texts[INFANTRY_TEMPLATE_IDS.type]).toBe('Foot Platoon (Rifle)');
    expect(texts[INFANTRY_TEMPLATE_IDS.bv]).toBe('90');
    expect(texts[INFANTRY_TEMPLATE_IDS.armorKit]).toBe('None');
  });

  it('platoon PipCounts equals platoonSize (28-trooper fixture)', () => {
    expect(bindInfantry(platoon()).pipCounts.platoonSize).toBe(28);
  });

  it('produces a 30-value damage row', () => {
    const { damageRow } = bindInfantry(platoon());
    expect(damageRow).toHaveLength(30);
  });

  it('binds damage_1..damage_30 = round(perTrooper * j)', () => {
    const { texts } = bindInfantry(platoon());
    // perTrooper 0.28: damage_1 = round(0.28) = 0; damage_30 = round(8.4) = 8.
    expect(texts[`${INFANTRY_TEMPLATE_IDS.damagePrefix}1`]).toBe('0');
    expect(texts[`${INFANTRY_TEMPLATE_IDS.damagePrefix}30`]).toBe('8');
    // every numbered slot 1..30 is present.
    for (let j = 1; j <= 30; j++) {
      expect(texts[`${INFANTRY_TEMPLATE_IDS.damagePrefix}${j}`]).toBeDefined();
    }
  });

  it('binds the field-gun block only when a field gun is present', () => {
    const without = bindInfantry(platoon());
    expect(without.texts[INFANTRY_TEMPLATE_IDS.fieldGunType]).toBeUndefined();

    const withGun = bindInfantry(
      platoon({
        fieldGun: {
          name: 'Field Gun (AC/2)',
          count: 4,
          damage: 2,
          minimumRange: 4,
          shortRange: 8,
          mediumRange: 16,
          longRange: 24,
        },
      }),
    );
    expect(withGun.texts[INFANTRY_TEMPLATE_IDS.fieldGunType]).toBe(
      'Field Gun (AC/2)',
    );
    expect(withGun.texts[INFANTRY_TEMPLATE_IDS.fieldGunQty]).toBe('4');
  });

  it('is pure — no DOM, no I/O, deterministic', () => {
    const fixture = platoon();
    const a = bindInfantry(fixture);
    const b = bindInfantry(fixture);
    expect(a.texts).toEqual(b.texts);
    expect(a.pipCounts).toEqual(b.pipCounts);
    expect(a.damageRow).toEqual(b.damageRow);
  });
});
