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
      rosterMode: 'preset',
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
      rosterMode: 'preset',
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
        rosterMode: 'preset',
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

  it('submits custom per-seat unit and pilot bootstrap', async () => {
    const onSubmit = jest.fn();
    render(<CreateMatchForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText('Custom'));
    fireEvent.change(screen.getByLabelText('Alpha #1 unit'), {
      target: { value: 'awesome-aws-8q' },
    });
    fireEvent.change(screen.getByLabelText('Alpha #1 pilot'), {
      target: { value: 'Morgan Kell' },
    });
    fireEvent.change(screen.getByLabelText('Alpha #1 gunnery'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Alpha #1 piloting'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('Bravo #1 unit'), {
      target: { value: 'locust-lct-1v' },
    });
    fireEvent.change(screen.getByLabelText('Bravo #1 pilot'), {
      target: { value: 'Natasha Kerensky' },
    });
    fireEvent.change(screen.getByLabelText('Bravo #1 gunnery'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Bravo #1 piloting'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        rosterMode: 'custom',
        rosterPresetId: 'assault-vs-heavy',
        unitBootstrap: expect.arrayContaining([
          expect.objectContaining({
            unitId: 'alpha-1-awesome-aws-8q',
            unitRef: 'awesome-aws-8q',
            side: 'player',
            pilotRef: 'Morgan Kell',
            gunnery: 3,
            piloting: 4,
          }),
          expect.objectContaining({
            unitId: 'bravo-1-locust-lct-1v',
            unitRef: 'locust-lct-1v',
            side: 'opponent',
            pilotRef: 'Natasha Kerensky',
            gunnery: 2,
            piloting: 3,
          }),
        ]),
      }),
    );
  });
});
