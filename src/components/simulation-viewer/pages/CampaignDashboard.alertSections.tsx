import React from 'react';

import type { IPerformerSummary } from '@/types/simulation-viewer';

import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { FOCUS_RING_CLASSES, announce } from '@/utils/accessibility';

import type { CampaignDrillDownHandler } from './CampaignDashboard.overviewSections';

import {
  type IDerivedWarning,
  type PerformerSortKey,
  SEVERITY_BADGE,
  SEVERITY_CLASSES,
  SORT_OPTIONS,
  formatCompactNumber,
} from './CampaignDashboard.utils';

interface TopPerformersSectionProps {
  sortedPerformers: IPerformerSummary[];
  performerSortKey: PerformerSortKey;
  onSortChange: (sortKey: PerformerSortKey) => void;
  onDrillDown: CampaignDrillDownHandler;
}

export const TopPerformersSection: React.FC<TopPerformersSectionProps> = ({
  sortedPerformers,
  performerSortKey,
  onSortChange,
  onDrillDown,
}) => (
  <section
    className="col-span-1 space-y-3 md:col-span-2 lg:col-span-3"
    aria-label="Top performers"
    data-testid="top-performers-section"
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2
        className="text-lg font-semibold text-gray-800 dark:text-gray-200"
        data-testid="section-heading"
      >
        Top Performers
      </h2>

      <div
        className="flex gap-1 rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
        role="group"
        aria-label="Sort performers by"
        data-testid="performer-sort-controls"
      >
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              onSortChange(option.key);
              announce(`Sorted by ${option.label}`);
            }}
            className={[
              `min-h-[44px] rounded-md px-3 py-2 text-sm transition-colors md:min-h-0 md:py-1 ${FOCUS_RING_CLASSES}`,
              performerSortKey === option.key
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            ].join(' ')}
            aria-pressed={performerSortKey === option.key}
            data-testid={`sort-button-${option.key}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>

    {sortedPerformers.length === 0 ? (
      <p
        className="text-sm text-gray-500 italic dark:text-gray-400"
        data-testid="performers-empty"
      >
        No performance data available yet.
      </p>
    ) : (
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        data-testid="performers-list"
      >
        {sortedPerformers.map((performer) => (
          <PerformerCard
            key={performer.personId}
            performer={performer}
            activeSortKey={performerSortKey}
            onDrillDown={onDrillDown}
          />
        ))}
      </div>
    )}
  </section>
);

interface WarningsSectionProps {
  activeWarnings: IDerivedWarning[];
  onDismissWarning: (warningId: string) => void;
  onDrillDown: CampaignDrillDownHandler;
}

export const WarningsSection: React.FC<WarningsSectionProps> = ({
  activeWarnings,
  onDismissWarning,
  onDrillDown,
}) => (
  <section
    className="col-span-1 space-y-3 md:col-span-2 lg:col-span-4"
    aria-label="Campaign warnings"
    data-testid="warnings-section"
  >
    <h2
      className="text-lg font-semibold text-gray-800 dark:text-gray-200"
      data-testid="section-heading"
    >
      Warnings
    </h2>

    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {activeWarnings.length === 0
        ? 'No active warnings'
        : `${activeWarnings.length} active warning${activeWarnings.length !== 1 ? 's' : ''}`}
    </div>

    {activeWarnings.length === 0 ? (
      <p
        className="text-sm text-gray-500 italic dark:text-gray-400"
        data-testid="warnings-empty"
      >
        No active warnings — all systems nominal.
      </p>
    ) : (
      <ul className="space-y-2" data-testid="warnings-list">
        {activeWarnings.map((warning) => (
          <WarningItem
            key={warning.id}
            warning={warning}
            onDismiss={onDismissWarning}
            onDrillDown={onDrillDown}
          />
        ))}
      </ul>
    )}
  </section>
);

interface PerformerCardProps {
  performer: IPerformerSummary;
  activeSortKey: PerformerSortKey;
  onDrillDown: CampaignDrillDownHandler;
}

const PerformerCard: React.FC<PerformerCardProps> = ({
  performer,
  activeSortKey,
  onDrillDown,
}) => (
  <div
    className={[
      'flex-shrink-0 w-40 md:w-48 p-3 md:p-4 rounded-lg',
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'shadow-sm hover:shadow-md transition-shadow',
    ].join(' ')}
    data-testid="performer-card"
  >
    <p
      className="truncate font-semibold text-gray-900 dark:text-gray-100"
      data-testid="performer-name"
      title={performer.name}
    >
      {performer.name}
    </p>
    <p
      className="mb-2 text-xs text-gray-500 dark:text-gray-400"
      data-testid="performer-rank"
    >
      {performer.rank}
    </p>

    <dl className="space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-gray-400">Kills</dt>
        <dd
          className={[
            'font-medium',
            activeSortKey === 'kills'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
          data-testid="performer-kills"
        >
          {performer.kills}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-gray-400">XP</dt>
        <dd
          className={[
            'font-medium',
            activeSortKey === 'xp'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
          data-testid="performer-xp"
        >
          {formatCompactNumber(performer.xp)}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-gray-400">Missions</dt>
        <dd
          className={[
            'font-medium',
            activeSortKey === 'missionsCompleted'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
          data-testid="performer-missions"
        >
          {performer.missionsCompleted}
        </dd>
      </div>
    </dl>

    <div className="mt-3">
      <DrillDownLink
        label="View Pilot"
        targetTab="encounter-history"
        filter={{ personId: performer.personId }}
        icon="chevron-right"
        onClick={onDrillDown}
      />
    </div>
  </div>
);

interface WarningItemProps {
  warning: IDerivedWarning;
  onDismiss: (id: string) => void;
  onDrillDown: CampaignDrillDownHandler;
}

const WarningItem: React.FC<WarningItemProps> = ({
  warning,
  onDismiss,
  onDrillDown,
}) => (
  <li
    className={[
      'flex items-start gap-3 p-3 rounded-lg border',
      SEVERITY_CLASSES[warning.severity],
    ].join(' ')}
    role="alert"
    data-testid="warning-item"
    data-severity={warning.severity}
  >
    <span
      className={[
        'inline-flex items-center justify-center',
        'text-xs font-bold uppercase px-2 py-0.5 rounded',
        SEVERITY_BADGE[warning.severity],
      ].join(' ')}
      data-testid="warning-severity-badge"
    >
      {warning.severity}
    </span>

    <span className="flex-1" data-testid="warning-message">
      {warning.message}
    </span>

    <DrillDownLink
      label="Details"
      targetTab="encounter-history"
      filter={{ warningTarget: warning.target }}
      icon="arrow-right"
      onClick={onDrillDown}
    />

    <button
      type="button"
      onClick={() => onDismiss(warning.id)}
      className={[
        `ml-2 min-h-[44px] min-w-[44px] rounded p-2 hover:bg-black/10 md:min-h-0 md:min-w-0 md:p-1 dark:hover:bg-white/10 ${FOCUS_RING_CLASSES}`,
        'transition-colors text-current opacity-60 hover:opacity-100 flex items-center justify-center',
      ].join(' ')}
      aria-label={`Dismiss warning: ${warning.message}`}
      data-testid="warning-dismiss"
    >
      ✕
    </button>
  </li>
);
