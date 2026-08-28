/**
 * Advancing a campaign day must move the CALENDAR by one day (#1340).
 *
 * The campaign date is a game-calendar date. Advancing it by adding 24
 * hours of elapsed time makes the game calendar depend on the player's
 * real-world timezone: in a zone that observes daylight saving, the
 * autumn fall-back adds an extra real hour to the day, so 100 advances
 * move the local calendar only 99 days. A player in Denver loses a
 * campaign day every autumn; a player in UTC never does.
 *
 * The boundary is pinned explicitly rather than taken from the current
 * clock. A test that only fails when today happens to sit within an hour
 * of midnight, in a DST zone, some months before a transition, is a test
 * that reports the bug as a flake.
 */

import { advanceDay } from '../dayAdvancement';
import { buildPopulatedCampaign } from '../persistence/__tests__/campaignFixture';

/** True when the host zone observes DST across the pinned window. */
function hostObservesDst(): boolean {
  const before = new Date(2026, 9, 1).getTimezoneOffset();
  const after = new Date(2026, 11, 1).getTimezoneOffset();
  return before !== after;
}

describe('campaign day advancement across a DST boundary', () => {
  it('moves the calendar one day per advance, whatever the clock does', () => {
    if (!hostObservesDst()) {
      // On a fixed-offset host (CI runs UTC) the arithmetic cannot be
      // distinguished, so state that rather than pass silently for the
      // wrong reason. The row below still runs everywhere.
      expect(hostObservesDst()).toBe(false);
      return;
    }

    // 00:30 local on a day whose 100-day window crosses the autumn
    // fall-back. The early hour is what makes an hour of drift flip the
    // calendar date.
    const start = new Date(2026, 7, 24, 0, 30, 0, 0);
    let campaign = { ...buildPopulatedCampaign(), currentDate: start };

    for (let day = 0; day < 100; day += 1) {
      campaign = advanceDay(campaign).campaign;
    }

    const expected = new Date(start);
    expected.setDate(expected.getDate() + 100);
    expect(campaign.currentDate.toDateString()).toBe(expected.toDateString());
  });

  it('keeps the local time-of-day stable across the transition', () => {
    // Elapsed-time arithmetic shifts the campaign clock by an hour at the
    // transition. Nothing should read the time component of a campaign
    // date, but a date that silently drifts an hour is how a "day" ends
    // up 23 hours long for anyone who does.
    const start = new Date(2026, 9, 25, 12, 0, 0, 0);
    let campaign = { ...buildPopulatedCampaign(), currentDate: start };

    for (let day = 0; day < 20; day += 1) {
      campaign = advanceDay(campaign).campaign;
    }

    expect(campaign.currentDate.getHours()).toBe(12);
  });

  it('advances exactly one calendar day at a time', () => {
    const start = new Date(2026, 10, 1, 0, 30, 0, 0);
    const campaign = {
      ...buildPopulatedCampaign(),
      currentDate: start,
    };

    const advanced = advanceDay(campaign).campaign;

    const expected = new Date(start);
    expected.setDate(expected.getDate() + 1);
    expect(advanced.currentDate.toDateString()).toBe(expected.toDateString());
  });
});
