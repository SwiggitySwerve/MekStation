import { render, screen } from '@testing-library/react';
import React from 'react';

import { MechLocation } from '@/types/construction';

import { CleanTechDiagram, PremiumMaterialDiagram } from '..';
import { BIPED_ARMOR_PLATES } from '../CleanTechBipedDiagram.geometry';

/**
 * The biped diagram is drawn at about 0.86 px per viewBox unit on a 390x844
 * phone (its height is capped to keep the footer above the Loadout bar), so
 * these unit floors correspond to 12 px text and 44 px touch targets there.
 */
const MIN_TEXT_UNITS = 14;
const MIN_TAP_UNITS = 52;
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
    const { container } = render(<CleanTechDiagram {...props} />);
    const texts = container.querySelectorAll('svg text, svg tspan');
    expect(texts.length).toBeGreaterThan(0);
    for (const node of texts) {
      expect(fontSizeOf(node)).toBeGreaterThanOrEqual(MIN_TEXT_UNITS);
    }
  });

  it('labels torsos with the short name, front value and an R rear line', () => {
    const { container } = render(<CleanTechDiagram {...props} />);
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
    expect(faces.map((node) => node.textContent)).toEqual(['47/48', 'R 14/15']);
    // Accessible names still spell out the rear face.
    expect(
      screen.getByRole('button', { name: /^Center Torso armor:.*rear: 14 of/ }),
    ).toBeInTheDocument();
  });

  it('gives the head denominator room above its bottom outline', () => {
    const { container } = render(<CleanTechDiagram {...props} />);
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
    for (const Diagram of [CleanTechDiagram, PremiumMaterialDiagram]) {
      const { container, unmount } = render(<Diagram {...props} />);
      const frame = container.querySelector('[data-armor-structure]')!;
      expect(frame).toHaveAttribute('fill', 'var(--surface-raised)');
      expect(frame.querySelectorAll('path')).toHaveLength(2);
      expect(container.innerHTML).not.toContain('stroke-width="12"');
      unmount();
    }
  });

  it('hides the footer on wide layouts only when the inspector shows the legend', () => {
    const { rerender } = render(<CleanTechDiagram {...props} />);
    const footer = () => screen.getByTestId('armor-allocation-footer');
    expect(footer()).not.toHaveClass('xl:hidden');
    expect(footer()).toHaveTextContent('Unallocated:');
    expect(footer()).toHaveTextContent('R = rear armor');
    rerender(<CleanTechDiagram {...props} footerVisibility="below-xl" />);
    expect(footer()).toHaveClass('xl:hidden');
    rerender(<CleanTechDiagram {...props} unallocatedPoints={-3} />);
    expect(footer()).toHaveTextContent('Over allocated');
    expect(footer()).toHaveTextContent('3 points');
  });
});
