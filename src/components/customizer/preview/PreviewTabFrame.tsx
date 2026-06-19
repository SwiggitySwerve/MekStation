import React from 'react';

import { PaperSize } from '@/types/printing';

import { PreviewToolbar } from './PreviewToolbar';

export interface PreviewToolbarActions {
  onExportPDF: () => Promise<void>;
  onPrint: () => Promise<void>;
  paperSize: PaperSize;
  onPaperSizeChange: (paperSize: PaperSize) => void;
}

interface PreviewTabFrameProps {
  className?: string;
  testId?: string;
  toolbarActions: PreviewToolbarActions;
  children: React.ReactNode;
}

export function PreviewTabFrame({
  className = '',
  testId,
  toolbarActions,
  children,
}: PreviewTabFrameProps): React.ReactElement {
  return (
    <div
      className={`preview-tab ${className}`}
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1a1a2e',
      }}
    >
      <PreviewToolbar {...toolbarActions} />

      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  );
}
