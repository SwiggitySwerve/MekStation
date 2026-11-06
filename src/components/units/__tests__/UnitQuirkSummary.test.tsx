import { render, screen, within } from '@testing-library/react';

import type { IUnitContract } from '@/types/contracts';

import { QUIRK_SUMMARY_UNITS } from '@/__tests__/fixtures/quirkSummaryUnits';
import { UnitQuirkSummary } from '@/components/units/UnitQuirkSummary';

const emptyMaps: IUnitContract['weaponQuirks'][] = [
  undefined,
  {},
  { 'NOS:0:Empty': [] },
];

describe('read-only unit quirk summary', () => {
  it.each(QUIRK_SUMMARY_UNITS)(
    'preserves the committed $label source locators ($family)',
    ({ unit }) => {
      render(<UnitQuirkSummary weaponQuirks={unit.weaponQuirks} />);

      const rows = within(
        screen.getByRole('list', { name: 'Weapon quirks' }),
      ).getAllByRole('listitem');
      expect(rows.map((row) => row.textContent)).toEqual(
        Object.entries(unit.weaponQuirks).map(
          ([locator, quirks]) => locator + quirks.join(''),
        ),
      );
    },
  );

  it('retains raw unknown IDs and repeats under distinct and legacy locators', () => {
    render(
      <UnitQuirkSummary
        quirks={['unknown_unit', 'unknown_unit']}
        weaponQuirks={{
          'NOS:1:Unknown:Weapon': ['unknown_weapon', 'unknown_weapon'],
          'NOS:0:Unknown:Weapon': ['unknown_weapon'],
          'Legacy Weapon Name': ['legacy_quirk'],
        }}
      />,
    );

    expect(screen.getAllByText('unknown_unit')).toHaveLength(2);
    expect(screen.getAllByText('unknown_weapon')).toHaveLength(3);
    const rows = within(
      screen.getByRole('list', { name: 'Weapon quirks' }),
    ).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'NOS:1:Unknown:Weaponunknown_weaponunknown_weapon',
      'NOS:0:Unknown:Weaponunknown_weapon',
      'Legacy Weapon Namelegacy_quirk',
    ]);
  });

  it.each(emptyMaps)(
    'hides a summary with no unit or weapon quirks (%s)',
    (weaponQuirks) => {
      const { container } = render(
        <UnitQuirkSummary quirks={[]} weaponQuirks={weaponQuirks} />,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('wraps long source locators and weapon IDs without changing their text', () => {
    const locator = `NOS:0:${'LongWeapon'.repeat(30)}`;
    const id = 'unknown_quirk'.repeat(30);
    render(<UnitQuirkSummary weaponQuirks={{ [locator]: [id] }} />);

    expect(screen.getByText(locator)).toHaveClass('[overflow-wrap:anywhere]');
    expect(screen.getByText(id)).toHaveClass('whitespace-normal!');
  });
});
