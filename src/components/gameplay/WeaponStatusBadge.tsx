import React from 'react';

export interface StatusBadgeProps {
  readonly label: string;
  readonly testid: string;
  readonly tone: 'red' | 'amber' | 'gray';
}

export function StatusBadge({
  label,
  testid,
  tone,
}: StatusBadgeProps): React.ReactElement {
  const toneClasses =
    tone === 'red'
      ? 'bg-red-100 text-red-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${toneClasses}`}
      data-testid={testid}
    >
      {label}
    </span>
  );
}
