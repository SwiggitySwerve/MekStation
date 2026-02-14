import React from 'react';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type { IInvariant } from './AnalysisBugs.types';

import { INVARIANT_STATUS_CLASSES } from './AnalysisBugs.constants';
import { formatTimestamp } from './AnalysisBugs.utils';

export const InvariantCard: React.FC<{
  invariant: IInvariant;
  onClick?: (invariantId: string) => void;
}> = ({ invariant, onClick }) => {
  const handleClick = () => onClick?.(invariant.id);
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(invariant.id);
    }
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${FOCUS_RING_CLASSES}`}
      data-testid="invariant-card"
      data-status={invariant.status}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${invariant.name}: ${invariant.status}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3
          className="mr-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
          data-testid="invariant-name"
          title={invariant.name}
        >
          {invariant.name}
        </h3>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${INVARIANT_STATUS_CLASSES[invariant.status]}`}
          data-testid="invariant-status-badge"
        >
          {invariant.status}
        </span>
      </div>
      <p
        className="mb-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400"
        data-testid="invariant-description"
      >
        {invariant.description}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span data-testid="invariant-last-checked">
          {formatTimestamp(invariant.lastChecked)}
        </span>
        {invariant.failureCount > 0 && (
          <span
            className="font-medium text-red-600 dark:text-red-400"
            data-testid="invariant-failure-count"
          >
            {invariant.failureCount} failure
            {invariant.failureCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export const ThresholdSlider: React.FC<{
  detectorKey: string;
  label: string;
  description: string;
  value: number;
  affectedCount: number;
  onChange: (detector: string, value: number) => void;
}> = ({ detectorKey, label, description, value, affectedCount, onChange }) => (
  <div data-testid={`threshold-slider-${detectorKey}`}>
    <div className="mb-1 flex items-center justify-between">
      <label
        htmlFor={`slider-${detectorKey}`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <span
        className="font-mono text-sm text-gray-900 dark:text-gray-100"
        data-testid={`threshold-value-${detectorKey}`}
      >
        {value}
      </span>
    </div>
    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
      {description}
    </p>
    <input
      id={`slider-${detectorKey}`}
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(event) => onChange(detectorKey, Number(event.target.value))}
      className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-600 dark:accent-blue-400 ${FOCUS_RING_CLASSES}`}
      data-testid={`threshold-input-${detectorKey}`}
      aria-label={`${label} threshold`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    />
    {affectedCount > 0 && (
      <p
        className="mt-1 text-xs text-amber-600 dark:text-amber-400"
        data-testid={`threshold-affected-${detectorKey}`}
      >
        {affectedCount} anomal{affectedCount === 1 ? 'y' : 'ies'} from this
        detector
      </p>
    )}
  </div>
);

export const ToggleSwitch: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, label, checked, onChange }) => (
  <label
    htmlFor={id}
    className="group flex cursor-pointer items-center justify-between"
    data-testid={`toggle-${id}`}
  >
    <span className="text-sm text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
      {label}
    </span>
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
        data-testid={`toggle-input-${id}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      />
      <div className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-gray-600 dark:peer-checked:bg-blue-500" />
      <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </div>
  </label>
);
