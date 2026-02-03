import { formatCurrency, formatDuration, formatPercentage } from '../formatting';

describe('formatCurrency', () => {
  it('should format large amounts with commas', () => {
    expect(formatCurrency(1234567)).toBe('$1,234,567 C-Bills');
  });

  it('should format small amounts', () => {
    expect(formatCurrency(100)).toBe('$100 C-Bills');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0 C-Bills');
  });

  it('should format thousands', () => {
    expect(formatCurrency(1000)).toBe('$1,000 C-Bills');
  });

  it('should format millions', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000 C-Bills');
  });

  it('should handle single digit', () => {
    expect(formatCurrency(5)).toBe('$5 C-Bills');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrency(-1000)).toBe('$-1,000 C-Bills');
  });
});

describe('formatDuration', () => {
  it('should format hours and minutes', () => {
    expect(formatDuration(9000000)).toBe('2h 30m');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(150000)).toBe('2m 30s');
  });

  it('should format seconds only', () => {
    expect(formatDuration(45000)).toBe('45s');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('should format exactly 1 hour', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
  });

  it('should format exactly 1 minute', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
  });

  it('should format 1 second', () => {
    expect(formatDuration(1000)).toBe('1s');
  });

  it('should format large durations', () => {
    expect(formatDuration(36000000)).toBe('10h 0m');
  });

  it('should handle milliseconds less than 1 second', () => {
    expect(formatDuration(500)).toBe('0s');
  });

  it('should format 59 minutes 59 seconds', () => {
    expect(formatDuration(3599000)).toBe('59m 59s');
  });

  it('should format 1 hour 59 minutes', () => {
    expect(formatDuration(7140000)).toBe('1h 59m');
  });
});

describe('formatPercentage', () => {
  it('should format with default 1 decimal', () => {
    expect(formatPercentage(0.755)).toBe('75.5%');
  });

  it('should format with custom decimals', () => {
    expect(formatPercentage(0.75534, 2)).toBe('75.53%');
  });

  it('should handle zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('should handle 100%', () => {
    expect(formatPercentage(1)).toBe('100.0%');
  });

  it('should format with 0 decimals', () => {
    expect(formatPercentage(0.755, 0)).toBe('76%');
  });

  it('should format with 3 decimals', () => {
    expect(formatPercentage(0.75534, 3)).toBe('75.534%');
  });

  it('should handle small percentages', () => {
    expect(formatPercentage(0.001)).toBe('0.1%');
  });

  it('should handle very small percentages', () => {
    expect(formatPercentage(0.0001, 2)).toBe('0.01%');
  });

  it('should handle 50%', () => {
    expect(formatPercentage(0.5)).toBe('50.0%');
  });

  it('should handle 99.9%', () => {
    expect(formatPercentage(0.999)).toBe('99.9%');
  });

  it('should round correctly', () => {
    expect(formatPercentage(0.1234, 2)).toBe('12.34%');
  });

  it('should handle rounding up', () => {
    expect(formatPercentage(0.1235, 2)).toBe('12.35%');
  });
});
