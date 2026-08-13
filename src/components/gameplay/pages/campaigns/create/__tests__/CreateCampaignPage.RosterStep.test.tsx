import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { RosterStep } from '../CreateCampaignPage.RosterStep';

const noop = (): void => {};

describe('CreateCampaignPage RosterStep', () => {
  it('shows representative unit names and passes unitRef when adding a template unit', async () => {
    const onAddTemplateUnit = jest.fn();

    render(
      <RosterStep
        selectedUnits={[]}
        selectedPilots={[]}
        pilotAssignments={{}}
        onAddTemplateUnit={onAddTemplateUnit}
        onRemoveUnit={noop}
        onAddPilot={noop}
        onRemovePilot={noop}
        onAssignPilot={noop}
        loadSavedDesignIndex={async () => []}
      />,
    );

    expect(screen.getByText('Light - Locust LCT-1V')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('add-unit-light-mech'));

    expect(onAddTemplateUnit).toHaveBeenCalledWith(
      'Locust LCT-1V',
      25,
      'locust-lct-1v',
    );
    await screen.findByRole('status');
  });

  it('loads saved designs with custom source, status, retry, and named groups', async () => {
    const onAddTemplateUnit = jest.fn();
    let fail = true;
    render(
      <RosterStep
        selectedUnits={[]}
        selectedPilots={[]}
        pilotAssignments={{}}
        onAddTemplateUnit={onAddTemplateUnit}
        onRemoveUnit={noop}
        onAddPilot={noop}
        onRemovePilot={noop}
        onAssignPilot={noop}
        loadSavedDesignIndex={async () => {
          if (fail) throw new Error('unavailable');
          return [
            {
              id: 'custom-whm-6r-saved',
              name: 'Warhammer WHM-6R Custom',
              tonnage: 70,
              unitType: UnitType.BATTLEMECH,
            },
            { id: '', name: 'Broken', tonnage: 70, unitType: UnitType.BATTLEMECH },
          ];
        }}
      />,
    );
    expect(await screen.findByText('Saved designs unavailable')).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-unit-light-mech'));
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved designs' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Add saved design Warhammer WHM-6R Custom',
      }),
    );
    expect(onAddTemplateUnit).toHaveBeenNthCalledWith(
      1,
      'Locust LCT-1V',
      25,
      'locust-lct-1v',
    );
    expect(onAddTemplateUnit).toHaveBeenNthCalledWith(
      2,
      'Warhammer WHM-6R Custom',
      70,
      'custom-whm-6r-saved',
      'custom',
    );
    expect(screen.getByText('Stock Templates')).toBeTruthy();
    expect(screen.getByText('1 saved designs unavailable')).toBeTruthy();
  });
});
