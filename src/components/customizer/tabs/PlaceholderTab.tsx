import React from 'react';

interface PlaceholderTabProps {
  className?: string;
  testId: string;
  wiredBy: string;
}

export function PlaceholderTab({
  className = '',
  testId,
  wiredBy,
}: PlaceholderTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid={testId}>
      <p className="text-text-theme-secondary text-sm">
        Coming soon - this tab will be wired up by {wiredBy}
      </p>
    </div>
  );
}
