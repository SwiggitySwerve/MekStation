import React from 'react';

interface VaultDialogFrameProps {
  children: React.ReactNode;
  overlayClassName?: string;
  panelClassName: string;
}

export function VaultDialogFrame({
  children,
  overlayClassName = '',
  panelClassName,
}: VaultDialogFrameProps): React.ReactElement {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClassName}`}
    >
      <div className={panelClassName}>{children}</div>
    </div>
  );
}
