import React, { useState, useCallback } from 'react';

import type { IAnomalyAlertCardProps } from '@/components/simulation-viewer/types';

import { FOCUS_RING_CLASSES, announce } from '@/utils/accessibility';

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300',
    context: 'text-red-600 dark:text-red-400',
    button:
      'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40',
    icon: '🔴',
  },
  warning: {
    border: 'border-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    title: 'text-orange-900 dark:text-orange-100',
    message: 'text-orange-700 dark:text-orange-300',
    context: 'text-orange-600 dark:text-orange-400',
    button:
      'text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40',
    icon: '⚠️',
  },
  info: {
    border: 'border-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300',
    context: 'text-blue-600 dark:text-blue-400',
    button:
      'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    icon: 'ℹ️',
  },
} as const;

function formatTitle(type: string): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const AnomalyAlertCard: React.FC<IAnomalyAlertCardProps> = ({
  anomaly,
  onViewSnapshot,
  onViewBattle,
  onConfigureThreshold,
  onDismiss,
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const styles = SEVERITY_STYLES[anomaly.severity];

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    announce(`${formatTitle(anomaly.type)} alert dismissed`);
    setTimeout(() => {
      setHidden(true);
      onDismiss?.(anomaly.id);
    }, 300);
  }, [anomaly.id, anomaly.type, onDismiss]);

  if (hidden) return null;

  const cardClasses = [
    'border-l-4 rounded-lg p-4',
    styles.border,
    styles.bg,
    'transition-opacity duration-300',
    dismissed ? 'opacity-0' : 'opacity-100',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const showViewSnapshot = anomaly.severity === 'critical' && onViewSnapshot;
  const showConfigureThreshold =
    anomaly.severity === 'warning' && anomaly.configKey && onConfigureThreshold;

  return (
    <div
      className={cardClasses}
      role="alert"
      aria-label={`${anomaly.severity} alert: ${formatTitle(anomaly.type)}`}
      data-testid="anomaly-alert-card"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex-shrink-0 text-2xl"
          data-testid="anomaly-icon"
          aria-hidden="true"
        >
          {styles.icon}
        </span>

        <div className="min-w-0 flex-1">
          <h3
            className={`text-lg font-semibold ${styles.title}`}
            data-testid="anomaly-title"
          >
            {formatTitle(anomaly.type)}
          </h3>

          <p
            className={`mt-1 text-sm ${styles.message}`}
            data-testid="anomaly-message"
          >
            {anomaly.message}
          </p>

          <p
            className={`mt-1 text-xs ${styles.context}`}
            data-testid="anomaly-context"
          >
            Battle: {anomaly.battleId}
            {anomaly.turn !== null && ` · Turn ${anomaly.turn}`}
          </p>

          <div
            className="mt-3 flex flex-wrap gap-2"
            data-testid="anomaly-actions"
          >
            {showViewSnapshot && (
              <ActionButton
                label="View Snapshot"
                onClick={() => onViewSnapshot(anomaly)}
                buttonClass={styles.button}
              />
            )}

            {onViewBattle && (
              <ActionButton
                label="View Battle"
                onClick={() => onViewBattle(anomaly.battleId)}
                buttonClass={styles.button}
              />
            )}

            {showConfigureThreshold && (
              <ActionButton
                label="Configure Threshold"
                onClick={() => onConfigureThreshold(anomaly.configKey!)}
                buttonClass={styles.button}
              />
            )}

            {onDismiss && (
              <ActionButton
                label="Dismiss"
                onClick={handleDismiss}
                buttonClass={styles.button}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  buttonClass: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  buttonClass,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={`min-h-[44px] rounded-md px-4 py-2 text-sm transition-colors md:min-h-0 ${FOCUS_RING_CLASSES} ${buttonClass}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-testid={`action-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {label}
    </button>
  );
};
