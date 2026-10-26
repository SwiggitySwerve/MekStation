import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import {
  CleanTechDiagram,
  MegaMekDiagram,
  NeonOperatorDiagram,
  PremiumMaterialDiagram,
  TacticalHUDDiagram,
} from '..';
import { BipedArmorSurface } from '../BipedArmorSurface';
import { BIPED_ARMOR_VIEWBOX } from '../CleanTechBipedDiagram.geometry';

const components = [
  CleanTechDiagram,
  MegaMekDiagram,
  NeonOperatorDiagram,
  PremiumMaterialDiagram,
  TacticalHUDDiagram,
];
const armorData = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.LEFT_ARM, current: 5, maximum: 20 },
  { location: MechLocation.RIGHT_ARM, current: 10, maximum: 20 },
  {
    location: MechLocation.CENTER_TORSO,
    current: 1,
    maximum: 40,
    rear: 1,
    rearMaximum: 10,
  },
];

it('biped designs preserve geometry and status semantics while keeping distinct materials', () => {
  let baseline: unknown;
  const materials = new Set<string>();
  for (const Diagram of components) {
    const onLocationClick = jest.fn();
    const view = render(
      <Diagram
        armorData={armorData}
        selectedLocation={null}
        unallocatedPoints={0}
        onLocationClick={onLocationClick}
      />,
    );
    const paths = Array.from(
      view.container.querySelectorAll('path[data-armor-plate]'),
    );
    expect(paths).toHaveLength(8);
    const projection = paths.map((path) => ({
      location: path.getAttribute('data-armor-plate'),
      geometry: path.getAttribute('d'),
      status: path.getAttribute('data-armor-status'),
    }));
    baseline ??= projection;
    expect(projection).toEqual(baseline);
    const fill = paths[0].getAttribute('fill')!;
    const gradient = fill.startsWith('url(#')
      ? view.container.querySelector('[id="' + fill.slice(5, -1) + '"]')
      : null;
    materials.add(
      JSON.stringify(
        gradient
          ? Array.from(gradient.querySelectorAll('stop')).map((stop) => [
              stop.getAttribute('offset'),
              stop.getAttribute('stop-color'),
            ])
          : fill,
      ),
    );
    expect(
      view.container.querySelector(`svg[viewBox="${BIPED_ARMOR_VIEWBOX}"]`),
    ).toHaveClass('max-w-[360px]', '@[40rem]:max-w-[440px]');
    expect(
      projection.find((p) => p.location === MechLocation.HEAD)?.status,
    ).toBe(ARMOR_STATUS.HEALTHY.color);
    expect(
      projection.find((p) => p.location === MechLocation.LEFT_ARM)?.status,
    ).toBe(ARMOR_STATUS.LOW.color);
    expect(
      projection.find((p) => p.location === MechLocation.RIGHT_ARM)?.status,
    ).toBe(ARMOR_STATUS.MODERATE.color);
    expect(
      projection.find((p) => p.location === MechLocation.CENTER_TORSO)?.status,
    ).toBe(ARMOR_STATUS.CRITICAL.color);
    for (const location of Object.values(MechLocation).filter((location) =>
      projection.some((p) => p.location === location),
    )) {
      const region = view.getByRole('button', {
        name: new RegExp(`^${location} armor:`),
      });
      fireEvent.keyDown(region, { key: 'Enter' });
      expect(onLocationClick).toHaveBeenLastCalledWith(location);
    }
    view.unmount();
  }
  expect(materials.size).toBe(5);
});

it.each([
  'clean-tech',
  'neon-operator',
  'tactical-hud',
  'premium-material',
] as const)('%s renders a real half-capacity fill boundary', (variant) => {
  const view = render(
    <svg>
      <BipedArmorSurface
        path="M0 0 H20 V40 H0 Z"
        variant={variant}
        current={5}
        maximum={10}
      />
    </svg>,
  );

  const fill = view.container.querySelector('[data-armor-fill]');
  expect(fill).not.toBeNull();
  expect(fill).toHaveAttribute('data-armor-fill-ratio', '0.5');
  expect(fill).toHaveAttribute('fill', expect.stringContaining('url(#'));

  const fillReference = fill!.getAttribute('fill')!;
  const gradient = view.container.querySelector(
    '[id="' + fillReference.slice(5, -1) + '"]',
  );
  const offsets = Array.from(gradient!.querySelectorAll('stop')).map((stop) =>
    stop.getAttribute('offset'),
  );
  expect(offsets).toContain('0.5');
});

it.each([
  ['empty', 0, 10, 1],
  ['half', 5, 10, 0.5],
  ['full', 10, 10, 0],
  ['over capacity', 15, 10, 0],
  ['zero maximum', 5, 0, 1],
])('clamps all active styles at $s', (_state, current, maximum, boundary) => {
  for (const variant of [
    'clean-tech',
    'neon-operator',
    'tactical-hud',
    'premium-material',
  ] as const) {
    const view = render(
      <svg>
        <BipedArmorSurface
          path="M0 0 H20 V40 H0 Z"
          variant={variant}
          current={current}
          maximum={maximum}
        />
      </svg>,
    );
    const fill = view.container.querySelector('[data-armor-fill]')!;
    expect(fill).toHaveAttribute('data-armor-fill-ratio', String(1 - boundary));
    const reference = fill.getAttribute('fill')!;
    const gradient = view.container.querySelector(
      '[id="' + reference.slice(5, -1) + '"]',
    );
    const stops = gradient!.querySelectorAll('stop');
    expect(stops[1]).toHaveAttribute('offset', String(boundary));
    expect(stops[2]).toHaveAttribute('offset', String(boundary));
    view.unmount();
  }
});

it.each([null, MechLocation.HEAD])(
  'renders one text child per SVG title with selected location %s',
  (selectedLocation) => {
    for (const Diagram of components) {
      const view = render(
        <Diagram
          armorData={armorData}
          selectedLocation={selectedLocation}
          unallocatedPoints={0}
          onLocationClick={jest.fn()}
        />,
      );
      const titles = view.container.querySelectorAll('svg title');
      expect(titles).toHaveLength(8);
      for (const title of titles) {
        expect(title.childNodes).toHaveLength(1);
        expect(title.firstChild?.nodeType).toBe(Node.TEXT_NODE);
      }
      expect(titles[0]).toHaveTextContent(
        selectedLocation === MechLocation.HEAD ? 'Head — selected' : 'Head',
      );
      view.unmount();
    }
  },
);
