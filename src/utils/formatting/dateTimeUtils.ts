/**
 * Date, Time, and Number Formatting Utilities
 *
 * Centralized formatting functions for consistent display across the application.
 * Consolidates previously duplicated formatting logic from components.
 */

// =============================================================================
// Byte Formatting
// =============================================================================

/**
 * Format bytes into human-readable size (e.g., "1.5 MB")
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// =============================================================================
// Number Formatting
// =============================================================================

/**
 * Format number with K/M suffix for compact display
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.5K", "2M")
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Format number with locale-specific thousands separators
 * @param num - Number to format
 * @param locale - Locale string (defaults to 'en-US')
 * @returns Formatted string with separators
 */
export function formatNumberWithSeparators(
  num: number,
  locale = 'en-US',
): string {
  return num.toLocaleString(locale);
}

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format ISO date string into readable date
 * @param isoDate - ISO 8601 date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format ISO date string into full date with time
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date and time string
 */
export function formatFullDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// =============================================================================
// Relative Time Formatting
// =============================================================================

/**
 * Format ISO date into relative time (e.g., "5 min ago", "2d ago")
 * Falls back to formatted date for older dates.
 *
 * @param isoDate - ISO 8601 date string or null/undefined
 * @param fallbackText - Text to show when date is null/undefined (default: "Never")
 * @returns Relative time string
 */
export function formatRelativeTime(
  isoDate: string | null | undefined,
  fallbackText = 'Never',
): string {
  if (!isoDate) return fallbackText;

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Fall back to formatted date for older items
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format future date into relative time (e.g., "in 5 min", "in 2 days")
 * Used for expiry dates and countdowns.
 *
 * @param isoDate - ISO 8601 date string or null
 * @returns Object with text and isExpired flag
 */
export function formatExpiry(isoDate: string | null): {
  text: string;
  isExpired: boolean;
} {
  if (!isoDate) {
    return { text: 'Never', isExpired: false };
  }

  const expiry = new Date(isoDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs < 0) {
    return { text: 'Expired', isExpired: true };
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return { text: `in ${diffMins}m`, isExpired: false };
  }
  if (diffHours < 24) {
    return { text: `in ${diffHours}h`, isExpired: false };
  }
  if (diffDays < 30) {
    return { text: `in ${diffDays}d`, isExpired: false };
  }

  return {
    text: expiry.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    isExpired: false,
  };
}

/**
 * Format last seen time for contacts/users
 * @param isoDate - ISO 8601 date string or null
 * @returns Human-readable "last seen" string
 */
export function formatLastSeen(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never seen';
  return formatRelativeTime(isoDate, 'Never seen');
}
