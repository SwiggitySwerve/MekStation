import fs from 'fs';
import path from 'path';

import { getMmDataAssetService } from '@/services/assets/MmDataAssetService';
import {
  extractCapitalData,
  selectCapitalTemplate,
} from '@/services/printing/recordsheet/dataExtractors.capital';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import {
  createMockCanvas,
  installSvgImageMock,
  restoreSvgImageMock,
} from '@/services/printing/svgRecordSheetRenderer/__tests__/canvas.test-helpers';
import {
  bindCapital,
  capitalInventory,
  renderCapitalSheetPages,
} from '@/services/printing/svgRecordSheetRenderer/capitalRenderer';
import { UnitContract } from '@/types/contracts';
import { PaperSize } from '@/types/printing';

import { initializeEquipment } from './catalogRecordSheets.helpers';

const mockAddImage = jest.fn(),
  mockAddPage = jest.fn(),
  mockSave = jest.fn();
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: mockAddImage,
    addPage: mockAddPage,
    save: mockSave,
  })),
}));
beforeAll(initializeEquipment);
const root = 'public/data/units/capital';
const index: { id: string; path: string }[] = JSON.parse(
  fs.readFileSync(`${root}/index.json`, 'utf8'),
).units;
const load = (id: string) =>
  extractCapitalData(
    UnitContract.parse(
      JSON.parse(
        fs.readFileSync(
          path.join(root, index.find((e) => e.id === id)!.path),
          'utf8',
        ),
      ),
    ),
  );
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, 'image/svg+xml');

test('all capital bindings retain scope and every source inventory row', () => {
  const templates = new Map<string, Document>();
  for (const entry of index) {
    const data = load(entry.id),
      bindings = bindCapital(data);
    expect(bindings.texts.bv).toContain(
      data.bv.scope === 'complete'
        ? '(complete)'
        : data.bv.scope === 'defensive-only'
          ? '(defensive only)'
          : 'unavailable',
    );
    for (const a of data.armor) {
      expect(bindings.texts[`textArmor_${a.code}`]).toBe(`(${a.points})`);
      expect(
        bindings.pips.find((p) => p.groupId === `armorPips${a.code}`)?.count,
      ).toBe(a.points);
    }
    if (process.env.RECORD_SHEET_PINNED_ASSETS)
      for (const paper of ['templates_us', 'templates_iso']) {
        const key = `${paper}/${selectCapitalTemplate(data)}.svg`;
        let doc = templates.get(key);
        if (!doc) {
          doc = parse(
            fs.readFileSync(
              path.join(process.env.RECORD_SHEET_PINNED_ASSETS, key),
              'utf8',
            ),
          );
          templates.set(key, doc);
        }
        for (const a of data.armor) {
          expect(doc.getElementById(`textArmor_${a.code}`)).not.toBeNull();
          expect(doc.getElementById(`armorPips${a.code}`)).not.toBeNull();
        }
      }
    const raw = UnitContract.parse(
      JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8')),
    );
    expect(bindings.texts.textDockingCollars).toBe(
      String(
        raw.transporters?.filter(
          (entry: string) =>
            entry.split(':')[0].toLowerCase() === 'dockingcollar',
        ).length ?? 0,
      ),
    );
    const lines = capitalInventory(data);
    expect(lines.map((l) => l.text).join(' ')).toContain(
      `Thrust: ${data.safeThrust ?? 'unavailable'}/${data.maxThrust ?? 'unavailable'}`,
    );
    expect(lines.map((l) => l.text).join(' ')).toContain(
      `Fuel points: ${data.fuel ?? 'unavailable'}`,
    );
    for (const bay of data.weaponBays)
      for (const item of bay.items)
        expect(
          lines
            .filter((l) => l.sourceIndex === item.sourceIndex)
            .map((l) => l.text)
            .join(' '),
        ).toBe(item.name);
  }
});

const pinned = process.env.RECORD_SHEET_PINNED_ASSETS;
(pinned ? describe : describe.skip)(
  'original pinned mm-data capital pages',
  () => {
    beforeEach(() =>
      jest
        .spyOn(getMmDataAssetService(), 'loadSVG')
        .mockImplementation(async (url) =>
          fs.readFileSync(
            path.join(pinned!, url.replace('/record-sheets/', '')),
            'utf8',
          ),
        ),
    );
    afterEach(() => jest.restoreAllMocks());
    test.each([
      'achilles-2582',
      'union-2708',
      'comitatus-jumpship-2995',
      'aegis-heavy-cruiser-2372',
      'crucible-station',
    ])(
      '%s renders real templates in both paper sizes with no lost rows',
      async (id) => {
        const data = load(id);
        for (const paper of [PaperSize.LETTER, PaperSize.A4]) {
          const pages = await renderCapitalSheetPages(data, paper);
          expect(pages.length).toBeGreaterThan(0);
          const docs = pages.map(parse);
          const dir = paper === PaperSize.A4 ? 'templates_iso' : 'templates_us';
          expect(getMmDataAssetService().loadSVG).toHaveBeenCalledWith(
            `/record-sheets/${dir}/${selectCapitalTemplate(data)}.svg`,
          );
          if (pages.length > 1)
            expect(getMmDataAssetService().loadSVG).toHaveBeenCalledWith(
              `/record-sheets/${dir}/advaero_reverse.svg`,
            );
          expect(
            docs[0].documentElement.getAttribute('data-template-source'),
          ).toBe('mm-data-canonical');
          for (const doc of docs)
            expect(doc.querySelector('parsererror')).toBeNull();
          expect(docs[0].getElementById('bv')?.textContent).toBe(
            bindCapital(data).texts.bv,
          );
          for (const [id, value] of Object.entries(bindCapital(data).texts)) {
            const element = docs[0].getElementById(id);
            if (element) expect(element.textContent).toBe(value);
          }
          for (const a of data.armor) {
            expect(
              docs[0].getElementById(`textArmor_${a.code}`)?.textContent,
            ).toBe(`(${a.points})`);
            expect(
              docs[0].querySelectorAll(`#armorPips${a.code} .capital-armor-pip`)
                .length,
            ).toBe(a.points);
          }
          for (const item of data.weaponBays.flatMap((b) => b.items))
            expect(
              docs
                .flatMap((doc) =>
                  Array.from(
                    doc.querySelectorAll(
                      `[data-source-index="${item.sourceIndex}"]`,
                    ),
                  ),
                )
                .map((e) => e.textContent)
                .join(' '),
            ).toBe(item.name);
          if (pages.length > 1)
            expect(
              docs[1].documentElement.getAttribute('data-capital-template'),
            ).toBe('advaero_reverse');
          expect(pages.join('')).not.toContain('Lorem Ipsum');
        }
      },
    );
    test('long inventories paginate instead of shrinking or truncating', async () => {
      const data = load('crucible-station');
      const many = {
        ...data,
        weaponBays: [
          {
            arc: 'Nose',
            number: 1,
            items: Array.from({ length: 500 }, (_, i) => ({
              name: `Source weapon ${i}`,
              sourceIndex: i,
            })),
          },
        ],
      };
      const pages = await new RecordSheetService().getSVGPages(
        many,
        PaperSize.A4,
      );
      expect(pages.length).toBeGreaterThan(5);
      expect(pages.join('')).toContain('Source weapon 499');
    });
    test('asset failures surface an error and leave no mounted template', async () => {
      jest
        .spyOn(getMmDataAssetService(), 'loadSVG')
        .mockRejectedValue(new Error('Capital template unavailable'));
      await expect(
        renderCapitalSheetPages(load('crucible-station')),
      ).rejects.toThrow(/capital.*template/i);
      expect(document.querySelector('[data-capital-template]')).toBeNull();
    });
  },
);

describe('capital page export integration', () => {
  const createElement = document.createElement.bind(document);
  beforeEach(() => {
    jest.clearAllMocks();
    installSvgImageMock();
  });
  afterEach(() => {
    restoreSvgImageMock();
    jest.restoreAllMocks();
    document.createElement = createElement;
  });
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792" width="612" height="792"/>';
  it('exports every capital page into one PDF', async () => {
    const service = new RecordSheetService(),
      data = load('crucible-station'),
      canvas = createMockCanvas();
    document.createElement = jest.fn((tag: string) =>
      tag === 'canvas'
        ? (canvas as unknown as HTMLCanvasElement)
        : createElement(tag),
    ) as unknown as typeof document.createElement;
    jest.spyOn(service, 'getSVGPages').mockResolvedValue([svg, svg]);
    await service.exportPDF(data, {
      paperSize: PaperSize.LETTER,
      includePilotData: false,
    });
    expect(mockAddImage).toHaveBeenCalledTimes(2);
    expect(mockAddPage).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
  it('prints every capital page with page breaks in one owned popup', async () => {
    const service = new RecordSheetService(),
      data = load('crucible-station');
    const popup = {
      document: {
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
        fonts: { ready: Promise.resolve() },
        images: [] as HTMLImageElement[],
      },
      print: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
    };
    jest
      .spyOn(window, 'open')
      .mockImplementation((() => popup) as unknown as typeof window.open);
    jest.spyOn(service, 'getSVGPages').mockResolvedValue([svg, svg]);
    await service.printRecordSheet(data, PaperSize.LETTER);
    const doc = new DOMParser().parseFromString(
      String(popup.document.write.mock.calls[0]?.[0]),
      'text/html',
    );
    expect(doc.querySelectorAll('body > svg')).toHaveLength(2);
    expect(doc.querySelector('style')?.textContent).toContain(
      'break-after: page',
    );
    expect(popup.print).toHaveBeenCalledTimes(1);
  });
});
