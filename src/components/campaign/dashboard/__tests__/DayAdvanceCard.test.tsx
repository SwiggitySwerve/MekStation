/**
 * K13 PR3: the Day Advance card disables both buttons while a day advance is
 * in flight, and each fires once when it is not.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DayAdvanceCard } from '../CampaignDashboardActivityCards';

const summary = {
  currentDay: 0,
  currentDate: new Date('3025-01-01T00:00:00.000Z'),
  pendingEventPreview: null,
};

describe('DayAdvanceCard', () => {
  it('(B1) idle: each button fires its handler once per click', async () => {
    const onAdvanceDay = jest.fn();
    const onAdvanceWeek = jest.fn();
    render(
      <DayAdvanceCard
        summary={summary}
        onAdvanceDay={onAdvanceDay}
        onAdvanceWeek={onAdvanceWeek}
      />,
    );

    await userEvent.click(screen.getByTestId('day-advance-one-day'));
    await userEvent.click(screen.getByTestId('day-advance-one-week'));

    expect(onAdvanceDay).toHaveBeenCalledTimes(1);
    expect(onAdvanceWeek).toHaveBeenCalledTimes(1);
  });

  it('(B2) advancing: both buttons are disabled and clicking fires nothing', async () => {
    const onAdvanceDay = jest.fn();
    const onAdvanceWeek = jest.fn();
    render(
      <DayAdvanceCard
        summary={summary}
        onAdvanceDay={onAdvanceDay}
        onAdvanceWeek={onAdvanceWeek}
        isAdvancing
      />,
    );

    expect(screen.getByTestId('day-advance-one-day')).toBeDisabled();
    expect(screen.getByTestId('day-advance-one-week')).toBeDisabled();
    await userEvent.click(screen.getByTestId('day-advance-one-day'));
    await userEvent.click(screen.getByTestId('day-advance-one-week'));

    expect(onAdvanceDay).not.toHaveBeenCalled();
    expect(onAdvanceWeek).not.toHaveBeenCalled();
  });
});
