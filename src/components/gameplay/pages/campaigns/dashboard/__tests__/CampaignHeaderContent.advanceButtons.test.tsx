/**
 * K13 PR3: the dashboard page header disables Advance Day, Advance Week and
 * Advance Month while a day advance is in flight, and each fires once when it
 * is not.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CampaignHeaderContent } from '../CampaignDashboardPage.sections';

const BUTTONS = [
  ['advance-day-btn', 'onAdvanceDay'],
  ['advance-week-btn', 'onAdvanceWeek'],
  ['advance-month-btn', 'onAdvanceMonth'],
] as const;

function renderHeader(isAdvancing: boolean) {
  const handlers = {
    onAdvanceDay: jest.fn(),
    onAdvanceWeek: jest.fn(),
    onAdvanceMonth: jest.fn(),
  };
  render(
    <CampaignHeaderContent
      currentDate={new Date('3025-01-01T00:00:00.000Z')}
      isAdvancing={isAdvancing}
      {...handlers}
    />,
  );
  return handlers;
}

describe('CampaignHeaderContent advance buttons', () => {
  it.each(BUTTONS)(
    '(B3) idle: %s fires its handler once per click',
    async (testId, handler) => {
      const handlers = renderHeader(false);

      await userEvent.click(screen.getByTestId(testId));

      expect(handlers[handler]).toHaveBeenCalledTimes(1);
    },
  );

  it.each(BUTTONS)(
    '(B4) advancing: %s is disabled and clicking fires nothing',
    async (testId) => {
      const handlers = renderHeader(true);

      expect(screen.getByTestId(testId)).toBeDisabled();
      await userEvent.click(screen.getByTestId(testId));

      expect(handlers.onAdvanceDay).not.toHaveBeenCalled();
      expect(handlers.onAdvanceWeek).not.toHaveBeenCalled();
      expect(handlers.onAdvanceMonth).not.toHaveBeenCalled();
    },
  );
});
