import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CreateMatchForm } from '../CreateMatchForm';

describe('CreateMatchForm', () => {
  it('submits fog disabled by default', async () => {
    const onSubmit = jest.fn();
    render(<CreateMatchForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create match' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      layout: '1v1',
      displayName: 'MechWarrior',
      mapRadius: 8,
      turnLimit: 20,
      fogOfWar: false,
      rosterPresetId: 'assault-vs-heavy',
      unitBootstrap: expect.arrayContaining([
        expect.objectContaining({
          unitId: 'player-1-atlas-as7-d',
          unitRef: 'atlas-as7-d',
          side: 'player',
        }),
        expect.objectContaining({
          unitId: 'opponent-1-marauder-mad-3r',
          unitRef: 'marauder-mad-3r',
          side: 'opponent',
        }),
      ]),
    });
  });

  it('submits fog enabled when double-blind is selected', async () => {
    const onSubmit = jest.fn();
    render(<CreateMatchForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText('Double-blind (fog of war)'));
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      layout: '1v1',
      displayName: 'MechWarrior',
      mapRadius: 8,
      turnLimit: 20,
      fogOfWar: true,
      rosterPresetId: 'assault-vs-heavy',
      unitBootstrap: expect.any(Array),
    });
  });

  it('submits the selected roster preset as explicit match bootstrap', async () => {
    const onSubmit = jest.fn();
    render(<CreateMatchForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Unit roster preset'), {
      target: { value: 'atlas-mirror' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        rosterPresetId: 'atlas-mirror',
        unitBootstrap: expect.arrayContaining([
          expect.objectContaining({
            unitId: 'player-1-atlas-as7-d',
            unitRef: 'atlas-as7-d',
            side: 'player',
          }),
          expect.objectContaining({
            unitId: 'opponent-1-atlas-as7-d',
            unitRef: 'atlas-as7-d',
            side: 'opponent',
          }),
        ]),
      }),
    );
  });
});
