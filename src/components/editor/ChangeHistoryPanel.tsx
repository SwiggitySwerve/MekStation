import React from 'react';

// Simple relative time formatter
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (seconds > 0) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  return 'just now';
}

interface HistoryEntry {
  description: string;
  timestamp: number;
  isCurrent: boolean;
}

interface ChangeHistoryPanelProps {
  history: HistoryEntry[];
  onSelectEntry?: (index: number) => void;
  className?: string;
}

const ChangeHistoryPanel: React.FC<ChangeHistoryPanelProps> = ({
  history,
  onSelectEntry,
  className = '',
}) => {
  return (
    <div className={`change-history-panel bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Change History</h3>
      
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No changes yet</p>
        ) : (
          history.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className={`
                flex items-center justify-between p-2 rounded text-xs cursor-pointer
                transition-colors duration-150
                ${entry.isCurrent 
                  ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                  : 'hover:bg-gray-50 text-gray-700'
                }
              `}
              onClick={() => onSelectEntry?.(index)}
            >
              <div className="flex items-center space-x-2">
                <div className={`
                  w-2 h-2 rounded-full
                  ${entry.isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                `} />
                <span className={entry.isCurrent ? 'font-medium' : ''}>
                  {entry.description}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChangeHistoryPanel;
