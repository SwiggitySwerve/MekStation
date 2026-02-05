import React, { useState, useRef, useEffect } from 'react';

import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import {
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import {
  getTabForCategory,
  getTabLabel,
} from '@/utils/validation/validationNavigation';

interface ValidationSummaryProps {
  validation: UnitValidationState;
  onNavigate?: (tabId: CustomizerTabId) => void;
  maxItems?: number;
  className?: string;
}

interface FlattenedError {
  error: IUnitValidationError;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

function flattenErrors(validation: UnitValidationState): FlattenedError[] {
  if (!validation.result) return [];

  const items: FlattenedError[] = [];

  for (const ruleResult of validation.result.results) {
    for (const error of ruleResult.errors) {
      const severity =
        error.severity === UnitValidationSeverity.CRITICAL_ERROR
          ? 'critical'
          : 'error';
      items.push({ error, severity });
    }
    for (const warning of ruleResult.warnings) {
      items.push({ error: warning, severity: 'warning' });
    }
    for (const info of ruleResult.infos) {
      items.push({ error: info, severity: 'info' });
    }
  }

  const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
  items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return items;
}

const severityStyles = {
  critical: {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    icon: '🚫',
    label: 'Critical',
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    icon: '❌',
    label: 'Error',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    icon: '⚠️',
    label: 'Warning',
  },
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    icon: 'ℹ️',
    label: 'Info',
  },
};

export function ValidationSummary({
  validation,
  onNavigate,
  maxItems = 5,
  className = '',
}: ValidationSummaryProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allErrors = flattenErrors(validation);
  const displayErrors = allErrors.slice(0, maxItems);
  const remainingCount = allErrors.length - displayErrors.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Only show "Valid" badge if there are no errors, warnings, or infos
  if (
    validation.isValid &&
    validation.warningCount === 0 &&
    validation.infoCount === 0
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300 ${className}`}
      >
        <span>✓</span>
        <span>Valid</span>
      </span>
    );
  }

  // Determine badge color based on most severe issue type
  const badgeBg =
    validation.errorCount > 0
      ? 'bg-red-500/20 border-red-500/30'
      : validation.warningCount > 0
        ? 'bg-amber-500/20 border-amber-500/30'
        : 'bg-blue-500/20 border-blue-500/30';
  const badgeText =
    validation.errorCount > 0
      ? 'text-red-300'
      : validation.warningCount > 0
        ? 'text-amber-300'
        : 'text-blue-300';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium transition-all hover:brightness-110 ${badgeBg} ${badgeText}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {validation.errorCount > 0 && (
          <span className="flex items-center gap-0.5">
            <span>❌</span>
            <span>{validation.errorCount}</span>
          </span>
        )}
        {validation.warningCount > 0 && (
          <span className="flex items-center gap-0.5">
            <span>⚠️</span>
            <span>{validation.warningCount}</span>
          </span>
        )}
        {validation.infoCount > 0 && (
          <span className="flex items-center gap-0.5">
            <span>ℹ️</span>
            <span>{validation.infoCount}</span>
          </span>
        )}
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="bg-surface-raised border-border-theme absolute top-full left-0 z-50 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-lg border shadow-xl">
          <div className="bg-surface-base border-border-theme border-b px-3 py-2">
            <span className="text-sm font-medium text-white">
              Validation Issues
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {displayErrors.map((item, index) => {
              const style = severityStyles[item.severity];
              const tabId = getTabForCategory(item.error.category);
              const tabLabel = getTabLabel(tabId);

              return (
                <button
                  key={`${item.error.ruleId}-${index}`}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(tabId);
                      setIsOpen(false);
                    }
                  }}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-all hover:brightness-110 ${style.bg} border-border-theme/50 border-b last:border-b-0`}
                >
                  <span className="flex-shrink-0 text-sm">{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${style.text} line-clamp-2`}>
                      {item.error.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {style.label} • Go to {tabLabel} →
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {remainingCount > 0 && (
            <div className="bg-surface-base border-border-theme border-t px-3 py-2 text-center">
              <span className="text-xs text-slate-400">
                +{remainingCount} more issue{remainingCount !== 1 ? 's' : ''} in
                panel below
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
