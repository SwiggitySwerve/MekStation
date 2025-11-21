import React from 'react';

interface ArmorHistoryManagerProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historyLength: number;
  currentIndex: number;
}

const ArmorHistoryManager: React.FC<ArmorHistoryManagerProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyLength,
  currentIndex,
}) => {
  return (
    <div className="armor-history-manager bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              canUndo
                ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                : 'bg-gray-900 text-gray-600 cursor-not-allowed'
            }`}
            title="Undo last change (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>

          {/* Redo Button */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              canRedo
                ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                : 'bg-gray-900 text-gray-600 cursor-not-allowed'
            }`}
            title="Redo last change (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
            Redo
          </button>

          {/* History Counter */}
          <div className="ml-4 text-xs text-gray-400">
            History: {currentIndex + 1} / {historyLength}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-gray-500">
          <span className="hidden lg:inline">
            Keyboard: Ctrl+Z (Undo), Ctrl+Y (Redo)
          </span>
        </div>
      </div>

      {/* History Timeline (optional visual) */}
      {historyLength > 1 && (
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: historyLength }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentIndex
                  ? 'bg-blue-600'
                  : 'bg-gray-700'
              }`}
              title={`History point ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Hook for keyboard shortcuts
export const useArmorHistoryKeyboard = (
  onUndo: () => void,
  onRedo: () => void,
  canUndo: boolean,
  canRedo: boolean
) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo();
      }
      
      // Check for Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z (Redo)
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        if (canRedo) {
          e.preventDefault();
          onRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);
};

export default ArmorHistoryManager;
