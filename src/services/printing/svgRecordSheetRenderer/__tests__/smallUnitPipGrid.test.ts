/**
 * Wave-2 small-unit pip-grid helpers — unit tests.
 *
 * Covers the Battle Armor per-trooper pip grid and the infantry platoon
 * pip grid added to the shared pip engine, and asserts the existing
 * per-location layout is unchanged by the additions.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Battle Armor Per-Trooper Pip Grid)
 */

import {
  layoutBattleArmorPipGrid,
  layoutInfantryPlatoonPipGrid,
  layoutPips,
} from '../pipEngine';

/** Build a parsed SVG document from markup. */
function parseSvg(markup: string): Document {
  return new DOMParser().parseFromString(markup, 'image/svg+xml');
}

/** Count pip `<circle>` elements inside a group / slot's parent. */
function countCircles(doc: Document, containerId: string): number {
  const el = doc.getElementById(containerId);
  return el ? el.querySelectorAll('circle').length : 0;
}

/**
 * Build a synthetic Battle Armor squad template with N trooper-column
 * `pips_<i>` `<rect>` regions.
 */
function baTemplate(columns: number): Document {
  const rects: string[] = [];
  for (let i = 0; i < columns; i++) {
    rects.push(
      `<g id="col_${i}"><rect id="pips_${i}" x="${i * 40}" y="0" width="38" height="12"/></g>`,
    );
  }
  return parseSvg(
    `<svg xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`,
  );
}

/**
 * Build a synthetic infantry platoon template with N `soldier_<j>`
 * slot `<image>` elements (1-based).
 */
function infantryTemplate(slots: number): Document {
  const imgs: string[] = [];
  for (let j = 1; j <= slots; j++) {
    imgs.push(
      `<image id="soldier_${j}" x="${j * 14}" y="9" width="13" height="29"/>`,
    );
  }
  return parseSvg(
    `<svg xmlns="http://www.w3.org/2000/svg"><g id="platoon">${imgs.join('')}</g></svg>`,
  );
}

describe('layoutBattleArmorPipGrid', () => {
  it('emits one pip cluster per trooper column (armorPips + 1)', () => {
    const doc = baTemplate(5);
    const result = layoutBattleArmorPipGrid(doc, [
      { column: 0, armorPips: 5 },
      { column: 1, armorPips: 5 },
      { column: 2, armorPips: 5 },
      { column: 3, armorPips: 5 },
      { column: 4, armorPips: 5 },
    ]);
    // MegaMek `+1` trooper pip — each column renders armorPips + 1.
    for (let i = 0; i < 5; i++) {
      expect(result.renderedByColumn.get(i)).toBe(6);
      expect(countCircles(doc, `col_${i}`)).toBe(6);
    }
  });

  it('respects per-trooper armor counts (varied suits)', () => {
    const doc = baTemplate(6);
    const result = layoutBattleArmorPipGrid(doc, [
      { column: 0, armorPips: 3 },
      { column: 1, armorPips: 8 },
      { column: 2, armorPips: 10 },
    ]);
    expect(result.renderedByColumn.get(0)).toBe(4);
    expect(result.renderedByColumn.get(1)).toBe(9);
    expect(result.renderedByColumn.get(2)).toBe(11);
    expect(countCircles(doc, 'col_0')).toBe(4);
    expect(countCircles(doc, 'col_1')).toBe(9);
    expect(countCircles(doc, 'col_2')).toBe(11);
  });

  it('leaves unused trooper columns empty (4-trooper squad, 6 columns)', () => {
    const doc = baTemplate(6);
    layoutBattleArmorPipGrid(doc, [
      { column: 0, armorPips: 4 },
      { column: 1, armorPips: 4 },
      { column: 2, armorPips: 4 },
      { column: 3, armorPips: 4 },
    ]);
    // Columns 4 and 5 have no trooper — must render zero pips.
    expect(countCircles(doc, 'col_4')).toBe(0);
    expect(countCircles(doc, 'col_5')).toBe(0);
  });

  it('skips a trooper whose pips_N region is absent from the template', () => {
    const doc = baTemplate(3);
    const result = layoutBattleArmorPipGrid(doc, [
      { column: 0, armorPips: 5 },
      { column: 9, armorPips: 5 },
    ]);
    expect(result.renderedByColumn.has(0)).toBe(true);
    expect(result.renderedByColumn.has(9)).toBe(false);
  });
});

describe('layoutInfantryPlatoonPipGrid', () => {
  it('emits one platoon pip per occupied soldier slot', () => {
    const doc = infantryTemplate(30);
    const result = layoutInfantryPlatoonPipGrid(doc, 28);
    expect(result.renderedCount).toBe(28);
    expect(doc.querySelectorAll('circle.platoon-trooper').length).toBe(28);
  });

  it('renders exactly platoonSize markers (small platoon)', () => {
    const doc = infantryTemplate(30);
    const result = layoutInfantryPlatoonPipGrid(doc, 7);
    expect(result.renderedCount).toBe(7);
    expect(doc.querySelectorAll('circle').length).toBe(7);
  });

  it('clamps platoonSize to the 30-slot template capacity', () => {
    const doc = infantryTemplate(30);
    const result = layoutInfantryPlatoonPipGrid(doc, 45);
    expect(result.renderedCount).toBe(30);
  });

  it('is a no-op for a zero / negative platoon size', () => {
    const doc = infantryTemplate(30);
    expect(layoutInfantryPlatoonPipGrid(doc, 0).renderedCount).toBe(0);
    expect(layoutInfantryPlatoonPipGrid(doc, -3).renderedCount).toBe(0);
    expect(doc.querySelectorAll('circle').length).toBe(0);
  });
});

describe('per-location pip layout is unchanged by the Wave-2 additions', () => {
  it('layoutPips still lays out pips in a single region group', () => {
    // The Wave-1 per-location path: a single `<rect>` region group.
    const doc = parseSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><g id="armorPipsFR"><rect x="0" y="0" width="100" height="50"/></g></svg>',
    );
    const ran = layoutPips(doc, 'armorPipsFR', 12);
    expect(ran).toBe(true);
    expect(countCircles(doc, 'armorPipsFR')).toBe(12);
  });
});
