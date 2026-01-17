import React, { useState, useRef, useEffect } from 'react';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { IUnitValidationError, UnitValidationSeverity } from '@/types/validation/UnitValidationInterfaces';
import { getTabForCategory, getTabLabel } from '@/utils/validation/validationNavigation';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';

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
      const severity = error.severity === UnitValidationSeverity.CRITICAL_ERROR ? 'critical' : 'error';
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
  critical: { bg: 'bg-red-500/20', text: 'text-red-300', icon: '🚫', label: 'Critical' },
  error: { bg: 'bg-red-500/10', text: 'text-red-300', icon: '❌', label: 'Error' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-300', icon: '⚠️', label: 'Warning' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-300', icon: 'ℹ️', label: 'Info' },
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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  if (validation.isValid) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 ${className}`}>
        <span>✓</span>
        <span>Valid</span>
      </span>
    );
  }
  
  const badgeBg = validation.errorCount > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-amber-500/20 border-amber-500/30';
  const badgeText = validation.errorCount > 0 ? 'text-red-300' : 'text-amber-300';
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border transition-all hover:brightness-110 ${badgeBg} ${badgeText}`}
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
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 max-w-[90vw] bg-surface-raised border border-border-theme rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 bg-surface-base border-b border-border-theme">
            <span className="text-sm font-medium text-white">Validation Issues</span>
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
                  className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:brightness-110 transition-all ${style.bg} border-b border-border-theme/50 last:border-b-0`}
                >
                  <span className="flex-shrink-0 text-sm">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${style.text} line-clamp-2`}>
                      {item.error.message}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {style.label} • Go to {tabLabel} →
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          
          {remainingCount > 0 && (
            <div className="px-3 py-2 bg-surface-base border-t border-border-theme text-center">
              <span className="text-xs text-slate-400">
                +{remainingCount} more issue{remainingCount !== 1 ? 's' : ''} in panel below
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
