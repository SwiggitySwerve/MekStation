/**
 * Format currency value in C-Bills with thousands separators.
 *
 * @param amount - Amount in C-Bills
 * @returns Formatted string with commas and C-Bills unit
 * @example formatCurrency(1234567) // "$1,234,567 C-Bills"
 */
export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-US');
  return `$${formatted} C-Bills`;
}

/**
 * Format duration in milliseconds to human-readable string.
 * Displays hours and minutes for durations >= 1 hour,
 * minutes and seconds for durations >= 1 minute,
 * and seconds only for shorter durations.
 *
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted string (e.g., "2h 30m", "45s", "2m 30s")
 * @example formatDuration(150000) // "2m 30s"
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format percentage value as a string with specified decimal places.
 *
 * @param value - Value between 0 and 1 (e.g., 0.755 for 75.5%)
 * @param decimals - Number of decimal places to display (default: 1)
 * @returns Formatted percentage string
 * @example formatPercentage(0.755) // "75.5%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
}
