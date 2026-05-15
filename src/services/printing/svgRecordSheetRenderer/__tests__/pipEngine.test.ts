/**
 * Shared Dynamic Pip Engine — unit tests.
 *
 * Covers region-geometry pip layout, the `grouped`-layout
 * element-lookup fallback, and the alternate-clustering flag.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Shared Dynamic Pip Engine)
 */

import { layoutPips, layoutPipsInGroup, resolvePipGroup } from '../pipEngine';

/**
 * Build a parsed SVG document from markup.
 * The pip engine reads `<rect>` geometry from x/y/width/height
 * attributes, so a parsed (un-mounted) document is sufficient here.
 */
function parseSvg(markup: string): Document {
  return new DOMParser().parseFromString(markup, 'image/svg+xml');
}

/** Count the pip `<circle>` elements rendered inside a group. */
function countPips(doc: Document, groupId: string): number {
  const group = doc.getElementById(groupId);
  return group ? group.querySelectorAll('circle').length : 0;
}

describe('pip engine', () => {
  describe('resolvePipGroup', () => {
    it('resolves a group by its primary ID', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><g id="armorPipsFR"/></svg>',
      );
      const group = resolvePipGroup(doc, 'armorPipsFR');
      expect(group?.getAttribute('id')).toBe('armorPipsFR');
    });

    it('falls back to the <id>grouped element when the primary is absent', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><g id="armorPipsLSgrouped"/></svg>',
      );
      const group = resolvePipGroup(doc, 'armorPipsLS');
      expect(group?.getAttribute('id')).toBe('armorPipsLSgrouped');
    });

    it('returns null when neither the primary nor grouped element exists', () => {
      const doc = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"/>');
      expect(resolvePipGroup(doc, 'armorPipsRR')).toBeNull();
    });
  });

  describe('layoutPips — region geometry', () => {
    it('emits exactly `count` pip elements within a region rect', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsFR"><rect x="0" y="0" width="60" height="40"/></g>' +
          '</svg>',
      );

      const ran = layoutPips(doc, 'armorPipsFR', 12);

      expect(ran).toBe(true);
      expect(countPips(doc, 'armorPipsFR')).toBe(12);
    });

    it('is a no-op for a zero or negative count', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsFR"><rect x="0" y="0" width="60" height="40"/></g>' +
          '</svg>',
      );

      expect(layoutPips(doc, 'armorPipsFR', 0)).toBe(false);
      expect(layoutPips(doc, 'armorPipsFR', -5)).toBe(false);
      expect(countPips(doc, 'armorPipsFR')).toBe(0);
    });

    it('returns false for an unresolvable group ID', () => {
      const doc = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"/>');
      expect(layoutPips(doc, 'armorPipsRR', 8)).toBe(false);
    });
  });

  describe('layoutPips — grouped-layout fallback', () => {
    it('lays out pips against the grouped element when the primary is absent', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsLSgrouped"><rect x="0" y="0" width="60" height="40"/></g>' +
          '</svg>',
      );

      const ran = layoutPips(doc, 'armorPipsLS', 9);

      expect(ran).toBe(true);
      expect(countPips(doc, 'armorPipsLSgrouped')).toBe(9);
    });
  });

  describe('layoutPips — alternate-clustering flag', () => {
    it('renders the requested pip count under standard layout', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsFR"><rect x="0" y="0" width="80" height="60"/></g>' +
          '</svg>',
      );
      expect(layoutPips(doc, 'armorPipsFR', 20, { clustered: false })).toBe(
        true,
      );
      expect(countPips(doc, 'armorPipsFR')).toBe(20);
    });

    it('renders the requested pip count under clustered layout', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsFR"><rect x="0" y="0" width="80" height="60"/></g>' +
          '</svg>',
      );
      expect(layoutPips(doc, 'armorPipsFR', 20, { clustered: true })).toBe(
        true,
      );
      expect(countPips(doc, 'armorPipsFR')).toBe(20);
    });

    it('clustered layout positions pips differently from standard layout', () => {
      // A wide, short single-row region: the grouped-by-five algorithm
      // packs pips into clusters of five with inter-group spacing,
      // which shifts coordinates relative to the even standard fill.
      const make = () =>
        parseSvg(
          '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<g id="armorPipsFR"><rect x="0" y="0" width="200" height="10"/></g>' +
            '</svg>',
        );

      const standardDoc = make();
      const clusteredDoc = make();
      layoutPips(standardDoc, 'armorPipsFR', 15, { clustered: false });
      layoutPips(clusteredDoc, 'armorPipsFR', 15, { clustered: true });

      const positions = (doc: Document) =>
        Array.from(
          doc.getElementById('armorPipsFR')?.querySelectorAll('circle') ?? [],
        )
          .map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
          .join('|');

      // Both render 15 pips, but the clustering algorithm places them
      // at different coordinates than the even standard fill.
      expect(countPips(standardDoc, 'armorPipsFR')).toBe(15);
      expect(countPips(clusteredDoc, 'armorPipsFR')).toBe(15);
      expect(positions(standardDoc)).not.toBe(positions(clusteredDoc));
    });
  });

  describe('layoutPipsInGroup', () => {
    it('lays out pips against an already-resolved group element', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsT"><rect x="0" y="0" width="50" height="30"/></g>' +
          '</svg>',
      );
      const group = doc.getElementById('armorPipsT')!;

      layoutPipsInGroup(doc, group, 6);

      expect(countPips(doc, 'armorPipsT')).toBe(6);
    });

    it('is a no-op for a zero count', () => {
      const doc = parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<g id="armorPipsT"><rect x="0" y="0" width="50" height="30"/></g>' +
          '</svg>',
      );
      const group = doc.getElementById('armorPipsT')!;
      layoutPipsInGroup(doc, group, 0);
      expect(countPips(doc, 'armorPipsT')).toBe(0);
    });
  });
});
