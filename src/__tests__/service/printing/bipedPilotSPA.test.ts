import type { IMechRecordSheetData } from '@/types/printing';

import { resetMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { buildSPASection } from '@/services/printing/recordsheet/spaSection';
import { SVGRecordSheetRenderer } from '@/services/printing/svgRecordSheetRenderer';
import { PaperSize } from '@/types/printing';

// Exact v0.3.1 native region attributes; full-template browser proof is separate.
const papers = [
  {
    paper: PaperSize.LETTER,
    width: 576,
    height: 756,
    regionWidth: 142.60001,
    transform: 'translate(234.366,87.857)',
  },
  {
    paper: PaperSize.A4,
    width: 559,
    height: 806,
    regionWidth: 138.067,
    transform: 'translate (226.600,86.359)',
  },
];
const specialist = buildSPASection([
  {
    abilityId: 'weapon_specialist',
    acquiredDate: '2026-01-01',
    designation: {
      kind: 'weapon_type',
      weaponTypeId: 'ppc',
      displayLabel: 'PPC',
    },
  },
]).entries;
const data: IMechRecordSheetData = {
  unitType: 'mech',
  mechType: 'biped',
  header: {
    unitName: 'Atlas AS7-D',
    chassis: 'Atlas',
    model: 'AS7-D',
    tonnage: 100,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: '3025',
    battleValue: 1897,
    cost: 9626000,
  },
  movement: {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    hasMASC: false,
    hasTSM: false,
    hasSupercharger: false,
  },
  armor: { type: 'Standard', totalPoints: 0, locations: [] },
  structure: { type: 'Standard', totalPoints: 0, locations: [] },
  heatSinks: {
    type: 'Single',
    count: 20,
    capacity: 20,
    integrated: 10,
    external: 10,
  },
  equipment: [],
  criticals: [],
  specialAbilities: specialist,
};

describe('single-pilot biped canonical SPA output', () => {
  beforeEach(() => {
    resetMmDataAssetService();
    // Deterministic font boundary for DOM tests; real Chromium metrics are proved separately.
    const context = {
      font: '',
      measureText(text: string) {
        return {
          width:
            (text.length * parseFloat(this.font.replace('italic ', ''))) / 2,
        };
      },
    };
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  });
  afterEach(() => jest.restoreAllMocks());

  async function render(
    input = data,
    paper = papers[0],
    withRegion = true,
  ): Promise<Document> {
    const template = `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}" height="${paper.height}"><text id="type"/><text id="bv"/><g id="pilot-panel" transform="${paper.transform}">${withRegion ? `<rect id="spas0" x="0" y="52" width="${paper.regionWidth}" height="13.5" fill="none"/>` : ''}</g></svg>`;
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => template,
      headers: new Headers({ 'content-type': 'image/svg+xml' }),
    } as Response);
    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate('/record-sheets/native-biped.svg', paper.paper);
    renderer.fillTemplate(input);
    return new DOMParser().parseFromString(
      renderer.getSVGString(),
      'image/svg+xml',
    );
  }

  it.each(papers)(
    'parents the designated list beside native spas0 on $paper',
    async (paper) => {
      const doc = await render(data, paper);
      const block = doc.getElementById('specialAbilitiesBlock')!;
      expect(block.parentNode).toBe(doc.getElementById('spas0')!.parentNode);
      expect(block.parentElement!.getAttribute('transform')).toBe(
        paper.transform,
      );
      const line = block.querySelector('text')!;
      expect(line.textContent).toBe('Abilities: Weapon Specialist (PPC)');
      expect(line.getAttribute('font-style')).toBe('italic');
      expect(Number(line.getAttribute('font-size'))).toBeCloseTo(6.084, 5);
      expect(Number(line.getAttribute('x'))).toBe(0);
      expect(Number(line.getAttribute('y'))).toBeCloseTo(52 + 6.084 * 1.2, 5);
      const without = await render({ ...data, specialAbilities: [] }, paper);
      block.remove();
      expect(new XMLSerializer().serializeToString(doc)).toBe(
        new XMLSerializer().serializeToString(without),
      );
    },
  );

  it.each(papers)(
    'retains native unbounded long-list overflow on $paper',
    async (paper) => {
      const entries = Array.from({ length: 8 }, (_, i) => ({
        ...specialist[0],
        headline: `Weapon Specialist (PPC ${i})`,
      }));
      const doc = await render({ ...data, specialAbilities: entries }, paper);
      const lines = [...doc.querySelectorAll('#specialAbilitiesBlock text')];
      expect(lines.length).toBeGreaterThan(2);
      expect(lines.map((line) => line.textContent).join('')).toBe(
        `Abilities: ${entries.map((entry) => entry.headline).join(', ')}`,
      );
      for (const [i, line] of lines.entries()) {
        expect(Number(line.getAttribute('font-size'))).toBeCloseTo(
          13.5 / 2.4,
          5,
        );
        expect(Number(line.getAttribute('y'))).toBeCloseTo(
          52 + (13.5 / 2.4) * 1.2 * (i + 1),
          5,
        );
        expect(line.hasAttribute('textLength')).toBe(false);
      }
      expect(Number(lines.at(-1)!.getAttribute('y'))).toBeGreaterThan(
        52 + 13.5,
      );
      expect(doc.querySelector('clipPath')).toBeNull();
    },
  );

  it('preserves an overwide unbroken token without truncation', async () => {
    const token = 'W'.repeat(100);
    const doc = await render({
      ...data,
      specialAbilities: [{ ...specialist[0], headline: token }],
    });
    expect(
      [...doc.querySelectorAll('#specialAbilitiesBlock text')].map(
        (line) => line.textContent,
      ),
    ).toEqual(['Abilities: ', token]);
  });

  it('chooses the font using normal width before wrapping with italic width', async () => {
    const context = {
      font: '',
      measureText() {
        return { width: this.font.startsWith('italic ') ? 10 : 200 };
      },
    };
    jest
      .mocked(HTMLCanvasElement.prototype.getContext)
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const doc = await render();
    const lines = doc.querySelectorAll('#specialAbilitiesBlock text');
    expect(lines).toHaveLength(1);
    expect(Number(lines[0].getAttribute('font-size'))).toBeCloseTo(
      13.5 / 2.4,
      5,
    );
    expect(lines[0].textContent).toBe('Abilities: Weapon Specialist (PPC)');
  });

  it('does not invent a region or fall back to fixed coordinates', async () => {
    expect(
      (await render(data, papers[0], false)).getElementById(
        'specialAbilitiesBlock',
      ),
    ).toBeNull();
    expect(
      (await render({ ...data, specialAbilities: [] })).getElementById(
        'specialAbilitiesBlock',
      ),
    ).toBeNull();
  });

  it('leaves other Mech configurations on their existing renderer', async () => {
    const doc = await render({ ...data, mechType: 'quad' });
    const block = doc.getElementById('specialAbilitiesBlock')!;
    expect(block.parentNode).toBe(doc.documentElement);
    expect(block.querySelector('text')!.textContent).toBe('SPECIAL ABILITIES');
    expect(block.querySelector('text')!.getAttribute('y')).toBe('690');
  });
});
