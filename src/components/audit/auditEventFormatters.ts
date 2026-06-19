interface TimestampFormatOptions {
  readonly compact?: boolean;
  readonly fallbackToInput?: boolean;
  readonly includeSeconds?: boolean;
}

export function formatAuditEventType(type: string): string {
  const shortType = type.includes('.')
    ? type.split('.').slice(1).join('.')
    : type;

  return shortType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAuditTimestamp(
  timestamp: string,
  {
    compact = false,
    fallbackToInput = false,
    includeSeconds = false,
  }: TimestampFormatOptions = {},
): string {
  const date = new Date(timestamp);
  if (fallbackToInput && isNaN(date.getTime())) return timestamp;

  if (compact) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' as const } : {}),
  });
}
