/**
 * Validation Panel Component
 * 
 * Displays validation errors and warnings in a collapsible panel.
 * Shows dynamically as issues are detected during mech configuration.
 */

import React, { useState, useMemo } from 'react';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { IUnitValidationResult, IUnitValidationError, UnitValidationSeverity } from '@/types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { getTabForCategory, getTabLabel } from '@/utils/validation/validationNavigation';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';

// =============================================================================
// Types
// =============================================================================

interface ValidationPanelProps {
  validation: UnitValidationState;
  defaultCollapsed?: boolean;
  maxHeight?: string;
  className?: string;
  onNavigate?: (tabId: CustomizerTabId) => void;
}

interface ValidationMessage {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  ruleId?: string;
  category: ValidationCategory;
  targetTab: CustomizerTabId;
  targetTabLabel: string;
  originalError: IUnitValidationError;
}

// =============================================================================
// Helpers
// =============================================================================

function mapSeverity(severity: UnitValidationSeverity): 'error' | 'warning' | 'info' {
  switch (severity) {
    case UnitValidationSeverity.CRITICAL_ERROR:
    case UnitValidationSeverity.ERROR:
      return 'error';
    case UnitValidationSeverity.WARNING:
      return 'warning';
    case UnitValidationSeverity.INFO:
    default:
      return 'info';
  }
}

function createMessageFromError(error: IUnitValidationError, index: number, severity: 'error' | 'warning' | 'info'): ValidationMessage {
  const targetTab = getTabForCategory(error.category);
  return {
    id: `${error.ruleId}-${index}`,
    severity,
    message: error.message,
    details: error.details ? JSON.stringify(error.details) : undefined,
    ruleId: error.ruleId,
    category: error.category,
    targetTab,
    targetTabLabel: getTabLabel(targetTab),
    originalError: error,
  };
}

function extractMessages(result: IUnitValidationResult | null): ValidationMessage[] {
  if (!result) return [];
  
  const messages: ValidationMessage[] = [];
  
  for (const ruleResult of result.results) {
    for (const error of ruleResult.errors) {
      messages.push(createMessageFromError(error, messages.length, mapSeverity(error.severity)));
    }
    
    for (const warning of ruleResult.warnings) {
      messages.push(createMessageFromError(warning, messages.length, 'warning'));
    }
    
    for (const info of ruleResult.infos) {
      messages.push(createMessageFromError(info, messages.length, 'info'));
    }
  }
  
  const severityOrder = { error: 0, warning: 1, info: 2 };
  messages.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return messages;
}

// =============================================================================
// Styles
// =============================================================================

const severityStyles = {
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '❌',
    iconColor: 'text-red-400',
    text: 'text-red-300',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: '⚠️',
    iconColor: 'text-amber-400',
    text: 'text-amber-300',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'ℹ️',
    iconColor: 'text-blue-400',
    text: 'text-blue-300',
  },
};

// =============================================================================
// Component
// =============================================================================

export function ValidationPanel({
  validation,
  defaultCollapsed = false,
  maxHeight = '200px',
  className = '',
  onNavigate,
}: ValidationPanelProps): React.ReactElement | null {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const messages = useMemo(
    () => extractMessages(validation.result),
    [validation.result]
  );
  
  // Don't render if no messages
  if (messages.length === 0) {
    return null;
  }
  
  const errorCount = messages.filter(m => m.severity === 'error').length;
  const warningCount = messages.filter(m => m.severity === 'warning').length;
  const infoCount = messages.filter(m => m.severity === 'info').length;
  
  const headerBg = errorCount > 0 
    ? 'bg-red-500/20' 
    : warningCount > 0 
    ? 'bg-amber-500/20' 
    : 'bg-blue-500/20';
  
  return (
    <div className={`rounded-lg border border-border-theme overflow-hidden ${className}`}>
      {/* Header - clickable to collapse/expand */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-between px-3 py-2 ${headerBg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            Validation Issues
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            {errorCount > 0 && (
              <span className="flex items-center gap-0.5 text-red-400">
                <span>❌</span>
                <span>{errorCount}</span>
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400">
                <span>⚠️</span>
                <span>{warningCount}</span>
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-0.5 text-blue-400">
                <span>ℹ️</span>
                <span>{infoCount}</span>
              </span>
            )}
          </div>
        </div>
        <span className="text-slate-400 text-sm">
          {isCollapsed ? '▼' : '▲'}
        </span>
      </button>
      
      {/* Message list */}
      {!isCollapsed && (
        <div 
          className="bg-surface-base overflow-y-auto"
          style={{ maxHeight }}
        >
          <ul className="divide-y divide-border-theme">
            {messages.map((msg) => {
              const style = severityStyles[msg.severity];
              const isClickable = !!onNavigate;
              
              return (
                <li
                  key={msg.id}
                  className={`flex items-start gap-2 px-3 py-2 ${style.bg} ${isClickable ? 'cursor-pointer hover:brightness-110 transition-all' : ''}`}
                  onClick={isClickable ? () => onNavigate(msg.targetTab) : undefined}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={isClickable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate(msg.targetTab);
                    }
                  } : undefined}
                >
                  <span className={`flex-shrink-0 ${style.iconColor}`}>
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${style.text}`}>
                      {msg.message}
                    </p>
                    {isClickable && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Go to {msg.targetTabLabel} →
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Compact validation indicator that can be used inline
 */
export function ValidationIndicator({
  validation,
  className = '',
}: {
  validation: UnitValidationState;
  className?: string;
}): React.ReactElement | null {
  if (validation.isValid) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {validation.errorCount > 0 && (
        <span className="text-red-400">
          ❌ {validation.errorCount}
        </span>
      )}
      {validation.warningCount > 0 && (
        <span className="text-amber-400">
          ⚠️ {validation.warningCount}
        </span>
      )}
    </div>
  );
}
