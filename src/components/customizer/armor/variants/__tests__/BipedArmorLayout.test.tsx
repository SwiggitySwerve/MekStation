import { render, screen } from '@testing-library/react';
import React from 'react';

import { MechLocation } from '@/types/construction';

import { NeonOperatorDiagram, PremiumMaterialDiagram } from '..';
import {
  BIPED_ARMOR_PLATES,
  BIPED_PLATE_STACK,
} from '../CleanTechBipedDiagram.geometry';

/**
 * The shared biped diagram behind the Glow, HUD and Chromatic styles (the
 * Standard style draws the Blueprint diagram, tested beside this file). It
 * is drawn at about 0.83 px per viewBox unit on a 390x844
 * phone (420 units wide, its height capped to keep the footer above the
 * Loadout bar), so these unit floors correspond to 12 px text and 44 px touch
 * targets there.
 */
const MIN_TEXT_UNITS = 14;
const MIN_TAP_UNITS = 54;
/** Clear space the head's value line keeps above the plate's bottom edge. */
const MIN_HEAD_CLEARANCE_UNITS = 10;

const armorData = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  {
    location: MechLocation.CENTER_TORSO,
    current: 47,
    maximum: 62,
    rear: 14,
    rearMaximum: 15,
  },
  {
    location: MechLocation.LEFT_TORSO,
    current: 32,
    maximum: 42,
    rear: 10,
    rearMaximum: 10,
  },
  {
    location: MechLocation.RIGHT_TORSO,
    current: 32,
    maximum: 42,
    rear: 10,
    rearMaximum: 10,
  },
  { location: MechLocation.LEFT_ARM, current: 34, maximum: 34 },
  { location: MechLocation.RIGHT_ARM, current: 34, maximum: 34 },
  { location: MechLocation.LEFT_LEG, current: 41, maximum: 42 },
  { location: MechLocation.RIGHT_LEG, current: 41, maximum: 42 },
];

const props = {
  armorData,
  selectedLocation: null,
  unallocatedPoints: 0,
  onLocationClick: jest.fn(),
};

/** Bounds of an absolute M/L/H/V/Z path, in viewBox units. */
function pathBounds(d: string): {
  width: number;
  height: number;
  maxY: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];
  let x = 0;
  let y = 0;
  for (const [, command, args] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
    const n = args
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (command === 'H') x = n[0];
    else if (command === 'V') y = n[0];
    else if (command !== 'Z') [x, y] = n;
    xs.push(x);
    ys.push(y);
  }
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Vertices of an absolute M/L/H/V/Z path. */
function pathPoints(d: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  for (const [, command, args] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
    const n = args
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (command === 'H') x = n[0];
    else if (command === 'V') y = n[0];
    else if (command !== 'Z') [x, y] = n;
    if (command !== 'Z') points.push([x, y]);
  }
  return points;
}

/** The plate's left and right edge at height y, around the vertical axis x. */
function spanAt(
  points: Array<[number, number]>,
  y: number,
  x: number,
): [number, number] | null {
  const crossings: number[] = [];
  points.forEach(([x1, y1], index) => {
    const [x2, y2] = points[(index + 1) % points.length];
    if ((y1 <= y && y < y2) || (y2 <= y && y < y1))
      crossings.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
  });
  crossings.sort((a, b) => a - b);
  for (let i = 0; i + 1 < crossings.length; i += 2)
    if (crossings[i] <= x && x <= crossings[i + 1])
      return [crossings[i], crossings[i + 1]];
  return null;
}

/**
 * Widest rendered text rows, in viewBox units, measured in the browser at the
 * sizes the label uses ("61/62" at 22/17 units, "F47·R14" at 17 units).
 */
const FRONT_ROW_UNITS = 50;
/** The head's one-digit "9/9". */
const HEAD_ROW_UNITS = 28;
/** The torso's "F47·R14" split line, the widest row any plate holds. */
const SPLIT_ROW_UNITS = 67;
/** Clear space between a text row and the plate outline. */
const MIN_EDGE_INSET_UNITS = 8;
/** The split line fills a torso plate, so it keeps a slightly smaller inset. */
const MIN_SPLIT_INSET_UNITS = 6;

function fontSizeOf(node: Element): number {
  return Number(node.closest('[font-size]')?.getAttribute('font-size'));
}

describe('biped armor diagram layout', () => {
  it('keeps every plate a comfortable touch target', () => {
    for (const plate of Object.values(BIPED_ARMOR_PLATES)) {
      const { width, height } = pathBounds(plate.path);
      expect(width).toBeGreaterThanOrEqual(MIN_TAP_UNITS);
      expect(height).toBeGreaterThanOrEqual(MIN_TAP_UNITS);
    }
  });

  it('never draws SVG text below the phone readability floor', () => {
    const { container } = render(<NeonOperatorDiagram {...props} />);
    const texts = container.querySelectorAll('svg text, svg tspan');
    expect(texts.length).toBeGreaterThan(0);
    for (const node of texts) {
      expect(fontSizeOf(node)).toBeGreaterThanOrEqual(MIN_TEXT_UNITS);
    }
  });

  it('labels torsos with the short name, the location total and an F/R split line', () => {
    const { container } = render(<NeonOperatorDiagram {...props} />);
    for (const name of ['CT', 'LT', 'RT']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText(/-F$/)).toBeNull();
    expect(screen.queryByText('FRONT')).toBeNull();
    expect(screen.queryByText('REAR')).toBeNull();
    const faces = Array.from(
      container.querySelectorAll('[data-armor-face-location="Center Torso"]'),
    );
    expect(faces.map((node) => node.getAttribute('data-armor-face'))).toEqual([
      'front',
      'rear',
    ]);
    // Front and rear share the location max (62), so the plate shows the
    // total against it and splits it below; no per-side maximum is drawn.
    expect(faces.map((node) => node.textContent)).toEqual(['F47', 'R14']);
    const totalText = container.querySelector(
      '[data-armor-total-location="Center Torso"]',
    );
    expect(totalText?.textContent).toBe('61/62');
    expect(container.textContent).not.toMatch(/47\/48|14\/15/);
    // Accessible names still spell out the rear face.
    expect(
      screen.getByRole('button', { name: /^Center Torso armor:.*rear: 14 of/ }),
    ).toBeInTheDocument();
  });

  it('uses one text stack for every location, centred on its plate', () => {
    const { container } = render(<NeonOperatorDiagram {...props} />);
    const buttons = container.querySelectorAll('[role="button"][aria-label]');
    expect(buttons).toHaveLength(Object.keys(BIPED_ARMOR_PLATES).length);
    for (const location of Object.keys(BIPED_ARMOR_PLATES) as MechLocation[]) {
      const plate = BIPED_ARMOR_PLATES[location]!;
      const button = container.querySelector(
        `[role="button"][aria-label^="${location} armor"]`,
      )!;
      const lines = Array.from(button.querySelectorAll('text'));
      // Abbreviation, then the location's armor with its "/max" muted on the
      // same baseline, then (torsos only) the front / rear split line.
      expect(lines).toHaveLength(plate.hasRear ? 3 : 2);
      expect(lines[0]).toHaveTextContent(plate.label);
      expect(lines[1].textContent).toMatch(/^\d+\/\d+$/);
      expect(lines[1].querySelectorAll('tspan')).toHaveLength(1);
      expect(lines[1].querySelector('tspan')?.textContent).toMatch(/^\/\d+$/);
      if (plate.hasRear) expect(lines[2].textContent).toMatch(/^F\d+·R\d+$/);
      for (const line of lines)
        expect(Number(line.getAttribute('x'))).toBe(plate.x);
    }
  });

  it('keeps every text row at least 8 units inside its plate outline', () => {
    for (const [location, plate] of Object.entries(BIPED_ARMOR_PLATES)) {
      const points = pathPoints(plate.path);
      const rows = [
        {
          baseline: plate.y + BIPED_PLATE_STACK.value,
          cap: 16,
          width:
            location === MechLocation.HEAD ? HEAD_ROW_UNITS : FRONT_ROW_UNITS,
          inset: MIN_EDGE_INSET_UNITS,
        },
        ...(plate.hasRear
          ? [
              {
                baseline: plate.y + BIPED_PLATE_STACK.rear,
                cap: 12,
                width: SPLIT_ROW_UNITS,
                inset: MIN_SPLIT_INSET_UNITS,
              },
            ]
          : []),
      ];
      for (const { baseline, cap, width, inset } of rows) {
        for (const y of [baseline - cap, baseline]) {
          const span = spanAt(points, y, plate.x);
          expect(span).not.toBeNull();
          const [left, right] = span!;
          expect(plate.x - width / 2 - left).toBeGreaterThanOrEqual(inset);
          expect(right - (plate.x + width / 2)).toBeGreaterThanOrEqual(inset);
        }
      }
    }
  });

  it('mirrors the left plates about the centre line', () => {
    const pairs: Array<[MechLocation, MechLocation]> = [
      [MechLocation.RIGHT_ARM, MechLocation.LEFT_ARM],
      [MechLocation.RIGHT_TORSO, MechLocation.LEFT_TORSO],
      [MechLocation.RIGHT_LEG, MechLocation.LEFT_LEG],
    ];
    for (const [right, left] of pairs) {
      const a = BIPED_ARMOR_PLATES[right]!;
      const b = BIPED_ARMOR_PLATES[left]!;
      expect(a.x + b.x).toBe(360);
      expect(a.y).toBe(b.y);
      const bounds = (path: string) => {
        const xs = pathPoints(path).map(([x]) => x);
        return [Math.min(...xs), Math.max(...xs)];
      };
      const [minA, maxA] = bounds(a.path);
      const [minB, maxB] = bounds(b.path);
      expect([minA + maxB, maxA + minB]).toEqual([360, 360]);
    }
  });

  it("puts the unit's left side on the viewer's left, like the record sheet", () => {
    const centre = BIPED_ARMOR_PLATES[MechLocation.CENTER_TORSO]!.x;
    for (const location of [
      MechLocation.LEFT_ARM,
      MechLocation.LEFT_TORSO,
      MechLocation.LEFT_LEG,
    ])
      expect(BIPED_ARMOR_PLATES[location]!.x).toBeLessThan(centre);
    for (const location of [
      MechLocation.RIGHT_ARM,
      MechLocation.RIGHT_TORSO,
      MechLocation.RIGHT_LEG,
    ])
      expect(BIPED_ARMOR_PLATES[location]!.x).toBeGreaterThan(centre);

    const { container } = render(<NeonOperatorDiagram {...props} />);
    const sideLabels = Array.from(container.querySelectorAll('svg text'))
      .filter((text) => /^(Left|Right)$/.test(text.textContent ?? ''))
      .map((text) => [text.textContent, Number(text.getAttribute('x'))]);
    expect(sideLabels).toEqual([
      ['Left', 16],
      ['Right', 344],
    ]);
    // Tab order follows the drawing: top row, then left to right.
    const order = Array.from(
      container.querySelectorAll('[role="button"][aria-label]'),
    ).map((button) => button.getAttribute('aria-label')!.split(' armor')[0]);
    expect(order).toEqual([
      'Head',
      'Left Arm',
      'Left Torso',
      'Center Torso',
      'Right Torso',
      'Right Arm',
      'Left Leg',
      'Right Leg',
    ]);
  });
  it('gives the head denominator room above its bottom outline', () => {
    const { container } = render(<NeonOperatorDiagram {...props} />);
    const head = BIPED_ARMOR_PLATES[MechLocation.HEAD]!;
    const value = container
      .querySelector('[role="button"][aria-label^="Head armor"]')!
      .querySelectorAll('text')[1];
    expect(value).toHaveTextContent('9/9');
    const baseline = Number(value.getAttribute('y'));
    expect(pathBounds(head.path).maxY - baseline).toBeGreaterThanOrEqual(
      MIN_HEAD_CLEARANCE_UNITS,
    );
  });

  it('draws the neck and pelvis as raised silhouette fill, not a dark hole', () => {
    for (const Diagram of [NeonOperatorDiagram, PremiumMaterialDiagram]) {
      const { container, unmount } = render(<Diagram {...props} />);
      const frame = container.querySelector('[data-armor-structure]')!;
      expect(frame).toHaveAttribute('fill', 'var(--surface-raised)');
      expect(frame.querySelectorAll('path')).toHaveLength(2);
      expect(container.innerHTML).not.toContain('stroke-width="12"');
      unmount();
    }
  });

  it('hides the footer on wide layouts only when the inspector shows the legend', () => {
    const { rerender } = render(<NeonOperatorDiagram {...props} />);
    const footer = () => screen.getByTestId('armor-allocation-footer');
    expect(footer()).not.toHaveClass('xl:hidden');
    expect(footer()).toHaveTextContent('Unallocated:');
    expect(footer()).toHaveTextContent('F = front · R = rear armor');
    rerender(<NeonOperatorDiagram {...props} footerVisibility="below-xl" />);
    expect(footer()).toHaveClass('xl:hidden');
    rerender(<NeonOperatorDiagram {...props} unallocatedPoints={-3} />);
    expect(footer()).toHaveTextContent('Over allocated');
    expect(footer()).toHaveTextContent('3 points');
  });
});
