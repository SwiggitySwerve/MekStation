import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import { CleanTechDiagram } from '..';
import { BlueprintArmorDiagram } from '../BlueprintArmorDiagram';
import {
  BLUEPRINT_FRONT_PLATES,
  BLUEPRINT_FRONT_VIEWBOX,
  BLUEPRINT_REAR_PLATES,
  BLUEPRINT_REAR_VIEWBOX,
  BLUEPRINT_TYPE,
  horizontalSpans,
} from '../BlueprintArmorDiagram.geometry';

/** The Atlas AS7-D allocation the concept was drawn with. */
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

function renderDiagram(
  overrides: Partial<React.ComponentProps<typeof BlueprintArmorDiagram>> = {},
) {
  const onLocationClick = jest.fn();
  const view = render(
    <BlueprintArmorDiagram
      armorData={armorData}
      selectedLocation={null}
      unallocatedPoints={0}
      onLocationClick={onLocationClick}
      {...overrides}
    />,
  );
  return { ...view, onLocationClick };
}

const front = (location: MechLocation) =>
  screen.getByRole('button', { name: new RegExp(`^${location} armor:`) });
const rear = (location: MechLocation) =>
  screen.getByRole('button', { name: new RegExp(`^${location} rear armor:`) });

function gradientOffsets(plate: Element): string[] {
  const fill = plate.querySelector('[data-armor-fill]')!;
  const id = fill.getAttribute('fill')!.slice(5, -1);
  const gradient = plate.ownerDocument.getElementById(id)!;
  return Array.from(gradient.querySelectorAll('stop')).map(
    (stop) => stop.getAttribute('offset')!,
  );
}

/** Rendered px per viewBox unit: 21.5rem front and 12rem rear views. */
const viewBoxWidth = (viewBox: string) => Number(viewBox.split(' ')[2]);
const FRONT_SCALE = 344 / viewBoxWidth(BLUEPRINT_FRONT_VIEWBOX);
const REAR_SCALE = 192 / viewBoxWidth(BLUEPRINT_REAR_VIEWBOX);
/** A 390px phone: the front view is capped at 19.25rem (308px). */
const PHONE_FRONT_SCALE = 308 / viewBoxWidth(BLUEPRINT_FRONT_VIEWBOX);

describe('Blueprint armor diagram', () => {
  it('is the Standard biped silhouette', () => {
    const { container } = render(
      <CleanTechDiagram
        armorData={armorData}
        selectedLocation={null}
        unallocatedPoints={0}
        onLocationClick={jest.fn()}
      />,
    );
    const root = container.querySelector('[data-armor-variant]');
    expect(root).toHaveAttribute('data-armor-variant', 'clean-tech');
    expect(root).toHaveAttribute('data-armor-design', 'blueprint');
  });

  it('fills a full plate to the top and draws no level line', () => {
    renderDiagram();
    const arm = front(MechLocation.LEFT_ARM);
    expect(arm.querySelector('[data-armor-fill]')).toHaveAttribute(
      'data-armor-fill-ratio',
      '1',
    );
    expect(gradientOffsets(arm)).toEqual(['0', '0', '0', '1']);
    expect(arm.querySelector('[data-armor-level]')).toBeNull();
  });

  it('fills a 41 / 42 plate to its share and marks the edge with a level line', () => {
    renderDiagram();
    const leg = front(MechLocation.LEFT_LEG);
    const ratio = 41 / 42;
    expect(
      Number(
        leg
          .querySelector('[data-armor-fill]')!
          .getAttribute('data-armor-fill-ratio'),
      ),
    ).toBeCloseTo(ratio, 10);
    const [, wellEnd, fillStart] = gradientOffsets(leg).map(Number);
    expect(wellEnd).toBeCloseTo(1 - ratio, 10);
    expect(fillStart).toBeCloseTo(1 - ratio, 10);

    const plate = BLUEPRINT_FRONT_PLATES.find(
      (p) => p.location === MechLocation.LEFT_LEG,
    )!;
    const { y0, y1 } = plate.bounds;
    const lines = leg.querySelectorAll('[data-armor-level] line');
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const y = Number(line.getAttribute('y1'));
      expect(y).toBeCloseTo(y1 - ratio * (y1 - y0), 6);
      // The line runs edge to edge inside the plate, never past it.
      const [left, right] = horizontalSpans(plate.points, y).find(
        ([l, r]) => l <= Number(line.getAttribute('x1')) && r >= 0,
      )!;
      expect(Number(line.getAttribute('x1'))).toBeGreaterThanOrEqual(left);
      expect(Number(line.getAttribute('x2'))).toBeLessThanOrEqual(right);
    }
  });

  it('fills front torso plates by the location total, with no rear band', () => {
    renderDiagram();
    const torso = front(MechLocation.LEFT_TORSO);
    // 32 front + 10 rear of a shared 42.
    expect(torso.querySelector('[data-armor-fill]')).toHaveAttribute(
      'data-armor-fill-ratio',
      '1',
    );
    expect(torso.querySelector('pattern')).toBeNull();
    const centre = front(MechLocation.CENTER_TORSO);
    expect(
      Number(
        centre
          .querySelector('[data-armor-fill]')!
          .getAttribute('data-armor-fill-ratio'),
      ),
    ).toBeCloseTo(61 / 62, 10);
    expect(
      within(centre).getByText(
        (_, node) =>
          node?.getAttribute('data-armor-total-location') !== null &&
          node?.textContent === '61 / 62',
      ),
    ).toBeInTheDocument();
    expect(within(centre).getByText('F 47')).toBeInTheDocument();
  });

  it('uses no status hue anywhere in the drawing while validation flags nothing', () => {
    const { container } = renderDiagram();
    expect(container.querySelector('[data-armor-issue]')).toBeNull();
    expect(container.querySelector('.isWarning, .isError')).toBeNull();
    const html = container.innerHTML.toLowerCase();
    for (const status of Object.values(ARMOR_STATUS))
      expect(html).not.toContain(status.color.toLowerCase());
    // Paint comes from theme tokens in the stylesheet, never inline colours.
    for (const node of container.querySelectorAll('svg [fill], svg [stroke]')) {
      const paint = `${node.getAttribute('fill') ?? ''} ${node.getAttribute('stroke') ?? ''}`;
      expect(paint.replace(/url\(#[^)]*\)/g, '')).not.toMatch(/#|rgb|hsl/);
    }
  });

  it('fills each rear inset plate to its location level, shows "R n" and selects its location', () => {
    const { onLocationClick } = renderDiagram();
    for (const location of [
      MechLocation.LEFT_TORSO,
      MechLocation.CENTER_TORSO,
      MechLocation.RIGHT_TORSO,
    ]) {
      // Front and rear share one location max, so both views fill to the
      // same total / max level in the same tones.
      const rearFill = rear(location).querySelector('[data-armor-fill]')!;
      const frontFill = front(location).querySelector('[data-armor-fill]')!;
      expect(rearFill.getAttribute('data-armor-fill-ratio')).toBe(
        frontFill.getAttribute('data-armor-fill-ratio'),
      );
      expect(gradientOffsets(rear(location))).toEqual(
        gradientOffsets(front(location)),
      );
      // Only the eight front plates count as the drawing's location plates.
      expect(rearFill).not.toHaveAttribute('data-armor-plate');
      expect(rear(location).querySelector('pattern')).toBeNull();
    }
    // Center Torso 61 / 62: the rear plate shows the level line too.
    expect(
      rear(MechLocation.CENTER_TORSO).querySelector('[data-armor-level]'),
    ).not.toBeNull();
    expect(
      rear(MechLocation.LEFT_TORSO).querySelector('[data-armor-level]'),
    ).toBeNull();
    const centre = rear(MechLocation.CENTER_TORSO);
    expect(within(centre).getByText('CT')).toBeInTheDocument();
    expect(within(centre).getByText('R 14')).toBeInTheDocument();
    // One value stack: "R 14" is set exactly like the front plates' "F 47".
    const rearLine = within(centre).getByText('R 14').closest('text')!;
    const frontLine = within(front(MechLocation.CENTER_TORSO))
      .getByText('F 47')
      .closest('text')!;
    expect(rearLine).toHaveClass('sub');
    expect(frontLine).toHaveClass('sub');
    expect(rearLine.getAttribute('font-size')).toBe(
      frontLine.getAttribute('font-size'),
    );
    expect(
      within(rear(MechLocation.LEFT_TORSO)).getByText('R 10'),
    ).toBeInTheDocument();

    fireEvent.click(centre);
    expect(onLocationClick).toHaveBeenLastCalledWith(MechLocation.CENTER_TORSO);
    fireEvent.keyDown(rear(MechLocation.RIGHT_TORSO), { key: 'Enter' });
    expect(onLocationClick).toHaveBeenLastCalledWith(MechLocation.RIGHT_TORSO);
    fireEvent.keyDown(rear(MechLocation.LEFT_TORSO), { key: ' ' });
    expect(onLocationClick).toHaveBeenLastCalledWith(MechLocation.LEFT_TORSO);
  });

  it('names every plate with its location, points, max and front / rear split', () => {
    renderDiagram();
    const plates = screen.getAllByRole('button', { name: / armor: / });
    const names = plates.map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual([
      'Head armor: 9 of 9 points',
      'Left Arm armor: 34 of 34 points',
      'Left Torso armor: 42 of 42 points, front 32, rear 10',
      'Center Torso armor: 61 of 62 points, front 47, rear 14',
      'Right Torso armor: 42 of 42 points, front 32, rear 10',
      'Right Arm armor: 34 of 34 points',
      'Left Leg armor: 41 of 42 points',
      'Right Leg armor: 41 of 42 points',
      'Left Torso rear armor: 42 of 42 points, front 32, rear 10',
      'Center Torso rear armor: 61 of 62 points, front 47, rear 14',
      'Right Torso rear armor: 42 of 42 points, front 32, rear 10',
    ]);
    for (const button of plates)
      expect(button).toHaveAttribute('tabindex', '0');
  });

  it('selects, lights and captions a location in both views together', () => {
    renderDiagram({ selectedLocation: MechLocation.CENTER_TORSO });
    for (const plate of [
      front(MechLocation.CENTER_TORSO),
      rear(MechLocation.CENTER_TORSO),
    ]) {
      expect(plate).toHaveAttribute('aria-pressed', 'true');
      expect(plate).toHaveClass('isSelected');
    }
    expect(front(MechLocation.LEFT_TORSO)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByTestId('armor-diagram-caption')).toHaveTextContent(
      'Editing Center Torso',
    );
    expect(screen.getByTestId('armor-diagram-caption')).toHaveClass(
      'isEditing',
    );

    // Hovering either view lights its partner plate in the other view.
    fireEvent.mouseEnter(rear(MechLocation.LEFT_TORSO));
    expect(front(MechLocation.LEFT_TORSO)).toHaveClass('isLit');
    expect(rear(MechLocation.LEFT_TORSO)).toHaveClass('isLit');
    expect(front(MechLocation.CENTER_TORSO)).not.toHaveClass('isLit');
    fireEvent.mouseLeave(rear(MechLocation.LEFT_TORSO));
    expect(front(MechLocation.LEFT_TORSO)).not.toHaveClass('isLit');
  });

  it('hints at selection and shows no in-diagram total while nothing is selected', () => {
    const { container } = renderDiagram();
    const caption = screen.getByTestId('armor-diagram-caption');
    expect(caption).toHaveTextContent(/^Select a location or row to edit$/);
    expect(caption).not.toHaveClass('isEditing');
    // Totals, armor type and tonnage live in the summary bar and inspector.
    const drawn = Array.from(container.querySelectorAll('svg'))
      .map((svg) => svg.textContent)
      .join(' ');
    expect(drawn).not.toMatch(/304|307|Standard|\d t\b|%/);
    expect(screen.queryByText(/SELECTED/)).toBeNull();
  });

  it('moves focus between plates with the arrow keys in drawing order', () => {
    renderDiagram();
    const press = (key: string) =>
      fireEvent.keyDown(document.activeElement!, { key });

    act(() => front(MechLocation.HEAD).focus());
    press('ArrowDown');
    expect(front(MechLocation.CENTER_TORSO)).toHaveFocus();
    press('ArrowLeft');
    expect(front(MechLocation.LEFT_TORSO)).toHaveFocus();
    press('ArrowLeft');
    expect(front(MechLocation.LEFT_ARM)).toHaveFocus();
    // The drawing's edge: focus stays put.
    press('ArrowLeft');
    expect(front(MechLocation.LEFT_ARM)).toHaveFocus();
    press('ArrowDown');
    expect(front(MechLocation.LEFT_LEG)).toHaveFocus();
    press('ArrowRight');
    expect(front(MechLocation.RIGHT_LEG)).toHaveFocus();
    press('ArrowUp');
    expect(front(MechLocation.RIGHT_TORSO)).toHaveFocus();
    press('ArrowUp');
    expect(front(MechLocation.HEAD)).toHaveFocus();

    act(() => rear(MechLocation.LEFT_TORSO).focus());
    press('ArrowRight');
    expect(rear(MechLocation.CENTER_TORSO)).toHaveFocus();
    press('ArrowRight');
    expect(rear(MechLocation.RIGHT_TORSO)).toHaveFocus();
    press('ArrowLeft');
    expect(rear(MechLocation.CENTER_TORSO)).toHaveFocus();
  });

  it('draws a focus ring around the focused plate only while it has keyboard focus', () => {
    const { container } = renderDiagram();
    act(() => front(MechLocation.LEFT_ARM).focus());
    const ring = container.querySelector('[data-armor-focus-ring]');
    expect(ring).toHaveAttribute(
      'data-armor-focus-ring',
      MechLocation.LEFT_ARM,
    );
    expect(ring).toHaveClass('ring');
    act(() => front(MechLocation.LEFT_ARM).blur());
    expect(container.querySelector('[data-armor-focus-ring]')).toBeNull();
  });

  it('closes the editor with Escape through the existing toggle', () => {
    const idle = renderDiagram();
    fireEvent.keyDown(front(MechLocation.HEAD), { key: 'Escape' });
    expect(idle.onLocationClick).not.toHaveBeenCalled();
    idle.unmount();

    const editing = renderDiagram({
      selectedLocation: MechLocation.LEFT_LEG,
    });
    fireEvent.keyDown(front(MechLocation.HEAD), { key: 'Escape' });
    expect(editing.onLocationClick).toHaveBeenCalledWith(MechLocation.LEFT_LEG);
  });

  it('keeps every drawn label at 12px or more on desktop and phone', () => {
    const { container } = renderDiagram();
    const scaleOf = (node: Element) =>
      node.closest('svg')!.getAttribute('viewBox') === BLUEPRINT_REAR_VIEWBOX
        ? REAR_SCALE
        : Math.min(FRONT_SCALE, PHONE_FRONT_SCALE);
    const texts = container.querySelectorAll('svg text, svg tspan');
    expect(texts.length).toBeGreaterThan(0);
    for (const node of texts) {
      const size = Number(
        node.closest('[font-size]')!.getAttribute('font-size'),
      );
      expect(size * scaleOf(node)).toBeGreaterThanOrEqual(12);
    }
  });

  it('keeps every plate at least 24px on desktop and 44px on a phone', () => {
    for (const plate of BLUEPRINT_FRONT_PLATES.concat(BLUEPRINT_REAR_PLATES)) {
      const { x0, y0, x1, y1 } = plate.bounds;
      const scale =
        plate.view === 'rear'
          ? REAR_SCALE
          : Math.min(FRONT_SCALE, PHONE_FRONT_SCALE);
      expect(Math.min(x1 - x0, y1 - y0) * scale).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps each label row inside its plate outline', () => {
    // Arial advance widths (em): digits 0.556, space and slash 0.278.
    const width = (digits: number, others: number, size: number) =>
      (digits * 0.556 + others * 0.278) * size;
    const { gap, value, small } = BLUEPRINT_TYPE;
    for (const plate of BLUEPRINT_FRONT_PLATES) {
      const values = armorData.find((d) => d.location === plate.location)!;
      const total = values.current + (values.rear ?? 0);
      const lines = values.rear === undefined ? 2 : 3;
      const top = plate.anchor[1] - ((lines - 1) * gap) / 2;
      const baseline = top + gap + 0.5;
      const row =
        width(String(total).length, 0, value) +
        width(String(values.maximum).length, 3, small);
      for (const y of [baseline - value * 0.72, baseline]) {
        const span = horizontalSpans(plate.points, y).find(
          ([l, r]) => l <= plate.anchor[0] && plate.anchor[0] <= r,
        );
        expect(span).toBeDefined();
        const [left, right] = span!;
        expect(plate.anchor[0] - row / 2 - left).toBeGreaterThanOrEqual(2);
        expect(right - (plate.anchor[0] + row / 2)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("puts the unit's left side on the viewer's left in both views", () => {
    const centreOf = (location: MechLocation, view: 'front' | 'rear') => {
      const plates =
        view === 'front' ? BLUEPRINT_FRONT_PLATES : BLUEPRINT_REAR_PLATES;
      return plates.find((p) => p.location === location)!.anchor[0];
    };
    for (const view of ['front', 'rear'] as const) {
      expect(centreOf(MechLocation.LEFT_TORSO, view)).toBeLessThan(
        centreOf(MechLocation.CENTER_TORSO, view),
      );
      expect(centreOf(MechLocation.RIGHT_TORSO, view)).toBeGreaterThan(
        centreOf(MechLocation.CENTER_TORSO, view),
      );
    }
  });

  it('lists Front, Rear and Total per location in record-sheet order', () => {
    renderDiagram();
    const list = screen.getByTestId('armor-location-list');
    const rows = within(list).getAllByRole('button');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Head: front 9, total 9 of 9',
      'Center Torso: front 47, rear 14, total 61 of 62',
      'Left Torso: front 32, rear 10, total 42 of 42',
      'Right Torso: front 32, rear 10, total 42 of 42',
      'Left Arm: front 34, total 34 of 34',
      'Right Arm: front 34, total 34 of 34',
      'Left Leg: front 41, total 41 of 42',
      'Right Leg: front 41, total 41 of 42',
    ]);
    const cells = (row: HTMLElement) =>
      Array.from(row.children).map((cell) => cell.textContent);
    expect(cells(rows[1])).toEqual(['CT', '47', '14', '61 / 62']);
    // Locations without rear armor show a dash in the Rear column.
    expect(cells(rows[4])).toEqual(['LA', '34', '—', '34 / 34']);
    expect(list).toHaveTextContent(/^Location\s*Front\s*Rear\s*Total/);
  });

  it('selects from the list and shares the plates hover and selected states', () => {
    const { onLocationClick, rerender } = renderDiagram();
    const row = (name: string) =>
      within(screen.getByTestId('armor-location-list')).getByRole('button', {
        name: new RegExp(`^${name}:`),
      });

    fireEvent.click(row('Left Arm'));
    expect(onLocationClick).toHaveBeenLastCalledWith(MechLocation.LEFT_ARM);

    fireEvent.mouseEnter(row('Right Torso'));
    expect(row('Right Torso')).toHaveClass('isLit');
    expect(front(MechLocation.RIGHT_TORSO)).toHaveClass('isLit');
    expect(rear(MechLocation.RIGHT_TORSO)).toHaveClass('isLit');
    fireEvent.mouseLeave(row('Right Torso'));
    expect(front(MechLocation.RIGHT_TORSO)).not.toHaveClass('isLit');

    // Hovering a plate lights its row too.
    fireEvent.mouseEnter(front(MechLocation.HEAD));
    expect(row('Head')).toHaveClass('isLit');
    fireEvent.mouseLeave(front(MechLocation.HEAD));

    rerender(
      <BlueprintArmorDiagram
        armorData={armorData}
        selectedLocation={MechLocation.LEFT_LEG}
        unallocatedPoints={0}
        onLocationClick={onLocationClick}
      />,
    );
    expect(row('Left Leg')).toHaveAttribute('aria-pressed', 'true');
    expect(row('Left Leg')).toHaveClass('isSelected');
    expect(row('Right Leg')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks a location validation flags with the status edge and icon in both views and the list', () => {
    const { container } = renderDiagram({
      locationIssues: {
        [MechLocation.LEFT_ARM]: 'warning',
        [MechLocation.CENTER_TORSO]: 'error',
      },
    });
    const arm = screen.getByRole('button', {
      name: 'Left Arm armor: 34 of 34 points, low armor warning',
    });
    expect(arm).toHaveClass('isWarning');
    expect(arm.querySelector('[data-armor-issue="warning"]')).not.toBeNull();
    for (const plate of [
      front(MechLocation.CENTER_TORSO),
      rear(MechLocation.CENTER_TORSO),
    ]) {
      expect(plate).toHaveClass('isError');
      expect(plate.getAttribute('aria-label')).toMatch(
        /, critical armor error$/,
      );
      expect(plate.querySelector('[data-armor-issue="error"]')).not.toBeNull();
    }
    // Two front plates and one rear plate are marked, nothing else.
    expect(container.querySelectorAll('svg [data-armor-issue]')).toHaveLength(
      3,
    );
    expect(front(MechLocation.RIGHT_ARM)).not.toHaveClass('isWarning');

    const list = within(screen.getByTestId('armor-location-list'));
    const row = list.getByRole('button', {
      name: 'Left Arm: front 34, total 34 of 34, low armor warning',
    });
    expect(row.querySelector('[data-severity-icon="warning"]')).not.toBeNull();
    expect(
      list
        .getByRole('button', { name: /^Center Torso:.*critical armor error$/ })
        .querySelector('[data-severity-icon="error"]'),
    ).not.toBeNull();
    // The icon adds no text: the cell still reads the code alone.
    expect(row.firstElementChild).toHaveTextContent(/^LA$/);
  });

  it('keeps the issue icon inside its plate, clear of the code', () => {
    const icon = 7;
    for (const plate of BLUEPRINT_FRONT_PLATES.concat(BLUEPRINT_REAR_PLATES)) {
      renderDiagram({ locationIssues: { [plate.location]: 'warning' } });
      const button = screen.getByRole('button', {
        name: new RegExp(
          `^${plate.location}${plate.view === 'rear' ? ' rear' : ''} armor:`,
        ),
      });
      const mark = button.querySelector('[data-armor-issue]')!;
      const [, x, y] = /translate\(([-\d.]+) ([-\d.]+)\)/
        .exec(mark.getAttribute('transform')!)!
        .map(Number);
      for (const rowY of [y, y + icon / 2, y + icon]) {
        const span = horizontalSpans(plate.points, rowY).find(
          ([l, r]) => l <= x + icon && r >= x,
        );
        expect(span).toBeDefined();
        expect(x - span![0]).toBeGreaterThanOrEqual(2);
        expect(span![1] - (x + icon)).toBeGreaterThanOrEqual(2);
      }
      // The code shifts right to make room and still clears the outline.
      const code = button.querySelector('text.code')!;
      const codeRight =
        Number(code.getAttribute('x')) + BLUEPRINT_TYPE.code * 0.8;
      const codeRow = horizontalSpans(
        plate.points,
        Number(code.getAttribute('y')),
      ).find(([l, r]) => l <= x && r >= codeRight)!;
      expect(codeRow).toBeDefined();
      expect(codeRow[1] - codeRight).toBeGreaterThanOrEqual(2);
      document.body.innerHTML = '';
    }
  });

  it('keys the fill and the F / R plate sub-values in Title Case', () => {
    renderDiagram();
    const key = screen.getByTestId('armor-fill-key');
    expect(key).toHaveTextContent('Fill = Points of Max');
    expect(key).toHaveTextContent('F Front · R Rear');
    expect(key).not.toHaveTextContent(/Share|Height/);
  });
});
