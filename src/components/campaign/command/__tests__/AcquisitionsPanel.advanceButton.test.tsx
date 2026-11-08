/**
 * K13 PR3: the Acquisitions panel disables its advance button while a day
 * advance is in flight, and the button fires once when it is not.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AcquisitionsPanel } from '../AcquisitionsPanel';

function renderPanel(isAdvancing?: boolean) {
  const onAdvanceDay = jest.fn();
  render(
    <AcquisitionsPanel
      shoppingList={{ items: [] }}
      partsInventory={[]}
      currentDate={new Date('3025-01-01T00:00:00.000Z')}
      onAddRequest={jest.fn()}
      onRemoveRequest={jest.fn()}
      onAdvanceDay={onAdvanceDay}
      isAdvancing={isAdvancing}
    />,
  );
  return onAdvanceDay;
}

describe('AcquisitionsPanel advance button', () => {
  it('(B5) idle: fires once per click', async () => {
    const onAdvanceDay = renderPanel();

    await userEvent.click(screen.getByTestId('acquisitions-advance-day'));

    expect(onAdvanceDay).toHaveBeenCalledTimes(1);
  });

  it('(B6) advancing: disabled, and clicking fires nothing', async () => {
    const onAdvanceDay = renderPanel(true);

    expect(screen.getByTestId('acquisitions-advance-day')).toBeDisabled();
    await userEvent.click(screen.getByTestId('acquisitions-advance-day'));

    expect(onAdvanceDay).not.toHaveBeenCalled();
  });
});
