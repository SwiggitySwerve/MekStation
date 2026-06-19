import React from 'react';

interface BreakdownDialogShellProps {
  onClose: () => void;
  overlayClassName: string;
  panelClassName: string;
  labelledBy?: string;
  children: React.ReactNode;
}

export function BreakdownDialogShell({
  onClose,
  overlayClassName,
  panelClassName,
  labelledBy,
  children,
}: BreakdownDialogShellProps): React.ReactElement {
  return (
    <div
      className={overlayClassName}
      role={labelledBy ? 'dialog' : undefined}
      aria-modal={labelledBy ? 'true' : undefined}
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
