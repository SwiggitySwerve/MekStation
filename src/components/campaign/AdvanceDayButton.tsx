import React, { useState } from 'react';

export type BlockingActionType = 'assign_pilots' | 'resolve_repair' | 'select_contract' | 'other';

export interface BlockingAction {
  type: BlockingActionType;
  message: string;
  count?: number;
}

export interface AdvanceDayButtonProps {
  blockers?: BlockingAction[];
  onAdvance?: () => void;
  onBlockerClick?: (blocker: BlockingAction) => void;
  disabled?: boolean;
  className?: string;
}

export function AdvanceDayButton({
  blockers = [],
  onAdvance,
  onBlockerClick,
  disabled = false,
  className = '',
}: AdvanceDayButtonProps): React.ReactElement {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const hasBlockers = blockers.length > 0;
  const firstBlocker = blockers[0];
  const hasMultipleBlockers = blockers.length > 1;

  const formatBlockerMessage = (blocker: BlockingAction): string => {
    if (blocker.count && blocker.count > 0) {
      return `${blocker.message} (${blocker.count})`;
    }
    return blocker.message;
  };

  const handleClick = () => {
    if (disabled) return;
    
    if (hasBlockers && firstBlocker) {
      onBlockerClick?.(firstBlocker);
    } else {
      onAdvance?.();
    }
  };

  const baseStyles = `
    relative
    min-w-[160px] min-h-[60px]
    px-8 py-4
    rounded-xl
    font-bold text-lg
    uppercase tracking-wide
    transition-all duration-200
    select-none
    cursor-pointer
    border-2
    shadow-lg
    focus:outline-none focus:ring-4
  `;

  const readyStyles = `
    bg-gradient-to-b from-emerald-400 to-emerald-600
    border-emerald-300
    text-white
    shadow-emerald-500/40
    hover:from-emerald-300 hover:to-emerald-500
    hover:shadow-emerald-400/50 hover:shadow-xl
    hover:scale-[1.02]
    focus:ring-emerald-400/50
    animate-advance-pulse
  `;

  const blockedStyles = `
    bg-gradient-to-b from-amber-400 to-amber-600
    border-amber-300
    text-amber-950
    shadow-amber-500/30
    hover:from-amber-300 hover:to-amber-500
    hover:shadow-amber-400/40 hover:shadow-xl
    hover:scale-[1.02]
    focus:ring-amber-400/50
  `;

  const disabledStyles = `
    bg-gradient-to-b from-slate-500 to-slate-600
    border-slate-400
    text-slate-300
    shadow-slate-500/20
    cursor-not-allowed
    opacity-60
  `;

  const currentStyles = disabled 
    ? disabledStyles 
    : hasBlockers 
      ? blockedStyles 
      : readyStyles;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        data-testid="advance-day-button"
        onClick={handleClick}
        disabled={disabled}
        onMouseEnter={() => hasMultipleBlockers && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${baseStyles} ${currentStyles}`}
        style={{
          textShadow: hasBlockers ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {!disabled && !hasBlockers && (
          <span 
            className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-md animate-advance-glow"
            aria-hidden="true"
          />
        )}
        
        <span className="relative flex items-center justify-center gap-3">
          {hasBlockers ? (
            <>
              <svg 
                className="w-5 h-5 flex-shrink-0" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>{firstBlocker && formatBlockerMessage(firstBlocker)}</span>
              {hasMultipleBlockers && (
                <span className="text-sm opacity-75">+{blockers.length - 1}</span>
              )}
            </>
          ) : (
            <>
              <span>Advance Day</span>
              <svg 
                className="w-5 h-5 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M13 7l5 5m0 0l-5 5m5-5H6" 
                />
              </svg>
            </>
          )}
        </span>
      </button>

      {showTooltip && hasMultipleBlockers && (
        <div 
          className="
            absolute left-1/2 -translate-x-1/2 bottom-full mb-3
            px-4 py-3 
            bg-slate-900 border border-slate-700
            rounded-lg shadow-xl
            text-sm text-slate-200
            whitespace-nowrap
            z-50
          "
          role="tooltip"
        >
          <div className="font-semibold text-amber-400 mb-2">
            Blocking Actions ({blockers.length})
          </div>
          <ul className="space-y-1">
            {blockers.map((blocker, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {formatBlockerMessage(blocker)}
              </li>
            ))}
          </ul>
          <div 
            className="
              absolute left-1/2 -translate-x-1/2 top-full
              w-0 h-0 
              border-l-8 border-r-8 border-t-8
              border-l-transparent border-r-transparent border-t-slate-900
            "
          />
        </div>
      )}

      <style>{`
        @keyframes advance-pulse {
          0%, 100% {
            box-shadow: 
              0 10px 15px -3px rgba(16, 185, 129, 0.4),
              0 4px 6px -4px rgba(16, 185, 129, 0.3),
              0 0 0 0 rgba(52, 211, 153, 0.4);
          }
          50% {
            box-shadow: 
              0 10px 15px -3px rgba(16, 185, 129, 0.4),
              0 4px 6px -4px rgba(16, 185, 129, 0.3),
              0 0 0 6px rgba(52, 211, 153, 0);
          }
        }
        
        @keyframes advance-glow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.02);
          }
        }
        
        .animate-advance-pulse {
          animation: advance-pulse 2s ease-in-out infinite;
        }
        
        .animate-advance-glow {
          animation: advance-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default AdvanceDayButton;
