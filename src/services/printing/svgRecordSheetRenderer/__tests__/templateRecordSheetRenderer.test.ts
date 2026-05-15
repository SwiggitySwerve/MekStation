/**
 * Shared Template Record Sheet Renderer — unit tests.
 *
 * Covers `loadTemplate`, `applyBindings`, the off-screen mount/unmount
 * lifecycle, font-readiness gating, `applyPips`, and `getSVGString`.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Shared Template Record Sheet Renderer)
 */

import {
  TemplateRecordSheetRenderer,
  type PipFill,
} from '../templateRecordSheetRenderer';

const mockFetch = jest.fn();
global.fetch = mockFetch;

/** A minimal canonical-shaped template with header text + a pip group. */
const TEMPLATE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="type"></text>
  <text id="tonnage"></text>
  <text id="bv"></text>
  <g id="armorPipsFR"><rect x="0" y="0" width="50" height="20"/></g>
</svg>`;

function mockTemplateResponse(svg: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(svg),
    headers: new Headers({ 'content-type': 'image/svg+xml' }),
  });
}

describe('TemplateRecordSheetRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    document.body.innerHTML = '';
  });

  describe('loadTemplate', () => {
    it('fetches and parses a canonical template into a DOM document', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();

      await renderer.loadTemplate('/record-sheets/templates_us/x.svg');

      expect(mockFetch).toHaveBeenCalledWith(
        '/record-sheets/templates_us/x.svg',
      );
      expect(renderer.document.getElementById('type')).not.toBeNull();
      expect(renderer.root.tagName.toLowerCase()).toBe('svg');
    });

    it('throws when accessing document before a template is loaded', () => {
      const renderer = new TemplateRecordSheetRenderer();
      expect(() => renderer.document).toThrow('Template not loaded');
      expect(() => renderer.root).toThrow('Template not loaded');
    });

    it('throws when the template fetch fails', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      const renderer = new TemplateRecordSheetRenderer();
      await expect(
        renderer.loadTemplate('/record-sheets/templates_us/missing.svg'),
      ).rejects.toThrow();
    });
  });

  describe('applyBindings', () => {
    it('injects text by element ID', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      renderer.applyBindings({ type: 'Manticore', tonnage: '50', bv: '1247' });

      expect(renderer.document.getElementById('type')?.textContent).toBe(
        'Manticore',
      );
      expect(renderer.document.getElementById('tonnage')?.textContent).toBe(
        '50',
      );
      expect(renderer.document.getElementById('bv')?.textContent).toBe('1247');
    });

    it('leaves elements absent from the binding map unchanged', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      renderer.applyBindings({ type: 'OnlyType' });

      expect(renderer.document.getElementById('tonnage')?.textContent).toBe('');
    });

    it('silently skips bindings for IDs not present in the template', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      expect(() =>
        renderer.applyBindings({ nonExistentId: 'value' }),
      ).not.toThrow();
    });
  });

  describe('off-screen mount lifecycle', () => {
    it('attaches the SVG to the document on mount and detaches on unmount', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      expect(renderer.isMounted).toBe(false);

      renderer.mount();
      expect(renderer.isMounted).toBe(true);
      // The SVG root is attached to a node inside the live document.
      expect(document.body.contains(renderer.root)).toBe(true);

      renderer.unmount();
      expect(renderer.isMounted).toBe(false);
      expect(document.body.contains(renderer.root)).toBe(false);
    });

    it('mount is idempotent', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      renderer.mount();
      renderer.mount();
      expect(renderer.isMounted).toBe(true);
      // Exactly one off-screen container exists.
      expect(document.body.children.length).toBe(1);
    });

    it('getSVGString unmounts the off-screen container as a side effect', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      renderer.mount();
      const svg = renderer.getSVGString();

      expect(svg).toContain('<svg');
      expect(renderer.isMounted).toBe(false);
      expect(document.body.children.length).toBe(0);
    });
  });

  describe('awaitFontsReady', () => {
    it('resolves without throwing (font-readiness gate)', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');
      await expect(renderer.awaitFontsReady()).resolves.toBeUndefined();
    });
  });

  describe('applyPips', () => {
    it('invokes the applicator for resolvable pip groups', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      const seen: string[] = [];
      const fills: PipFill[] = [{ groupId: 'armorPipsFR', count: 10 }];
      renderer.applyPips(fills, (_doc, group, fill) => {
        seen.push(`${group.getAttribute('id')}:${fill.count}`);
      });

      expect(seen).toEqual(['armorPipsFR:10']);
    });

    it('skips fills with a zero or negative count', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      const applicator = jest.fn();
      renderer.applyPips(
        [
          { groupId: 'armorPipsFR', count: 0 },
          { groupId: 'armorPipsFR', count: -3 },
        ],
        applicator,
      );

      expect(applicator).not.toHaveBeenCalled();
    });

    it('does not invoke the applicator for an unresolvable group ID', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      const applicator = jest.fn();
      renderer.applyPips(
        [{ groupId: 'armorPipsNONEXISTENT', count: 5 }],
        applicator,
      );

      expect(applicator).not.toHaveBeenCalled();
    });
  });

  describe('getSVGString', () => {
    it('serializes the (mutated) template document', async () => {
      mockTemplateResponse(TEMPLATE_SVG);
      const renderer = new TemplateRecordSheetRenderer();
      await renderer.loadTemplate('/x.svg');

      renderer.applyBindings({ type: 'Serialized' });
      const svg = renderer.getSVGString();

      expect(svg).toContain('<svg');
      expect(svg).toContain('Serialized');
    });

    it('throws when no template is loaded', () => {
      const renderer = new TemplateRecordSheetRenderer();
      expect(() => renderer.getSVGString()).toThrow('Template not loaded');
    });
  });
});
