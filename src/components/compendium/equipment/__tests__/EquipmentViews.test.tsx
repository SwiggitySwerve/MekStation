import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import {
  EquipmentGridView,
  EquipmentListView,
  EquipmentTableView,
  type EquipmentEntry,
} from '../EquipmentViews';

const mediumLaser: EquipmentEntry = {
  id: 'medium-laser',
  name: 'Medium Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  damage: 5,
  heat: 3,
};

describe('EquipmentViews links', () => {
  it('renders the table name cell as a detail anchor', () => {
    render(<EquipmentTableView equipment={[mediumLaser]} />);

    const link = screen.getByRole('link', {
      name: /open medium laser equipment details/i,
    });
    expect(link).toHaveAttribute('href', '/compendium/equipment/medium-laser');
    expect(link).toHaveAttribute(
      'data-testid',
      'equipment-table-link-medium-laser',
    );
  });

  it('activates the table detail link from the keyboard', async () => {
    const user = userEvent.setup();
    render(<EquipmentTableView equipment={[mediumLaser]} />);

    const link = screen.getByRole('link', {
      name: /open medium laser equipment details/i,
    });
    const clickSpy = jest.fn();
    link.addEventListener('click', (event) => {
      event.preventDefault();
      clickSpy();
    });

    link.focus();
    await user.keyboard('{Enter}');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps grid and list cards as detail anchors', () => {
    const { rerender } = render(
      <EquipmentGridView equipment={[mediumLaser]} />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/compendium/equipment/medium-laser',
    );

    rerender(<EquipmentListView equipment={[mediumLaser]} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/compendium/equipment/medium-laser',
    );
  });
});
