import React, { useState, useCallback, memo } from 'react';
import { Money } from '@/types/campaign/Money';
import type { TurnoverDepartureEvent } from '@/lib/campaign/dayAdvancement';

interface TurnoverReportPanelProps {
  departures: readonly TurnoverDepartureEvent[];
}

interface ModifierRowProps {
  displayName: string;
  value: number;
  isStub: boolean;
}

const ModifierRow = memo(function ModifierRow({ displayName, value, isStub }: ModifierRowProps) {
  if (value === 0 && isStub) return null;

  const sign = value > 0 ? '+' : '';
  const colorClass =
    value > 0
      ? 'text-red-400'
      : value < 0
        ? 'text-green-400'
        : 'text-text-theme-secondary';

  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className={`${isStub ? 'text-text-theme-muted italic' : 'text-text-theme-secondary'}`}>
        {displayName}
        {isStub && ' (stub)'}
      </span>
      <span className={`font-mono ${colorClass}`}>
        {sign}{value}
      </span>
    </div>
  );
});

interface DepartureCardProps {
  departure: TurnoverDepartureEvent;
}

const DepartureCard = memo(function DepartureCard({ departure }: DepartureCardProps) {
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
    <div className="rounded-lg bg-surface-deep border border-border-theme-subtle overflow-hidden">
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-raised/30 transition-colors"
        aria-expanded={expanded}
        aria-label={`${departure.personName} — ${statusLabel}. Click to ${expanded ? 'collapse' : 'expand'} details`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDeserted ? 'bg-red-400' : 'bg-amber-400'}`} />
          <div className="min-w-0">
            <span className="font-medium text-text-theme-primary text-sm truncate block">
              {departure.personName}
            </span>
            <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right text-xs">
            <div className="text-text-theme-secondary">
              Roll: <span className={`font-mono ${passed ? 'text-green-400' : 'text-red-400'}`}>{departure.roll}</span>
              {' / '}
              <span className="font-mono text-text-theme-primary">{departure.targetNumber}</span>
            </div>
            {departure.payoutAmount > 0 && (
              <div className="text-amber-400">{payout.format()}</div>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-text-theme-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && departure.modifiers.length > 0 && (
        <div className="px-3 pb-3 border-t border-border-theme-subtle">
          <div className="pt-2 space-y-0">
            {departure.modifiers.map((mod) => (
              <ModifierRow
                key={mod.modifierId}
                displayName={mod.displayName}
                value={mod.value}
                isStub={mod.isStub}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs pt-2 mt-2 border-t border-border-theme-subtle font-medium">
            <span className="text-text-theme-primary">Target Number</span>
            <span className="font-mono text-text-theme-primary">{departure.targetNumber}</span>
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
  const retiredCount = departures.filter((d) => d.departureType === 'retired').length;
  const desertedCount = departures.filter((d) => d.departureType === 'deserted').length;

  return (
    <div className="mb-3" data-testid="turnover-report-panel">
      <h4 className="text-sm font-medium text-text-theme-secondary mb-1 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Personnel Departures ({departures.length})
      </h4>

      <div className="flex gap-3 text-xs text-text-theme-secondary mb-2">
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
