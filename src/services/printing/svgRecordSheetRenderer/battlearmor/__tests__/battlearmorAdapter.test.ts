/**
 * Battle Armor family adapter — unit tests.
 *
 * Covers `selectBattleArmorTemplate` (per-unit block key) and
 * `bindBattleArmor` (catalogued text IDs + typed per-trooper
 * `PipCounts`).
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry and Battle Armor Record Sheet Adapters)
 */

import type {
  IBattleArmorRecordSheetData,
  IBattleArmorTrooper,
} from '@/types/printing';

import { BATTLEARMOR_TEMPLATE_IDS } from '../../templateElementIds';
import { bindBattleArmor, computeBattleArmorPipCounts } from '../bindings';
import { selectBattleArmorTemplate } from '../selectTemplate';

/** Build a Battle Armor trooper fixture. */
function trooper(index: number, armorPips: number): IBattleArmorTrooper {
  return {
    index,
    armorPips,
    maximumArmorPips: armorPips,
    gunnery: 4,
    antiMech: 4,
  };
}

/** Build a Battle Armor squad fixture with N troopers. */
function squad(
  trooperCount: number,
  armorPips = 5,
): IBattleArmorRecordSheetData {
  return {
    unitType: 'battlearmor',
    header: {
      unitName: 'Elemental',
      chassis: 'Elemental',
      model: 'Standard',
      tonnage: 1,
      techBase: 'Clan',
      rulesLevel: 'Standard',
      era: '3050',
      role: 'Battle Armor',
      battleValue: 105,
      cost: 0,
    },
    squadSize: trooperCount,
    troopers: Array.from({ length: trooperCount }, (_, i) =>
      trooper(i + 1, armorPips),
    ),
    manipulators: { left: 'Battle Claw', right: 'Battle Claw' },
    jumpMP: 3,
    walkMP: 1,
    umuMP: 0,
    vtolMP: 0,
  };
}

describe('selectBattleArmorTemplate', () => {
  it('returns the per-unit block key, not the multi-slot outer sheet', () => {
    expect(selectBattleArmorTemplate(squad(5))).toBe('battle_armor_squad');
  });

  it('is a pure deterministic function', () => {
    const fixture = squad(6);
    expect(selectBattleArmorTemplate(fixture)).toBe(
      selectBattleArmorTemplate(fixture),
    );
  });
});

describe('computeBattleArmorPipCounts', () => {
  it('produces one entry per trooper with that trooper armorPips', () => {
    const data: IBattleArmorRecordSheetData = {
      ...squad(5),
      troopers: [
        trooper(1, 3),
        trooper(2, 6),
        trooper(3, 9),
        trooper(4, 4),
        trooper(5, 7),
      ],
    };
    const counts = computeBattleArmorPipCounts(data);
    expect(counts.troopers).toHaveLength(5);
    expect(counts.troopers.map((t) => t.armorPips)).toEqual([3, 6, 9, 4, 7]);
    expect(counts.troopers.map((t) => t.column)).toEqual([0, 1, 2, 3, 4]);
  });

  it('handles 4-, 5-, and 6-trooper squads', () => {
    expect(computeBattleArmorPipCounts(squad(4)).troopers).toHaveLength(4);
    expect(computeBattleArmorPipCounts(squad(5)).troopers).toHaveLength(5);
    expect(computeBattleArmorPipCounts(squad(6)).troopers).toHaveLength(6);
  });

  it('clamps to the 6-column template capacity', () => {
    // Defensive — a squad never exceeds 6, but a malformed input must
    // not overflow the template.
    expect(computeBattleArmorPipCounts(squad(8)).troopers).toHaveLength(6);
  });

  it('floors negative armor at zero', () => {
    const data: IBattleArmorRecordSheetData = {
      ...squad(4),
      troopers: [trooper(1, -2), trooper(2, 5), trooper(3, 5), trooper(4, 5)],
    };
    expect(computeBattleArmorPipCounts(data).troopers[0].armorPips).toBe(0);
  });
});

describe('bindBattleArmor', () => {
  it('binds only catalogued template element IDs', () => {
    const { texts } = bindBattleArmor(squad(5));
    const catalogIds = new Set<string>(Object.values(BATTLEARMOR_TEMPLATE_IDS));
    for (const id of Object.keys(texts)) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it('binds the header type, role, BV, and squad designation', () => {
    const { texts } = bindBattleArmor(squad(5));
    expect(texts[BATTLEARMOR_TEMPLATE_IDS.type]).toBe('Elemental Standard');
    expect(texts[BATTLEARMOR_TEMPLATE_IDS.bv]).toBe('105');
    expect(texts[BATTLEARMOR_TEMPLATE_IDS.squad]).toContain('BATTLE ARMOR');
  });

  it('binds jump MP as the secondary movement mode', () => {
    const { texts } = bindBattleArmor(squad(5));
    expect(texts[BATTLEARMOR_TEMPLATE_IDS.movementMode2]).toBe('Jump MP:');
    expect(texts[BATTLEARMOR_TEMPLATE_IDS.mp2]).toBe('3');
  });

  it('exposes per-trooper PipCounts equal to each trooper armor value', () => {
    const data: IBattleArmorRecordSheetData = {
      ...squad(5),
      troopers: [
        trooper(1, 8),
        trooper(2, 8),
        trooper(3, 8),
        trooper(4, 8),
        trooper(5, 8),
      ],
    };
    const { pipCounts } = bindBattleArmor(data);
    expect(pipCounts.troopers).toHaveLength(5);
    for (const t of pipCounts.troopers) {
      expect(t.armorPips).toBe(8);
    }
  });

  it('PipCounts for 4-, 5-, and 6-trooper squads match squad size', () => {
    expect(bindBattleArmor(squad(4)).pipCounts.troopers).toHaveLength(4);
    expect(bindBattleArmor(squad(5)).pipCounts.troopers).toHaveLength(5);
    expect(bindBattleArmor(squad(6)).pipCounts.troopers).toHaveLength(6);
  });

  it('is pure — no DOM, no I/O, deterministic', () => {
    const fixture = squad(6);
    const a = bindBattleArmor(fixture);
    const b = bindBattleArmor(fixture);
    expect(a.texts).toEqual(b.texts);
    expect(a.pipCounts).toEqual(b.pipCounts);
  });
});
