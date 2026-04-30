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
    });
  });
});
