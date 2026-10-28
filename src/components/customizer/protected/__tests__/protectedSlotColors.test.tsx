/**
 * Guard for the protected critical-slot colours. Expectations come from
 * `protectedSlotColors.ts`; do not retype them here.
 */
import { render, screen, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import type { SlotContent } from '@/components/customizer/critical-slots/criticalSlotTypes';

import { LocationGrid } from '@/components/customizer/critical-slots/LocationGrid';
import { ColorLegend } from '@/components/customizer/shared/ColorLegend';
import { MechLocation } from '@/types/construction';
import { EquipmentCategory } from '@/types/equipment';
import {
  classifyEquipmentByName,
  detectAmmoSubType,
  getAmmoColors,
  getCategoryAccentClass,
  getCategoryLabel,
  getEquipmentAccentClasses,
  HEATSINK_COLORS,
} from '@/utils/colors/equipmentColors';
import {
  classifySystemComponent,
  getSlotColorClasses,
} from '@/utils/colors/slotColors';
import { SLOT_FILLS } from '@/utils/colors/slotFills';

import { PROTECTED_SLOT_COLORS } from '../protectedSlotColors';

const { tint, fixedSystems, equipment, fills, ammo, heatSink, decisions } =
  PROTECTED_SLOT_COLORS;
type FixedFamily = keyof typeof fixedSystems;
type Hue = keyof typeof fills;

/** The hue token inside an owner accent class such as `border-l-red-500/70`. */
const hueOf = (classes: string): string | undefined =>
  /border-l-([a-z]+-\d+)/.exec(classes)?.[1];
const slotColor = (token: string) => `var(--color-${token})`;

/** OKLab distance x100 between two `oklch(L C h)` fills. */
function fillDistance(first: string, second: string): number {
  const lab = (fill: string) => {
    const [l, c, h] = fill.match(/[\d.]+/g)!.map(Number);
    const radians = (h * Math.PI) / 180;
    return [l, c * Math.cos(radians), c * Math.sin(radians)];
  };
  const [a, b] = [lab(first), lab(second)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100;
}

/** The hue a slot with this equipment name should carry. */
function expectedHue(name: string): Hue {
  const category = classifyEquipmentByName(name);
  if (category !== EquipmentCategory.AMMUNITION) return equipment[category];
  const subType = detectAmmoSubType(name);
  return subType === 'generic' ? equipment[category] : ammo[subType];
}

describe('protected slot colour registry', () => {
  it('records who approved it and why', () => {
    expect(decisions.length).toBeGreaterThan(0);
    for (const decision of decisions) {
      expect(decision.approvedBy).toBe('Wes');
      expect(decision.decision).not.toBe('');
      expect(decision.source).not.toBe('');
    }
  });

  it('keeps engine, gyro, actuator and cockpit hues distinct', () => {
    const { engine, gyro, actuator, cockpit } = fixedSystems;
    expect(new Set([engine, gyro, actuator, cockpit]).size).toBe(4);
  });

  it('gives every protected hue a fill', () => {
    for (const hue of [
      ...Object.values(fixedSystems),
      ...Object.values(equipment),
      ammo.missile,
      ammo.ballistic,
    ])
      expect(fills[hue as Hue]).toMatch(/^oklch\(/);
  });

  // Capital weapons never mount on a 'Mech, so they never share its grid.
  // Ammunition carries stripes, so a close fill is still told apart; every
  // other pair, heat sinks included, must differ by colour alone.
  it("keeps unpatterned fills that can share a 'Mech's grid at least 6 OKLab units apart", () => {
    const shared = [
      ...new Set([
        ...Object.values(fixedSystems),
        ...Object.values(equipment).filter(
          (hue) =>
            hue !== equipment[EquipmentCategory.CAPITAL_WEAPON] &&
            hue !== equipment[EquipmentCategory.AMMUNITION],
        ),
      ]),
    ] as Hue[];
    const close = shared.flatMap((first, index) =>
      shared
        .slice(index + 1)
        .filter((second) => fillDistance(fills[first], fills[second]) < 6)
        .map((second) => `${first}~${second}`),
    );
    expect(close).toEqual([]);
  });

  // Ammunition is striped, but a solid heat sink beside a bin must still differ in fill.
  it('keeps heat-sink fills at least 6 OKLab units from every ammunition fill', () => {
    for (const hue of [
      ammo.missile,
      ammo.ballistic,
      equipment[EquipmentCategory.AMMUNITION],
    ])
      expect(
        fillDistance(fills[equipment.heatsink], fills[hue as Hue]),
      ).toBeGreaterThanOrEqual(6);
  });
});

describe('colour owners produce exactly the protected hues', () => {
  it.each(Object.entries(fixedSystems))('slotColors.ts %s', (family, hue) => {
    expect(hueOf(getSlotColorClasses(family as FixedFamily))).toBe(hue);
  });

  it.each(Object.values(EquipmentCategory))(
    'equipmentColors.ts %s',
    (category) => {
      expect(hueOf(getCategoryAccentClass(category))).toBe(equipment[category]);
    },
  );

  it('equipmentColors.ts heat sinks', () => {
    expect(hueOf(HEATSINK_COLORS.accentBorder)).toBe(equipment.heatsink);
    expect(HEATSINK_COLORS.label).toBe(heatSink.label);
  });

  it('equipmentColors.ts stripes every ammunition bar, and only ammunition', () => {
    expect(
      getEquipmentAccentClasses(EquipmentCategory.AMMUNITION, 'AC/20 Ammo'),
    ).toContain(ammo.edgeClass);
    expect(
      getEquipmentAccentClasses(EquipmentCategory.BALLISTIC_WEAPON, 'AC/20'),
    ).not.toContain(ammo.edgeClass);
  });

  it('equipmentColors.ammo.ts gives ammunition its weapon type hue', () => {
    expect(hueOf(getAmmoColors('LRM 20 Ammo').accentBorder)).toBe(ammo.missile);
    expect(hueOf(getAmmoColors('AC/20 Ammo').accentBorder)).toBe(
      ammo.ballistic,
    );
  });

  it('slotFills.ts holds exactly the protected fills', () => {
    expect(SLOT_FILLS).toEqual(fills);
  });
});

const ac20: SlotContent[] = Array.from({ length: 10 }, (_, index) => ({
  index,
  type: 'equipment',
  name: 'AC/20',
  equipmentId: 'ac20',
  totalSlots: 10,
  isFirstSlot: index === 0,
  isLastSlot: index === 9,
}));
const lrm20: SlotContent[] = Array.from({ length: 5 }, (_, index) => ({
  index,
  type: 'equipment',
  name: 'LRM 20',
  equipmentId: 'lrm20',
  totalSlots: 5,
  isFirstSlot: index === 0,
  isLastSlot: index === 4,
}));
const single = (index: number, name: string): SlotContent => ({
  index,
  type: 'equipment',
  name,
  equipmentId: `${name}-${index}`,
  totalSlots: 1,
  isFirstSlot: true,
  isLastSlot: true,
});
const fixed = (names: string[]): SlotContent[] =>
  names.map((name, index) => ({ index, type: 'system', name }));

const locations: [MechLocation, SlotContent[]][] = [
  [
    MechLocation.RIGHT_TORSO,
    [...ac20, single(10, 'Medium Laser'), single(11, 'Heat Sink')],
  ],
  [MechLocation.RIGHT_ARM, [single(0, 'AC/20 Ammo')]],
  [MechLocation.LEFT_TORSO, [...lrm20, single(5, 'LRM 20 Ammo')]],
  [
    MechLocation.CENTER_TORSO,
    fixed(['Engine', 'Engine', 'Engine', 'Standard Gyro', 'Standard Gyro']),
  ],
  [MechLocation.HEAD, fixed(['Life Support', 'Sensors', 'Standard Cockpit'])],
  [
    MechLocation.LEFT_ARM,
    fixed(['Shoulder', 'Upper Arm', 'Lower Arm', 'Hand']),
  ],
];

function renderLocations(): void {
  render(
    <>
      {locations.map(([location, slots]) => (
        <LocationGrid
          key={location}
          location={location}
          data={{ location, slots, entries: [], isSuperheavy: false }}
          assignableSlots={[]}
          onSlotClick={jest.fn()}
          onEquipmentDrop={jest.fn()}
          onEquipmentRemove={jest.fn()}
        />
      ))}
    </>,
  );
}

function occupiedRows(): { name: string; cell: HTMLElement }[] {
  return screen
    .getAllByRole('gridcell', { name: /^Slot \d+: / })
    .map((cell) => ({
      name: cell.getAttribute('aria-label')!.replace(/^Slot \d+: /, ''),
      cell,
    }));
}

/** The row is filled, and its bar coloured, in exactly the approved hue. */
function expectTinted(cell: HTMLElement, hue: string): void {
  expect(cell).toHaveClass(tint.className);
  expect(cell.style.getPropertyValue(tint.colorVar)).toBe(slotColor(hue));
  expect(cell.style.getPropertyValue(tint.fillVar)).toBe(fills[hue as Hue]);
  expect(cell.style.backgroundColor).toBe('');
}

describe('critical slot rows apply the protected hues', () => {
  it('tints every equipment row, including every merged row, in its category hue', () => {
    renderLocations();
    const rows = occupiedRows().filter(({ name }) =>
      [
        'AC/20',
        'AC/20 Ammo',
        'LRM 20',
        'LRM 20 Ammo',
        'Medium Laser',
        'Heat Sink',
      ].includes(name),
    );
    expect(rows.filter(({ name }) => name === 'AC/20')).toHaveLength(10);
    expect(rows.filter(({ name }) => name === 'LRM 20')).toHaveLength(5);
    for (const { name, cell } of rows) expectTinted(cell, expectedHue(name));
  });

  it('marks ammunition, and only ammunition, with stripes in its weapon hue', () => {
    renderLocations();
    for (const { name, cell } of occupiedRows()) {
      const isAmmo =
        classifyEquipmentByName(name) === EquipmentCategory.AMMUNITION;
      expect(cell.classList.contains(ammo.patternClass)).toBe(isAmmo);
      expect(cell.classList.contains(ammo.edgeClass)).toBe(isAmmo);
    }
    expect(
      screen
        .getByRole('gridcell', { name: /: LRM 20 Ammo$/ })
        .style.getPropertyValue(tint.colorVar),
    ).toBe(slotColor(ammo.missile));
    expect(
      screen
        .getByRole('gridcell', { name: /: AC\/20 Ammo$/ })
        .style.getPropertyValue(tint.colorVar),
    ).toBe(slotColor(ammo.ballistic));
  });

  it('fills heat sinks solid, with no pattern', () => {
    renderLocations();
    const heatSinkCell = screen.getByRole('gridcell', {
      name: `Slot 12: ${heatSink.label}`,
    });
    expect(heatSinkCell.className).not.toMatch(/HeatSink|criticalAmmo/);
    expect(heatSinkCell.style.getPropertyValue(tint.colorVar)).toBe(
      slotColor(equipment.heatsink),
    );
    expect(
      screen.getByRole('gridcell', { name: `Slot 12: ${heatSink.label}` }),
    ).toHaveTextContent(heatSink.label);
  });

  it('tints each fixed-system family in its own hue', () => {
    renderLocations();
    const hueOfFamily = new Map<string, string>();
    for (const { name, cell } of occupiedRows()) {
      const family = classifySystemComponent(name);
      if (!(family in fixedSystems)) continue;
      const hue = fixedSystems[family as FixedFamily];
      expectTinted(cell, hue);
      hueOfFamily.set(family, hue);
    }
    expect([...hueOfFamily.keys()].sort()).toEqual(
      Object.keys(fixedSystems).sort(),
    );
    const rendered = (name: string) =>
      screen
        .getAllByRole('gridcell', { name: new RegExp(`: ${name}$`) })[0]
        .style.getPropertyValue(tint.colorVar);
    expect(rendered('Engine')).not.toBe(rendered('Standard Gyro'));
    expect(rendered('Standard Gyro')).not.toBe(rendered('Shoulder'));
    expect(rendered('Engine')).not.toBe(rendered('Shoulder'));
  });

  it('colours legend chips with the same hue as the slots', () => {
    render(
      <ColorLegend
        equipmentNames={[
          'Medium Laser',
          'AC/20',
          'LRM 20',
          'LRM 20 Ammo',
          'Heat Sink',
        ]}
      />,
    );
    const key = screen.getByRole('group', { name: 'Colour key' });
    const chip = (label: string) =>
      within(key).getByText(label, { exact: true })
        .previousElementSibling as HTMLElement;
    for (const category of [
      EquipmentCategory.ENERGY_WEAPON,
      EquipmentCategory.BALLISTIC_WEAPON,
      EquipmentCategory.MISSILE_WEAPON,
    ])
      expectTinted(chip(getCategoryLabel(category)), equipment[category]);
    expectTinted(chip(heatSink.label), equipment.heatsink);
    expect(chip(heatSink.label).className).not.toMatch(/HeatSink|criticalAmmo/);
    expectTinted(chip(ammo.keyLabel), equipment[EquipmentCategory.AMMUNITION]);
    expect(chip(ammo.keyLabel)).toHaveClass(ammo.patternClass);
    for (const [label, family] of [
      ['Engine', 'engine'],
      ['Gyro', 'gyro'],
      ['Actuators', 'actuator'],
      ['Cockpit / Life Support / Sensors', 'cockpit'],
    ] as const)
      expectTinted(chip(label), fixedSystems[family]);
    expect(within(key).queryByText('Fixed Systems')).not.toBeInTheDocument();
  });
});

describe('slot-row CSS draws the approved tint and nothing overrides it', () => {
  const css = fs
    .readFileSync(
      path.resolve(__dirname, '../../CustomizerWorkbench.module.css'),
      'utf8',
    )
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    ([, selector, body]) => ({
      selectors: selector.split(',').map((part) => part.trim()),
      body: body.replace(/\s+/g, ' '),
    }),
  );
  const ruleFor = (selector: string) =>
    rules.find(({ selectors }) => selectors.includes(selector))?.body ?? '';
  const colorVar = `var(${tint.colorVar})`;
  const fillVar = `var(${tint.fillVar})`;
  const COLOUR_PROPERTIES =
    /(?:^|[;\s])(background|background-color|color|border|border-color|border-style|border-width|border-left(?:-color|-width|-style)?|border-inline(?:-start)?(?:-color|-width|-style)?)\s*:/;

  it('fills with the hue fill and a full-hue bar, independent of the theme surface', () => {
    const rest = ruleFor(`.${tint.className}`);
    const hover = ruleFor(`.${tint.className}:hover`);
    expect(rest).toContain(`background-color: ${fillVar}`);
    expect(rest).toContain(`border-left: ${tint.barWidth} solid ${colorVar}`);
    expect(rest).toContain('color: var(--text-primary)');
    expect(hover).toContain(tint.hoverOverlay);
    expect(`${rest} ${hover}`).not.toMatch(/--surface-|color-mix/);
  });

  it('declares no other row-level colour or left border on slot-row classes', () => {
    renderLocations();
    const rowClasses = new Set(
      screen
        .getAllByRole('gridcell')
        .flatMap((cell) => [...cell.classList])
        .filter((name) => /^critical[A-Z]/.test(name)),
    );
    expect(rowClasses.has(tint.className)).toBe(true);
    const offending = rules.flatMap(({ selectors, body }) =>
      selectors.filter((selector) => {
        const subject = selector.split(/\s*[\s>+~]\s*/).pop()!;
        if (subject.includes('::')) return false;
        if (subject.replace(/:hover$/, '') === `.${tint.className}`)
          return false;
        const targetsRow =
          subject.includes("[role='gridcell']") ||
          [...rowClasses].some((name) =>
            new RegExp(`\\.${name}(?![\\w-])`).test(subject),
          );
        return targetsRow && COLOUR_PROPERTIES.test(body);
      }),
    );
    expect(offending).toEqual([]);
  });

  it.each([ammo.patternClass])(
    'draws the %s pattern in the slot hue, never grey',
    (className) => {
      const pattern = ruleFor(`.${className}`);
      expect(pattern).toContain(colorVar);
      expect(pattern).not.toMatch(/surface-|text-|grey|gray|slate/);
    },
  );
});
