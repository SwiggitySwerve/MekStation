/**
 * Action Bar Component
 * Phase-specific action buttons for the gameplay view.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useCallback } from 'react';
import { GamePhase, getPhaseActions, IPhaseAction } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface ActionBarProps {
  /** Current game phase */
  phase: GamePhase;
  /** Can the player undo the last action? */
  canUndo: boolean;
  /** Is player currently able to act? */
  canAct: boolean;
  /** Callback when an action is triggered */
  onAction: (actionId: string) => void;
  /** Optional additional info to display */
  infoText?: string;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ActionButtonProps {
  action: IPhaseAction;
  onClick: () => void;
  disabled: boolean;
}

function ActionButton({ action, onClick, disabled }: ActionButtonProps): React.ReactElement {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const primaryClasses = action.primary
    ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
    : 'bg-surface-raised hover:bg-surface-deep text-text-theme-primary focus:ring-border-theme';
  
  const disabledClasses = disabled || !action.enabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !action.enabled}
      className={`${baseClasses} ${primaryClasses} ${disabledClasses}`}
      title={action.tooltip || (action.shortcut ? `${action.label} (${action.shortcut})` : action.label)}
      data-testid={`action-btn-${action.id}`}
    >
      {action.label}
      {action.shortcut && (
        <span className="ml-2 text-xs opacity-75">({action.shortcut})</span>
      )}
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Action bar with phase-appropriate controls.
 */
export function ActionBar({
  phase,
  canUndo,
  canAct,
  onAction,
  infoText,
  className = '',
}: ActionBarProps): React.ReactElement {
  const actions = getPhaseActions(phase, canUndo);

  const handleAction = useCallback(
    (actionId: string) => {
      if (canAct) {
        onAction(actionId);
      }
    },
    [canAct, onAction]
  );

  // Handle keyboard shortcuts
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canAct) return;

      // Find matching action by shortcut
      for (const action of actions) {
        if (!action.enabled || !action.shortcut) continue;

        const shortcut = action.shortcut.toLowerCase();
        const key = event.key.toLowerCase();

        // Handle Ctrl+key shortcuts
        if (shortcut.startsWith('ctrl+')) {
          const shortcutKey = shortcut.replace('ctrl+', '');
          if (event.ctrlKey && key === shortcutKey) {
            event.preventDefault();
            onAction(action.id);
            return;
          }
        }
        // Handle Enter
        else if (shortcut === 'enter' && key === 'enter') {
          event.preventDefault();
          onAction(action.id);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, canAct, onAction]);

   return (
     <div
       className={`bg-surface-base border-t border-border-theme px-4 py-3 flex items-center justify-between ${className}`}
       role="toolbar"
       aria-label="Game actions"
       data-testid="action-bar"
     >
       <div className="flex items-center gap-2">
         {actions.map((action) => (
           <ActionButton
             key={action.id}
             action={action}
             onClick={() => handleAction(action.id)}
             disabled={!canAct}
           />
         ))}
       </div>
       {infoText && (
         <div className="text-sm text-text-theme-secondary">
           {infoText}
         </div>
       )}
     </div>
   );
}

export default ActionBar;
