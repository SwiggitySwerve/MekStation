/**
 * Wave-2 small-unit templated path — integration + fidelity tests.
 *
 * Covers:
 *  - the pip-count fidelity gate for infantry and battle armor (the
 *    rendered SVG's pip-element count matches the unit's stats);
 *  - the `try/catch` skeleton fallback on asset-load failure;
 *  - `renderTemplated` dispatch for the two Wave-2 unit types;
 *  - the silent-fallback guard — the rendered SVG carries a
 *    canonical-template marker absent from skeleton-renderer output.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirements: Wave-2 Pip-Count Fidelity Gate, Templated-Path
 *    Exercise Guard, Per-Type SVG Renderers)
 */

import type {
  IBattleArmorRecordSheetData,
  IBattleArmorTrooper,
  IInfantryRecordSheetData,
  IRecordSheetHeader,
} from '@/types/printing';

import { resetMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { PaperSize } from '@/types/printing';

import { renderBattleArmorSVG } from '../battleArmorRenderer';
import { renderInfantrySVG } from '../infantryRenderer';
import {
  CANONICAL_TEMPLATE_MARKER,
  isTemplatedUnit,
  renderBattleArmorTemplated,
  renderInfantryTemplated,
  renderTemplated,
} from '../renderTemplated';

const mockFetch = jest.fn();
global.fetch = mockFetch;

/**
 * Build a minimal canonical-shaped `conventional_infantry_platoon`
 * template exposing `soldier_1..count` slots.
 */
function buildInfantryTemplate(soldierSlots: number): string {
  const slots: string[] = [];
  for (let j = 1; j <= soldierSlots; j++) {
    slots.push(
      `<image id="soldier_${j}" x="${j * 14}" y="9" width="13" height="29"/>`,
    );
  }
  const damage: string[] = [];
  for (let j = 1; j <= 30; j++) {
    damage.push(`<text id="damage_${j}"></text>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="type"></text>
  <text id="bv"></text>
  <text id="armor_kit"></text>
  ${damage.join('\n')}
  <g id="platoon">${slots.join('\n')}</g>
</svg>`;
}

/**
 * Build a minimal canonical-shaped `battle_armor_squad` template
 * exposing `pips_0..columns-1` trooper-column regions.
 */
function buildBattleArmorTemplate(columns: number): string {
  const regions: string[] = [];
  for (let i = 0; i < columns; i++) {
    regions.push(
      `<g id="col_${i}"><rect id="pips_${i}" x="${i * 200}" y="0" width="190" height="12"/></g>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="type"></text>
  <text id="bv"></text>
  <text id="squad"></text>
  ${regions.join('\n')}
</svg>`;
}

/** Mock a successful template fetch returning `svg`. */
function mockTemplateOk(svg: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(svg),
    headers: new Headers({ 'content-type': 'image/svg+xml' }),
  });
}

/** Mock a hard asset failure — every source returns 404. */
function mockTemplateFail() {
  mockFetch.mockResolvedValue({ ok: false, status: 404 });
}

function header(): IRecordSheetHeader {
  return {
    unitName: 'Fixture',
    chassis: 'Fixture',
    model: 'FX-1',
    tonnage: 3,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: 'Test',
    role: 'Infantry',
    battleValue: 100,
    cost: 100_000,
  };
}

function trooper(index: number, armorPips: number): IBattleArmorTrooper {
  return {
    index,
    armorPips,
    maximumArmorPips: armorPips,
    gunnery: 4,
    antiMech: 4,
  };
}

/** A 28-trooper foot rifle platoon fixture. */
function infantryFixture(platoonSize = 28): IInfantryRecordSheetData {
  return {
    unitType: 'infantry',
    header: header(),
    platoonSize,
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
  };
}

/** A Battle Armor squad fixture with the given per-trooper armor. */
function battleArmorFixture(
  armorByTrooper: readonly number[],
): IBattleArmorRecordSheetData {
  return {
    unitType: 'battlearmor',
    header: { ...header(), role: 'Battle Armor', battleValue: 105 },
    squadSize: armorByTrooper.length,
    troopers: armorByTrooper.map((armor, i) => trooper(i + 1, armor)),
    manipulators: { left: 'Battle Claw', right: 'Battle Claw' },
    jumpMP: 3,
    walkMP: 1,
    umuMP: 0,
    vtolMP: 0,
  };
}

/** Count `<circle>` pip elements in a rendered SVG string. */
function countCircles(svg: string): number {
  return (svg.match(/<circle\b/g) ?? []).length;
}

beforeEach(() => {
  mockFetch.mockReset();
  resetMmDataAssetService();
});

describe('infantry pip-count fidelity gate', () => {
  it('platoon pip-grid element count equals the trooper count', async () => {
    mockTemplateOk(buildInfantryTemplate(30));
    const svg = await renderInfantryTemplated(
      infantryFixture(28),
      PaperSize.LETTER,
    );
    // 28 platoon pip markers — one per occupied soldier slot.
    expect(countCircles(svg)).toBe(28);
  });

  it('a deliberately-wrong fixture fails the fidelity assertion', async () => {
    mockTemplateOk(buildInfantryTemplate(30));
    const svg = await renderInfantryTemplated(
      infantryFixture(20),
      PaperSize.LETTER,
    );
    // The fixture truly has 20 troopers; asserting 28 must fail.
    expect(countCircles(svg)).not.toBe(28);
    expect(countCircles(svg)).toBe(20);
  });
});

describe('battle armor pip-count fidelity gate', () => {
  it('per-trooper pip count equals each trooper armor + 1', async () => {
    mockTemplateOk(buildBattleArmorTemplate(6));
    // 5-trooper squad, 5 armor each -> 6 pips per column -> 30 total.
    const svg = await renderBattleArmorTemplated(
      battleArmorFixture([5, 5, 5, 5, 5]),
      PaperSize.LETTER,
    );
    expect(countCircles(svg)).toBe(5 * 6);
  });

  it('respects varied per-trooper armor values', async () => {
    mockTemplateOk(buildBattleArmorTemplate(6));
    // armor 3,8,10 -> pips 4,9,11 -> 24 total.
    const svg = await renderBattleArmorTemplated(
      battleArmorFixture([3, 8, 10]),
      PaperSize.LETTER,
    );
    expect(countCircles(svg)).toBe(4 + 9 + 11);
  });

  it('a deliberately-wrong fixture fails the fidelity assertion', async () => {
    mockTemplateOk(buildBattleArmorTemplate(6));
    const svg = await renderBattleArmorTemplated(
      battleArmorFixture([4, 4, 4, 4]),
      PaperSize.LETTER,
    );
    // The fixture truly renders 4 * 5 = 20 pips; asserting 30 must fail.
    expect(countCircles(svg)).not.toBe(30);
    expect(countCircles(svg)).toBe(4 * 5);
  });
});

describe('skeleton fallback on asset failure', () => {
  it('infantry degrades to the skeleton renderer on a hard asset failure', async () => {
    mockTemplateFail();
    const svg = await renderInfantryTemplated(
      infantryFixture(28),
      PaperSize.LETTER,
    );
    // The skeleton renderer always produces a non-empty SVG and never
    // carries the canonical-template marker.
    expect(svg).toContain('<svg');
    expect(svg).not.toContain(CANONICAL_TEMPLATE_MARKER);
  });

  it('battle armor degrades to the skeleton renderer on a hard asset failure', async () => {
    mockTemplateFail();
    const svg = await renderBattleArmorTemplated(
      battleArmorFixture([5, 5, 5, 5, 5]),
      PaperSize.LETTER,
    );
    expect(svg).toContain('<svg');
    expect(svg).not.toContain(CANONICAL_TEMPLATE_MARKER);
  });
});

describe('renderTemplated dispatch (Wave-2 unit types)', () => {
  it('routes an infantry payload through the infantry templated path', async () => {
    mockTemplateOk(buildInfantryTemplate(30));
    const svg = await renderTemplated(infantryFixture(7), PaperSize.LETTER);
    expect(svg).toContain(CANONICAL_TEMPLATE_MARKER);
    expect(countCircles(svg)).toBe(7);
  });

  it('routes a battle-armor payload through the BA templated path', async () => {
    mockTemplateOk(buildBattleArmorTemplate(6));
    const svg = await renderTemplated(
      battleArmorFixture([6, 6, 6, 6]),
      PaperSize.LETTER,
    );
    expect(svg).toContain(CANONICAL_TEMPLATE_MARKER);
    expect(countCircles(svg)).toBe(4 * 7);
  });
});

describe('silent-fallback guard', () => {
  it('isTemplatedUnit returns true for both Wave-2 families', () => {
    // The inverse of the Wave-1 exclusion behaviour.
    expect(isTemplatedUnit(infantryFixture())).toBe(true);
    expect(isTemplatedUnit(battleArmorFixture([5, 5, 5, 5]))).toBe(true);
  });

  it('templated infantry SVG carries the canonical-template marker', async () => {
    mockTemplateOk(buildInfantryTemplate(30));
    const templated = await renderInfantryTemplated(
      infantryFixture(28),
      PaperSize.LETTER,
    );
    // Marker present on the template path...
    expect(templated).toContain(CANONICAL_TEMPLATE_MARKER);
    // ...and ABSENT from the skeleton renderer's output — so a silent
    // fallback would be caught.
    const skeleton = renderInfantrySVG(infantryFixture(28));
    expect(skeleton).not.toContain(CANONICAL_TEMPLATE_MARKER);
  });

  it('templated battle-armor SVG carries the canonical-template marker', async () => {
    mockTemplateOk(buildBattleArmorTemplate(6));
    const templated = await renderBattleArmorTemplated(
      battleArmorFixture([5, 5, 5, 5, 5]),
      PaperSize.LETTER,
    );
    expect(templated).toContain(CANONICAL_TEMPLATE_MARKER);
    const skeleton = renderBattleArmorSVG(battleArmorFixture([5, 5, 5, 5, 5]));
    expect(skeleton).not.toContain(CANONICAL_TEMPLATE_MARKER);
  });
});
