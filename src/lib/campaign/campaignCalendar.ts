/**
 * Campaign calendar arithmetic (#1340).
 *
 * A campaign date is a GAME calendar date. It was being advanced by
 * adding 24 hours of elapsed time, which quietly makes the game calendar
 * depend on the player's real-world timezone: in a zone that observes
 * daylight saving, the autumn fall-back stretches one local day to 25
 * hours, so a 24-hour step lands on the same calendar date it started
 * on. A player in Denver advances a day and the date does not change; a
 * player in UTC never sees it.
 *
 * Day COUNTS had the mirror-image bug. Dividing elapsed milliseconds by
 * 86,400,000 and flooring under-counts by one across a fall-back, so a
 * campaign correctly on day 100 reported day 99.
 *
 * Both are fixed the same way: work in calendar days and let the runtime
 * handle the offsets. `setDate` rolls months and years and preserves
 * local time-of-day across a transition, which is exactly the behaviour
 * a game calendar wants.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The next campaign day. One CALENDAR day later, same local time of day,
 * regardless of whether a DST transition falls in between.
 */
export function nextCampaignDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + 1);
  return next;
}

/** `count` calendar days later. */
export function addCampaignDays(date: Date, count: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + count);
  return next;
}

/**
 * Whole calendar days between two dates, never negative.
 *
 * Both ends are normalised to local midnight first, so the result counts
 * date boundaries crossed rather than elapsed time. Rounding after that
 * absorbs the hour a DST transition adds or removes - without it, a
 * genuine 100-day span measures 99.958 days and floors to 99.
 */
export function campaignDaysBetween(from: Date, to: Date): number {
  const start = startOfLocalDay(from);
  const end = startOfLocalDay(to);
  return Math.max(0, Math.round((end - start) / MS_PER_DAY));
}

function startOfLocalDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}
