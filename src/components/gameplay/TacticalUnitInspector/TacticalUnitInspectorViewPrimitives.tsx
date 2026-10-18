import React from 'react';

import type { IInspectorProjection } from '@/types/gameplay/TacticalInspectorInterfaces';

type FriendlyProjection = Extract<IInspectorProjection, { kind: 'friendly' }>;

type TargetProjection = Extract<IInspectorProjection, { kind: 'target' }>;

interface InfoRowProps {
  readonly label: string;
  readonly testId: string;
  readonly children: React.ReactNode;
  readonly valueClassName?: string;
}

interface StatusBadgeSpec {
  readonly show: boolean;
  readonly label: string;
  readonly className: string;
}

function InfoRow({
  label,
  testId,
  children,
  valueClassName = 'text-text-theme-primary',
}: InfoRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-theme-muted">{label}</span>
      <span className={valueClassName} data-testid={testId}>
        {children}
      </span>
    </div>
  );
}

function StatusBadge({
  label,
  className,
}: Omit<StatusBadgeSpec, 'show'>): React.ReactElement {
  return <span className={className}>{label}</span>;
}

function heatStatusColor(heat: number): string {
  if (heat >= 20) return 'font-semibold text-red-600';
  return heat >= 10 ? 'font-medium text-amber-600' : 'text-text-theme-primary';
}

export type { FriendlyProjection, TargetProjection, StatusBadgeSpec };

export { InfoRow, StatusBadge, heatStatusColor };
