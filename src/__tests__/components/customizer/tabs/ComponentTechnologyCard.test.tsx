import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { ComponentTechnologyCard } from '@/components/customizer/tabs/overview/ComponentTechnologyCard';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

function renderCard(
  props: Partial<React.ComponentProps<typeof ComponentTechnologyCard>> = {},
) {
  const store = createNewUnitStore({
    name: 'Tech card',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  return render(
    <UnitStoreContext.Provider value={store}>
      <ComponentTechnologyCard readOnly={false} {...props} />
    </UnitStoreContext.Provider>,
  );
}

describe('ComponentTechnologyCard', () => {
  it('says where the values are set under the card title', () => {
    renderCard();

    expect(
      screen.getByTestId('overview-component-tech-help'),
    ).toHaveTextContent('Set in Structure, Armor and Equipment.');
  });

  it('drops the tech base editor hint when read-only', () => {
    renderCard({ readOnly: true });

    expect(
      screen.getByTestId('overview-component-tech-help'),
    ).toHaveTextContent('Set in Structure, Armor and Equipment.');
  });

  it('links each value to the tab that changes it', () => {
    const onNavigate = jest.fn();
    renderCard({ onNavigate });
    const card = screen.getByTestId('overview-component-technology');

    const structureRows = [
      'Internal Structure',
      'Gyro',
      'Engine',
      'Heat Sinks',
      'Myomer',
    ];
    for (const label of structureRows) {
      fireEvent.click(
        within(card).getByRole('button', {
          name: new RegExp(`^${label}: .*Change in Structure$`),
        }),
      );
    }
    expect(onNavigate.mock.calls).toEqual(
      structureRows.map(() => ['structure']),
    );

    onNavigate.mockClear();
    fireEvent.click(
      within(card).getByRole('button', {
        name: /^Armor: .*Change in Armor$/,
      }),
    );
    expect(onNavigate).toHaveBeenCalledWith('armor');
  });

  it('links every "None" value to the tab that changes it', () => {
    const onNavigate = jest.fn();
    renderCard({ onNavigate });
    const card = screen.getByTestId('overview-component-technology');
    const rows = Array.from(card.querySelectorAll('dl > div'));
    const noneRows = rows.filter(
      (row) => row.querySelector('dd')?.textContent?.trim() === 'None',
    );

    // Movement Enhancement and Targeting Computer both default to None.
    expect(noneRows.length).toBeGreaterThanOrEqual(2);
    for (const row of noneRows) {
      // The "Go to" treatment: a trailing chevron, no underline.
      const link = row.querySelector('dd button');
      expect(link).not.toHaveClass('underline', 'decoration-dotted');
      expect(
        link?.querySelector('[data-icon-name="chevron-right"]'),
      ).not.toBeNull();
      expect(link).toHaveTextContent('None');
    }
    fireEvent.click(
      within(card).getByRole('button', { name: /^Movement Enhancement/ }),
    );
    expect(onNavigate).toHaveBeenLastCalledWith('structure');
    fireEvent.click(
      within(card).getByRole('button', { name: /^Targeting Computer/ }),
    );
    expect(onNavigate).toHaveBeenLastCalledWith('equipment');
  });

  it('keeps the visible value as the link text for selections and None', () => {
    renderCard({ onNavigate: jest.fn() });
    const card = screen.getByTestId('overview-component-technology');

    expect(
      within(card).getByRole('button', { name: /^Engine: / }),
    ).toHaveTextContent(/^Standard Fusion \d+$/);
    expect(
      within(card).getByRole('button', { name: /^Targeting Computer/ }),
    ).toHaveTextContent('None');
    expect(
      within(card.querySelector('dl') as HTMLElement).getByText(
        'Targeting Computer',
      ),
    ).toBeInTheDocument();
  });

  it('renders plain values when there is nowhere to navigate', () => {
    renderCard();
    const card = screen.getByTestId('overview-component-technology');

    expect(
      within(card).queryByRole('button', { name: /Change in/ }),
    ).not.toBeInTheDocument();
    expect(
      within(card.querySelector('dl') as HTMLElement).getByText(
        /^Standard Fusion \d+$/,
      ),
    ).toBeInTheDocument();
  });
});
