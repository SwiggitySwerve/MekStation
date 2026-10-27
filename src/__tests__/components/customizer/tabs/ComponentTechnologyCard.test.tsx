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
    ).toHaveTextContent(
      'Set in Structure and Armor; change the tech base below.',
    );
  });

  it('drops the tech base editor hint when read-only', () => {
    renderCard({ readOnly: true });

    expect(
      screen.getByTestId('overview-component-tech-help'),
    ).toHaveTextContent('Set in Structure and Armor.');
  });

  it('links each value to the tab that changes it', () => {
    const onNavigate = jest.fn();
    renderCard({ onNavigate });
    const card = screen.getByTestId('overview-component-technology');

    const structureRows = [
      'Internal structure',
      'Gyro',
      'Engine',
      'Heat sinks',
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

  it('renders every "None" value as plain text, never a link', () => {
    renderCard({ onNavigate: jest.fn() });
    const card = screen.getByTestId('overview-component-technology');
    const rows = Array.from(card.querySelectorAll('dl > div'));
    const noneRows = rows.filter(
      (row) => row.querySelector('dd')?.textContent?.trim() === 'None',
    );

    // Movement enhancement and Targeting computer both default to None.
    expect(noneRows.length).toBeGreaterThanOrEqual(2);
    for (const row of noneRows) {
      expect(row.querySelector('button')).toBeNull();
      expect(row.querySelector('dd span')).toHaveTextContent('None');
    }
    expect(
      within(card).queryByRole('button', { name: /^Movement enhancement/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps the visible value as the link text and leaves targeting plain', () => {
    renderCard({ onNavigate: jest.fn() });
    const card = screen.getByTestId('overview-component-technology');

    expect(
      within(card).getByRole('button', { name: /^Engine: / }),
    ).toHaveTextContent(/^Standard Fusion \d+$/);
    expect(
      within(card).queryByRole('button', { name: /^Targeting computer/ }),
    ).not.toBeInTheDocument();
    expect(
      within(card.querySelector('dl') as HTMLElement).getByText(
        'Targeting computer',
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
