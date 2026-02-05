import React, { useState, useCallback, memo } from 'react';

import type { TurnoverDepartureEvent } from '@/lib/campaign/dayAdvancement';

import { Money } from '@/types/campaign/Money';

interface TurnoverReportPanelProps {
  departures: readonly TurnoverDepartureEvent[];
}

interface ModifierRowProps {
  displayName: string;
  value: number;
  isStub: boolean;
}

const ModifierRow = memo(function ModifierRow({
  displayName,
  value,
  isStub,
}: ModifierRowProps) {
  if (value === 0 && isStub) return null;

  const sign = value > 0 ? '+' : '';
  const colorClass =
    value > 0
      ? 'text-red-400'
      : value < 0
        ? 'text-green-400'
        : 'text-text-theme-secondary';

  return (
    <div className="flex justify-between py-0.5 text-xs">
      <span
        className={`${isStub ? 'text-text-theme-muted italic' : 'text-text-theme-secondary'}`}
      >
        {displayName}
        {isStub && ' (stub)'}
      </span>
      <span className={`font-mono ${colorClass}`}>
        {sign}
        {value}
      </span>
    </div>
  );
});

interface DepartureCardProps {
  departure: TurnoverDepartureEvent;
}

const DepartureCard = memo(function DepartureCard({
  departure,
}: DepartureCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isDeserted = departure.departureType === 'deserted';
  const statusColor = isDeserted ? 'text-red-400' : 'text-amber-400';
  const statusLabel = isDeserted ? 'Deserted' : 'Retired';
  const payout = new Money(departure.payoutAmount);
  const passed = departure.roll >= departure.targetNumber;

  return (
    <div className="bg-surface-deep border-border-theme-subtle overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={toggleExpanded}
        className="hover:bg-surface-raised/30 flex w-full items-center justify-between p-3 text-left transition-colors"
        aria-expanded={expanded}
        aria-label={`${departure.personName} — ${statusLabel}. Click to ${expanded ? 'collapse' : 'expand'} details`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`h-2 w-2 flex-shrink-0 rounded-full ${isDeserted ? 'bg-red-400' : 'bg-amber-400'}`}
          />
          <div className="min-w-0">
            <span className="text-text-theme-primary block truncate text-sm font-medium">
              {departure.personName}
            </span>
            <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="text-right text-xs">
            <div className="text-text-theme-secondary">
              Roll:{' '}
              <span
                className={`font-mono ${passed ? 'text-green-400' : 'text-red-400'}`}
              >
                {departure.roll}
              </span>
              {' / '}
              <span className="text-text-theme-primary font-mono">
                {departure.targetNumber}
              </span>
            </div>
            {departure.payoutAmount > 0 && (
              <div className="text-amber-400">{payout.format()}</div>
            )}
          </div>
          <svg
            className={`text-text-theme-muted h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && departure.modifiers.length > 0 && (
        <div className="border-border-theme-subtle border-t px-3 pb-3">
          <div className="space-y-0 pt-2">
            {departure.modifiers.map((mod) => (
              <ModifierRow
                key={mod.modifierId}
                displayName={mod.displayName}
                value={mod.value}
                isStub={mod.isStub}
              />
            ))}
          </div>
          <div className="border-border-theme-subtle mt-2 flex justify-between border-t pt-2 text-xs font-medium">
            <span className="text-text-theme-primary">Target Number</span>
            <span className="text-text-theme-primary font-mono">
              {departure.targetNumber}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export const TurnoverReportPanel = memo(function TurnoverReportPanel({
  departures,
}: TurnoverReportPanelProps) {
  if (departures.length === 0) return null;

  const totalPayout = departures.reduce((sum, d) => sum + d.payoutAmount, 0);
  const retiredCount = departures.filter(
    (d) => d.departureType === 'retired',
  ).length;
  const desertedCount = departures.filter(
    (d) => d.departureType === 'deserted',
  ).length;

  return (
    <div className="mb-3" data-testid="turnover-report-panel">
      <h4 className="text-text-theme-secondary mb-1 flex items-center gap-2 text-sm font-medium">
        <svg
          className="h-4 w-4 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Personnel Departures ({departures.length})
      </h4>

      <div className="text-text-theme-secondary mb-2 flex gap-3 text-xs">
        {retiredCount > 0 && (
          <span className="text-amber-400">{retiredCount} retired</span>
        )}
        {desertedCount > 0 && (
          <span className="text-red-400">{desertedCount} deserted</span>
        )}
        {totalPayout > 0 && (
          <span>Payouts: {new Money(totalPayout).format()}</span>
        )}
      </div>

      <div className="space-y-1.5">
        {departures.map((departure) => (
          <DepartureCard key={departure.personId} departure={departure} />
        ))}
      </div>
    </div>
  );
});
