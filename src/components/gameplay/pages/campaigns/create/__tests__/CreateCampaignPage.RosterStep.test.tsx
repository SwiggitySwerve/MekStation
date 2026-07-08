import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RosterStep } from '../CreateCampaignPage.RosterStep';

const noop = (): void => {};

describe('CreateCampaignPage RosterStep', () => {
  it('shows representative unit names and passes unitRef when adding a template unit', () => {
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
      />,
    );

    expect(screen.getByText('Light - Locust LCT-1V')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('add-unit-light-mech'));

    expect(onAddTemplateUnit).toHaveBeenCalledWith(
      'Locust LCT-1V',
      25,
      'locust-lct-1v',
    );
  });
});
