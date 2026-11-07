/** @spec openspec/changes/establish-all-unit-data-parity/specs/record-sheet-export/spec.md */
import type {
  IMechRecordSheetData,
  IRecordSheetMechCrew,
} from '@/types/printing';

import { resetMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { buildSPASection } from '@/services/printing/recordsheet/spaSection';
import { SVGRecordSheetRenderer } from '@/services/printing/svgRecordSheetRenderer';
import { getMechCrewRoles } from '@/types/pilot';
import { PaperSize } from '@/types/printing';

const papers = [
  {
    paper: PaperSize.LETTER,
    width: 576,
    height: 756,
    spaWidth: 142.60001,
    transform: 'translate(234.366,87.857)',
  },
  {
    paper: PaperSize.A4,
    width: 559,
    height: 806,
    spaWidth: 138.067,
    transform: 'translate (226.600,86.359)',
  },
];
const cases = papers.flatMap((paper) =>
  (['TRIPOD', 'SUPERHEAVY_TRIPOD', 'QUADVEE'] as const).map((crewType) => ({
    ...paper,
    crewType,
    configuration:
      crewType === 'QUADVEE' ? ('quadvee' as const) : ('tripod' as const),
    nativeSlots: crewType === 'QUADVEE' ? 2 : 3,
  })),
);
const abilities = buildSPASection([
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
  mechType: 'tripod',
  header: {
    unitName: 'Tripod crew fixture',
    chassis: 'Tripod',
    model: 'Crew',
    tonnage: 100,
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    era: '3150',
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
  specialAbilities: abilities,
};
function roster(
  crewType: IRecordSheetMechCrew['crewType'],
): IRecordSheetMechCrew {
  return {
    crewType,
    slots: getMechCrewRoles(crewType).map((role, slotIndex) => ({
      slotIndex,
      role,
      pilot: {
        name: 'Same Name',
        gunnery: slotIndex * 2 + 1,
        piloting: slotIndex * 2 + 2,
        wounds: 0,
      },
    })),
  };
}
function expectCrew(doc: Document, crew: IRecordSheetMechCrew): void {
  for (const slot of crew.slots) {
    expect(doc.getElementById(`crewName${slot.slotIndex}`)?.textContent).toBe(
      `${slot.role}:`,
    );
    expect(doc.getElementById(`pilotName${slot.slotIndex}`)?.textContent).toBe(
      slot.pilot?.name ?? '',
    );
    expect(
      doc.getElementById(`gunnerySkill${slot.slotIndex}`)?.textContent,
    ).toBe(slot.pilot ? String(slot.pilot.gunnery) : '');
    expect(
      doc.getElementById(`pilotingSkill${slot.slotIndex}`)?.textContent,
    ).toBe(slot.pilot ? String(slot.pilot.piloting) : '');
  }
}

describe('explicit native Mech crew canonical rendering', () => {
  const originalBBox = Object.getOwnPropertyDescriptor(
    SVGElement.prototype,
    'getBBox',
  );
  const originalLength = Object.getOwnPropertyDescriptor(
    SVGElement.prototype,
    'getComputedTextLength',
  );
  beforeEach(() => {
    resetMmDataAssetService();
    // Controlled DOM metrics only; actual template/browser/PDF metrics are proved separately.
    Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
      configurable: true,
      value(this: SVGElement) {
        return (this.textContent?.length ?? 0) * 4;
      },
    });
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value(this: SVGElement) {
        return {
          x: 25.228,
          y: Number(
            this.getAttribute('y') ??
              this.getAttribute('d')?.match(/,([\d.]+)/)?.[1] ??
              13,
          ),
          width: (this.textContent?.length ?? 0) * 4 || 114.372,
          height: 7,
        };
      },
    });
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
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalBBox)
      Object.defineProperty(SVGElement.prototype, 'getBBox', originalBBox);
    else Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
    if (originalLength)
      Object.defineProperty(
        SVGElement.prototype,
        'getComputedTextLength',
        originalLength,
      );
    else Reflect.deleteProperty(SVGElement.prototype, 'getComputedTextLength');
  });
  async function render(
    paper: (typeof cases)[number],
    crew = roster(paper.crewType),
    entries = abilities,
  ): Promise<Document> {
    const fields = Array.from({ length: paper.nativeSlots }, (_, i) => {
      const hidden = i === 2 ? ' visibility="hidden"' : '';
      return `<g id="crewDamage${i}"${hidden}/><text id="crewName${i}" x="3" y="${12 + 52 * i}"${hidden}>Name:</text><text id="pilotName${i}" x="25.228" y="${12 + 52 * i}"${hidden}>Lorem Ipsum</text><path id="blankCrewName${i}" d="M 25.228,${13 + 52 * i} H 139.6"${hidden}/><text id="gunnerySkill${i}"${hidden}>0</text><path id="blankGunnerySkill${i}"${hidden}/><text id="gunnerySkillText${i}"${hidden}>Gunnery:</text><text id="pilotingSkill${i}"${hidden}>0</text><path id="blankPilotingSkill${i}"${hidden}/><text id="pilotingSkillText${i}"${hidden}>Piloting:</text><rect id="spas${i}" x="0" y="${52 + 52 * i}" width="${paper.spaWidth}" height="13.5"/>`;
    }).join('');
    const template = `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}" height="${paper.height}"><text id="type"/><text id="bv"/><g id="warriorDataSingle"/><g id="warriorDataDual"/>${paper.nativeSlots === 3 ? '<g id="warriorDataTriple" visibility="hidden"/>' : ''}<g id="pilot-panel" transform="${paper.transform}">${fields}</g></svg>`;
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => template,
      headers: new Headers({ 'content-type': 'image/svg+xml' }),
    } as Response);
    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate(
      `/record-sheets/native-${paper.configuration}.svg`,
      paper.paper,
    );
    renderer.fillTemplate({
      ...data,
      mechType: paper.configuration,
      crew,
      specialAbilities: entries,
    });
    return new DOMParser().parseFromString(
      renderer.getSVGString(),
      'image/svg+xml',
    );
  }

  it.each(cases)(
    'fills native identities/unequal skills/visibility/offsets on $crewType/$paper',
    async (paper) => {
      const crew = roster(paper.crewType),
        doc = await render(paper, crew);
      expectCrew(doc, crew);
      expect(doc.getElementById('bv')?.textContent).toBe('1,897');
      for (let i = 0; i < paper.nativeSlots; i++) {
        const active = i < crew.slots.length;
        expect(
          doc.getElementById(`crewDamage${i}`)?.getAttribute('visibility'),
        ).toBe(active ? 'visible' : 'hidden');
        if (active) {
          expect(
            doc.getElementById(`blankCrewName${i}`)?.getAttribute('visibility'),
          ).toBe('hidden');
          expect(
            doc.getElementById(`pilotName${i}`)?.getAttribute('visibility'),
          ).toBe('visible');
          expect(
            Number(doc.getElementById(`pilotName${i}`)?.getAttribute('x')),
          ).toBeCloseTo([29.228, 33.228, 57.228][i]);
        }
      }
      expect(
        doc
          .getElementById(
            crew.slots.length === 2 ? 'warriorDataDual' : 'warriorDataTriple',
          )
          ?.getAttribute('visibility'),
      ).toBe('visible');
      expect(
        doc.getElementById('warriorDataSingle')?.getAttribute('visibility'),
      ).toBe('hidden');
      if (paper.crewType === 'QUADVEE') {
        expect(doc.getElementById('crewName2')).toBeNull();
        expect(doc.getElementById('warriorDataTriple')).toBeNull();
      }
    },
  );
  it.each(cases)(
    'leaves an unassigned seat blank on $crewType/$paper',
    async (paper) => {
      const full = roster(paper.crewType);
      const crew = {
        ...full,
        slots: full.slots.map((slot) =>
          slot.slotIndex === 1
            ? { slotIndex: slot.slotIndex, role: slot.role }
            : slot,
        ),
      };
      const doc = await render(paper, crew);
      expectCrew(doc, crew);
      expect(
        doc.getElementById('blankCrewName1')?.getAttribute('visibility'),
      ).toBe('visible');
      expect(
        doc.getElementById('blankGunnerySkill1')?.getAttribute('visibility'),
      ).toBe('visible');
      expect(
        doc.getElementById('blankPilotingSkill1')?.getAttribute('visibility'),
      ).toBe('visible');
      expect(doc.getElementById('blankCrewName1')?.getAttribute('d')).toBe(
        'M 33.228,65 139.6,65',
      );
    },
  );
  it.each(cases)(
    'retains repeated global SPA overdraw and overflow on $crewType/$paper',
    async (paper) => {
      const crew = roster(paper.crewType);
      const entries = Array.from({ length: 8 }, (_, i) => ({
        ...abilities[0],
        headline: `Weapon Specialist (PPC ${i} long designated weapon)`,
      }));
      const doc = await render(paper, crew, entries);
      const blocks = Array.from(doc.querySelectorAll('g.abilities'));
      expect(blocks).toHaveLength(crew.slots.length);
      for (const block of blocks) {
        expect(block.parentNode).toBe(
          doc.getElementById(`spas${crew.slots.length - 1}`)?.parentNode,
        );
        expect(block.textContent).toBe(
          `Abilities: ${entries.map((e) => e.headline).join(', ')}`,
        );
        const lines = block.querySelectorAll('text');
        expect(Number(lines[0].getAttribute('y'))).toBeCloseTo(
          crew.slots.length * 52 + 6.75,
        );
        expect(
          Number(lines[lines.length - 1].getAttribute('y')),
        ).toBeGreaterThan(crew.slots.length * 52 + 13.5);
      }
      expect(new Set(blocks.map((b) => b.id)).size).toBe(blocks.length);
      expect(doc.querySelector('clipPath')).toBeNull();
    },
  );
  it.each(cases)(
    'rejects missing/swapped rendered-slot mutants on $crewType/$paper',
    async (paper) => {
      const crew = roster(paper.crewType),
        doc = await render(paper, crew);
      expectCrew(doc, crew);
      const missing = doc.cloneNode(true) as Document;
      missing.getElementById('gunnerySkill1')?.remove();
      expect(() => expectCrew(missing, crew)).toThrow();
      const swapped = doc.cloneNode(true) as Document;
      swapped.getElementById('gunnerySkill0')!.textContent = '3';
      swapped.getElementById('gunnerySkill1')!.textContent = '1';
      expect(() => expectCrew(swapped, crew)).toThrow();
    },
  );
});
