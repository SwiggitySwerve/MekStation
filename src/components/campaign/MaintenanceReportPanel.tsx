import React, { useState, useCallback, memo } from 'react';
import { PartQuality } from '@/types/campaign/quality';
import { QualityBadge } from './QualityBadge';

export interface MaintenanceModifier {
  readonly name: string;
  readonly value: number;
}

export interface MaintenanceEvent {
  readonly unitId: string;
  readonly techId?: string;
  readonly techName?: string;
  readonly roll: number;
  readonly targetNumber: number;
  readonly margin: number;
  readonly outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure';
  readonly qualityBefore: PartQuality;
  readonly qualityAfter: PartQuality;
  readonly modifiers: readonly MaintenanceModifier[];
  readonly unmaintained: boolean;
}

interface MaintenanceReportPanelProps {
  events: readonly MaintenanceEvent[];
}

type OutcomeStyle = { label: string; color: string; dot: string };

const OUTCOME_STYLES: Record<string, OutcomeStyle> = {
  success: { label: 'Success', color: 'text-green-400', dot: 'bg-green-400' },
  failure: { label: 'Failed', color: 'text-red-400', dot: 'bg-red-400' },
  critical_success: { label: 'Excellent', color: 'text-blue-400', dot: 'bg-blue-400' },
  critical_failure: { label: 'Critical Failure', color: 'text-red-500', dot: 'bg-red-500' },
  unmaintained: { label: 'No Tech', color: 'text-amber-400', dot: 'bg-amber-400' },
};

function getOutcomeStyle(event: MaintenanceEvent): OutcomeStyle {
  if (event.unmaintained) return OUTCOME_STYLES.unmaintained;
  return OUTCOME_STYLES[event.outcome] ?? OUTCOME_STYLES.failure;
}

interface ModifierRowProps {
  name: string;
  value: number;
}

const ModifierRow = memo(function ModifierRow({ name, value }: ModifierRowProps) {
  const sign = value > 0 ? '+' : '';
  const colorClass =
    value > 0
      ? 'text-red-400'
      : value < 0
        ? 'text-green-400'
        : 'text-text-theme-secondary';

  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-text-theme-secondary">{name}</span>
      <span className={`font-mono ${colorClass}`}>
        {sign}{value}
      </span>
    </div>
  );
});

interface MaintenanceCardProps {
  event: MaintenanceEvent;
}

const MaintenanceCard = memo(function MaintenanceCard({ event }: MaintenanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const style = getOutcomeStyle(event);
  const qualityChanged = event.qualityBefore !== event.qualityAfter;
  const passed = event.roll >= event.targetNumber;

  return (
    <div className="rounded-lg bg-surface-deep border border-border-theme-subtle overflow-hidden">
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-raised/30 transition-colors"
        aria-expanded={expanded}
        aria-label={`Unit ${event.unitId} — ${style.label}. Click to ${expanded ? 'collapse' : 'expand'} details`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
          <div className="min-w-0">
            <span className="font-medium text-text-theme-primary text-sm truncate block">
              {event.unitId}
            </span>
            <span className={`text-xs ${style.color}`}>
              {style.label}
              {event.techName && !event.unmaintained && (
                <span className="text-text-theme-muted"> — {event.techName}</span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!event.unmaintained && (
            <div className="text-right text-xs">
              <div className="text-text-theme-secondary">
                Roll: <span className={`font-mono ${passed ? 'text-green-400' : 'text-red-400'}`}>{event.roll}</span>
                {' / '}
                <span className="font-mono text-text-theme-primary">{event.targetNumber}</span>
              </div>
            </div>
          )}

          {qualityChanged && (
            <div className="flex items-center gap-1">
              <QualityBadge quality={event.qualityBefore} />
              <span className="text-text-theme-muted text-xs">→</span>
              <QualityBadge quality={event.qualityAfter} />
            </div>
          )}

          {!qualityChanged && (
            <QualityBadge quality={event.qualityAfter} />
          )}

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

      {expanded && (
        <div className="px-3 pb-3 border-t border-border-theme-subtle">
          {event.unmaintained ? (
            <p className="text-xs text-amber-400 pt-2">
              No tech assigned — quality degrades automatically.
            </p>
          ) : (
            <>
              {event.modifiers.length > 0 && (
                <div className="pt-2 space-y-0">
                  {event.modifiers.map((mod) => (
                    <ModifierRow key={mod.name} name={mod.name} value={mod.value} />
                  ))}
                </div>
              )}
              <div className="flex justify-between text-xs pt-2 mt-2 border-t border-border-theme-subtle font-medium">
                <span className="text-text-theme-primary">Target Number</span>
                <span className="font-mono text-text-theme-primary">{event.targetNumber}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 font-medium">
                <span className="text-text-theme-primary">Margin</span>
                <span className={`font-mono ${event.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {event.margin >= 0 ? '+' : ''}{event.margin}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export const MaintenanceReportPanel = memo(function MaintenanceReportPanel({
  events,
}: MaintenanceReportPanelProps) {
  if (events.length === 0) return null;

  const successCount = events.filter((e) => !e.unmaintained && (e.outcome === 'success' || e.outcome === 'critical_success')).length;
  const failureCount = events.filter((e) => !e.unmaintained && (e.outcome === 'failure' || e.outcome === 'critical_failure')).length;
  const unmaintainedCount = events.filter((e) => e.unmaintained).length;
  const qualityChangedCount = events.filter((e) => e.qualityBefore !== e.qualityAfter).length;

  return (
    <div className="mb-3" data-testid="maintenance-report-panel">
      <h4 className="text-sm font-medium text-text-theme-secondary mb-1 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Maintenance Checks ({events.length})
      </h4>

      <div className="flex gap-3 text-xs text-text-theme-secondary mb-2">
        {successCount > 0 && (
          <span className="text-green-400">{successCount} passed</span>
        )}
        {failureCount > 0 && (
          <span className="text-red-400">{failureCount} failed</span>
        )}
        {unmaintainedCount > 0 && (
          <span className="text-amber-400">{unmaintainedCount} no tech</span>
        )}
        {qualityChangedCount > 0 && (
          <span className="text-blue-400">{qualityChangedCount} quality changed</span>
        )}
      </div>

      <div className="space-y-1.5">
        {events.map((event) => (
          <MaintenanceCard key={event.unitId} event={event} />
        ))}
      </div>
    </div>
  );
});
