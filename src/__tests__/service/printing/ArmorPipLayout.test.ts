/**
 * Tests for ArmorPipLayout - MegaMekLab Algorithm Port
 *
 * @spec openspec/changes/integrate-mm-data-assets/specs/record-sheet-export/spec.md
 *
 * These tests verify the correct porting of MegaMekLab's ArmorPipLayout algorithm
 * which dynamically generates armor and structure pips within bounding rectangles.
 */

import { ArmorPipLayout } from '@/services/printing/ArmorPipLayout';

// Create a minimal DOM environment for testing
const createMockSVGDocument = () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
      <g id="testGroup"></g>
    </svg>`,
    'image/svg+xml',
  );
  return doc;
};

const createGroupWithRects = (
  svgDoc: Document,
  rects: Array<{ x: number; y: number; width: number; height: number }>,
) => {
  const group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('id', 'pipGroup');

  rects.forEach((rect, index) => {
    const rectEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectEl.setAttribute('x', String(rect.x));
    rectEl.setAttribute('y', String(rect.y));
    rectEl.setAttribute('width', String(rect.width));
    rectEl.setAttribute('height', String(rect.height));
    rectEl.setAttribute('id', `rect${index}`);
    group.appendChild(rectEl);
  });

  return group;
};

describe('ArmorPipLayout', () => {
  describe('Basic Pip Generation', () => {
    it('should not add pips when count is 0', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 0);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(0);
    });

    it('should not add pips when count is negative', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, -5);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(0);
    });

    it('should add circle elements for each pip', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
        { x: 0, y: 10, width: 100, height: 10 },
        { x: 0, y: 20, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 10);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(10);
    });

    it('should set correct attributes on pip circles', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 10, y: 10, width: 50, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 3, {
        fill: '#FF0000',
        strokeWidth: 1.5,
      });

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(3);

      // Check first circle has required attributes
      const firstCircle = circles[0];
      expect(firstCircle.hasAttribute('cx')).toBe(true);
      expect(firstCircle.hasAttribute('cy')).toBe(true);
      expect(firstCircle.hasAttribute('r')).toBe(true);
      expect(firstCircle.getAttribute('fill')).toBe('#FF0000');
      expect(firstCircle.getAttribute('stroke-width')).toBe('1.5');
    });

    it('should apply className to pip circles when provided', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 5, {
        className: 'pip armor',
      });

      const circles = group.getElementsByTagName('circle');
      Array.from(circles).forEach((circle) => {
        expect(circle.getAttribute('class')).toBe('pip armor');
      });
    });
  });

  describe('Bounding Rectangle Handling', () => {
    it('should handle empty group (no rects)', () => {
      const svgDoc = createMockSVGDocument();
      const group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Should not throw
      ArmorPipLayout.addPips(svgDoc, group, 10);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(0);
    });

    it('should handle single rect', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 20 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 5);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(5);
    });

    it('should handle multiple rects stacked vertically', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
        { x: 0, y: 10, width: 100, height: 10 },
        { x: 0, y: 20, width: 100, height: 10 },
        { x: 0, y: 30, width: 100, height: 10 },
        { x: 0, y: 40, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 20);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(20);
    });

    it('should handle rects with varying widths', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 10, y: 0, width: 80, height: 10 },
        { x: 5, y: 10, width: 90, height: 10 },
        { x: 0, y: 20, width: 100, height: 10 },
        { x: 5, y: 30, width: 90, height: 10 },
        { x: 10, y: 40, width: 80, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 15);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(15);
    });
  });

  describe('Pip Positioning', () => {
    it('should position pips within bounding rect area', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 50, y: 100, width: 100, height: 50 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 5);

      const circles = group.getElementsByTagName('circle');
      Array.from(circles).forEach((circle) => {
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        const r = parseFloat(circle.getAttribute('r') || '0');

        // Center should be within bounds (with some margin for radius)
        expect(cx).toBeGreaterThanOrEqual(50 - r);
        expect(cx).toBeLessThanOrEqual(150 + r);
        expect(cy).toBeGreaterThanOrEqual(100 - r);
        expect(cy).toBeLessThanOrEqual(150 + r);
      });
    });

    it('should distribute pips across rows', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
        { x: 0, y: 10, width: 100, height: 10 },
        { x: 0, y: 20, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 9);

      const circles = group.getElementsByTagName('circle');
      const yValues = Array.from(circles).map((c) =>
        parseFloat(c.getAttribute('cy') || '0'),
      );

      // Should have pips at different y levels
      const uniqueY = new Set(yValues.map((y) => Math.round(y)));
      expect(uniqueY.size).toBeGreaterThan(1);
    });
  });

  describe('Multi-Section Layout', () => {
    it('should handle multi-section groups', () => {
      const svgDoc = createMockSVGDocument();

      // Create a group with mml-multisection style
      const mainGroup = svgDoc.createElementNS(
        'http://www.w3.org/2000/svg',
        'g',
      );
      mainGroup.setAttribute('style', 'mml-multisection:true');

      // Add child groups with rects
      const section1 = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 50, height: 30 },
      ]);
      const section2 = createGroupWithRects(svgDoc, [
        { x: 50, y: 0, width: 50, height: 30 },
      ]);

      mainGroup.appendChild(section1);
      mainGroup.appendChild(section2);

      ArmorPipLayout.addPips(svgDoc, mainGroup, 10);

      // Should distribute pips across both sections
      const totalCircles = mainGroup.getElementsByTagName('circle');
      expect(totalCircles.length).toBe(10);
    });
  });

  describe('Gap Handling', () => {
    it('should respect gap style attribute', () => {
      const svgDoc = createMockSVGDocument();
      const group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Create rect with gap style
      const rect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '20');
      rect.setAttribute('style', 'mml-gap:40,60'); // Gap from 40 to 60
      group.appendChild(rect);

      ArmorPipLayout.addPips(svgDoc, group, 6);

      const circles = group.getElementsByTagName('circle');

      // Pips should avoid the gap area
      Array.from(circles).forEach((circle) => {
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const r = parseFloat(circle.getAttribute('r') || '0');

        // Should not be in the gap region (40-60)
        const isInGap = cx - r > 40 && cx + r < 60;
        expect(isInGap).toBe(false);
      });
    });
  });

  describe('Default Options', () => {
    it('should use default fill color when not specified', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 3);

      const circles = group.getElementsByTagName('circle');
      expect(circles[0].getAttribute('fill')).toBe('#FFFFFF');
    });

    it('should use default stroke when not specified', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 10 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 3);

      const circles = group.getElementsByTagName('circle');
      expect(circles[0].getAttribute('stroke')).toBe('#000000');
    });
  });

  describe('Large Pip Counts', () => {
    it('should handle large pip counts (50+)', () => {
      const svgDoc = createMockSVGDocument();
      const rects = Array.from({ length: 10 }, (_, i) => ({
        x: 0,
        y: i * 10,
        width: 200,
        height: 10,
      }));
      const group = createGroupWithRects(svgDoc, rects);

      ArmorPipLayout.addPips(svgDoc, group, 50);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(50);
    });

    it('should handle very small pip counts (1-2)', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 30 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 1);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very narrow rects', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 10, height: 100 },
      ]);

      // Should not throw
      ArmorPipLayout.addPips(svgDoc, group, 5);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should handle very short rects', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: 0, y: 0, width: 100, height: 2 },
      ]);

      // Should not throw
      ArmorPipLayout.addPips(svgDoc, group, 3);
    });

    it('should handle rects at negative coordinates', () => {
      const svgDoc = createMockSVGDocument();
      const group = createGroupWithRects(svgDoc, [
        { x: -50, y: -50, width: 100, height: 50 },
      ]);

      ArmorPipLayout.addPips(svgDoc, group, 5);

      const circles = group.getElementsByTagName('circle');
      expect(circles.length).toBe(5);
    });
  });
});
