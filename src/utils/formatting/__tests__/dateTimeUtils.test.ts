/**
 * Date, Time, and Number Formatting Utilities Tests
 *
 * Tests for centralized formatting functions.
 */

import {
  formatBytes,
  formatNumber,
  formatNumberWithSeparators,
  formatDate,
  formatFullDateTime,
  formatRelativeTime,
  formatExpiry,
  formatLastSeen,
} from '../dateTimeUtils';

// =============================================================================
// Byte Formatting Tests
// =============================================================================

describe('formatBytes', () => {
  it('should return "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10240)).toBe('10 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('should format terabytes correctly', () => {
    expect(formatBytes(1099511627776)).toBe('1 TB');
  });
});

// =============================================================================
// Number Formatting Tests
// =============================================================================

describe('formatNumber', () => {
  it('should return number as string for values under 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(10000)).toBe('10K');
    expect(formatNumber(999999)).toBe('1000K');
  });

  it('should format millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(10000000)).toBe('10M');
  });

  it('should remove trailing .0', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(2000000)).toBe('2M');
  });
});

describe('formatNumberWithSeparators', () => {
  it('should format with default en-US locale', () => {
    expect(formatNumberWithSeparators(1000)).toBe('1,000');
    expect(formatNumberWithSeparators(1000000)).toBe('1,000,000');
  });

  it('should format small numbers without separators', () => {
    expect(formatNumberWithSeparators(100)).toBe('100');
    expect(formatNumberWithSeparators(999)).toBe('999');
  });
});

// =============================================================================
// Date Formatting Tests
// =============================================================================

describe('formatDate', () => {
  it('should format ISO date with default options', () => {
    const result = formatDate('2025-01-15T12:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('should accept custom format options', () => {
    const result = formatDate('2025-06-20T12:00:00Z', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    expect(result).toContain('June');
  });
});

describe('formatFullDateTime', () => {
  it('should format with date and time', () => {
    const result = formatFullDateTime('2025-01-15T14:30:00Z');
    // Should contain date parts
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2025');
    // Should contain time
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

// =============================================================================
// Relative Time Formatting Tests
// =============================================================================

describe('formatRelativeTime', () => {
  // Use fixed current time for predictable tests
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-21T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return fallback text for null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('Never');
    expect(formatRelativeTime(undefined)).toBe('Never');
    expect(formatRelativeTime(null, 'N/A')).toBe('N/A');
  });

  it('should return "Just now" for < 10 seconds ago', () => {
    const fiveSecsAgo = new Date('2025-01-21T11:59:55Z').toISOString();
    expect(formatRelativeTime(fiveSecsAgo)).toBe('Just now');
  });

  it('should format seconds ago', () => {
    const thirtySecsAgo = new Date('2025-01-21T11:59:30Z').toISOString();
    expect(formatRelativeTime(thirtySecsAgo)).toBe('30s ago');
  });

  it('should format minutes ago', () => {
    const fiveMinsAgo = new Date('2025-01-21T11:55:00Z').toISOString();
    expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
  });

  it('should format hours ago', () => {
    const threeHoursAgo = new Date('2025-01-21T09:00:00Z').toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('should format days ago', () => {
    const twoDaysAgo = new Date('2025-01-19T12:00:00Z').toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('should fall back to date format for > 7 days', () => {
    const twoWeeksAgo = new Date('2025-01-07T12:00:00Z').toISOString();
    const result = formatRelativeTime(twoWeeksAgo);
    expect(result).toContain('Jan');
    expect(result).toContain('7');
  });
});

// =============================================================================
// Expiry Formatting Tests
// =============================================================================

describe('formatExpiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-21T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "Never" for null', () => {
    const result = formatExpiry(null);
    expect(result.text).toBe('Never');
    expect(result.isExpired).toBe(false);
  });

  it('should return "Expired" for past dates', () => {
    const pastDate = new Date('2025-01-20T12:00:00Z').toISOString();
    const result = formatExpiry(pastDate);
    expect(result.text).toBe('Expired');
    expect(result.isExpired).toBe(true);
  });

  it('should format minutes in the future', () => {
    const inThirtyMins = new Date('2025-01-21T12:30:00Z').toISOString();
    const result = formatExpiry(inThirtyMins);
    expect(result.text).toBe('in 30m');
    expect(result.isExpired).toBe(false);
  });

  it('should format hours in the future', () => {
    const inFiveHours = new Date('2025-01-21T17:00:00Z').toISOString();
    const result = formatExpiry(inFiveHours);
    expect(result.text).toBe('in 5h');
    expect(result.isExpired).toBe(false);
  });

  it('should format days in the future', () => {
    const inThreeDays = new Date('2025-01-24T12:00:00Z').toISOString();
    const result = formatExpiry(inThreeDays);
    expect(result.text).toBe('in 3d');
    expect(result.isExpired).toBe(false);
  });

  it('should format date for > 30 days in the future', () => {
    const inTwoMonths = new Date('2025-03-21T12:00:00Z').toISOString();
    const result = formatExpiry(inTwoMonths);
    expect(result.text).toContain('Mar');
    expect(result.isExpired).toBe(false);
  });
});

// =============================================================================
// Last Seen Formatting Tests
// =============================================================================

describe('formatLastSeen', () => {
  it('should return "Never seen" for null/undefined', () => {
    expect(formatLastSeen(null)).toBe('Never seen');
    expect(formatLastSeen(undefined)).toBe('Never seen');
  });

  it('should format valid dates using formatRelativeTime', () => {
    // Just verify it calls through to formatRelativeTime
    const recentDate = new Date().toISOString();
    const result = formatLastSeen(recentDate);
    // Should be some time-based result, not "Never seen"
    expect(result).not.toBe('Never seen');
  });
});
