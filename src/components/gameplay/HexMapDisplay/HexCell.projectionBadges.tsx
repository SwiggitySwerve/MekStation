import React from 'react';

import type { IHexCoordinate } from '@/types/gameplay';
import type {
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

function formatProjectionStatusLabel(
  status: TacticalMapHexProjectionStatus | undefined,
): string | null {
  switch (status) {
    case 'mixed':
      return 'MIX';
    case 'blocked':
      return 'BLK';
    default:
      return null;
  }
}

function formatProjectionStatusTitle({
  status,
  intent,
  blockedReasons,
  explanation,
}: {
  readonly status: TacticalMapHexProjectionStatus;
  readonly intent: TacticalMapHexProjectionIntent | undefined;
  readonly blockedReasons: readonly string[] | undefined;
  readonly explanation: string | undefined;
}): string {
  const statusLabel =
    status === 'mixed'
      ? 'Mixed tactical projection'
      : 'Blocked tactical projection';
  const parts = [statusLabel];
  if (intent) parts.push(`intent ${intent}`);
  if (blockedReasons?.length)
    parts.push(`blocked ${blockedReasons.join('; ')}`);
  if (explanation) parts.push(explanation);
  return parts.join('; ');
}

export function ProjectionStatusBadge({
  x,
  y,
  hex,
  status,
  intent,
  blockedReasons,
  explanation,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly status?: TacticalMapHexProjectionStatus;
  readonly intent?: TacticalMapHexProjectionIntent;
  readonly blockedReasons?: readonly string[];
  readonly explanation?: string;
}): React.ReactElement | null {
  const label = formatProjectionStatusLabel(status);
  if (!label || !status) return null;

  const title = formatProjectionStatusTitle({
    status,
    intent,
    blockedReasons,
    explanation,
  });
  const width = Math.max(28, label.length * 6 + 10);
  const fill = status === 'mixed' ? '#92400e' : '#7f1d1d';

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-projection-status-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-projection-status-badge-status={status}
      data-projection-status-badge-intent={intent}
      data-projection-status-badge-reasons={blockedReasons?.join('|')}
      data-projection-status-badge-explanation={explanation}
    >
      <title>{title}</title>
      <rect
        x={x - 40}
        y={y - 21}
        width={width}
        height={12}
        rx={3}
        fill={fill}
        opacity={0.94}
        stroke="#f8fafc"
        strokeOpacity={0.55}
        strokeWidth={0.75}
      />
      <text
        x={x - 40 + width / 2}
        y={y - 12}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fff7ed"
      >
        {label}
      </text>
    </g>
  );
}
