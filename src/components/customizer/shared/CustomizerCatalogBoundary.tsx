import React from 'react';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';

import { CustomizerLoadingSkeleton } from '../CustomizerLoadingSkeleton';

/** Mount inside the family's provider so the pending diagram uses its real state. */
export function CustomizerCatalogBoundary({
  family,
  tabs,
  diagram,
  readOnly,
  children,
}: {
  family: string;
  tabs: readonly { id: string; label: string }[];
  diagram: React.ReactNode;
  readOnly?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const { isReady, error, retry } = useEquipmentRegistry();
  if (isReady) return <>{children}</>;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {error && (
        <div role="alert" className="text-text-theme-primary p-4">
          <p>Equipment catalog unavailable: {error.message}</p>
          <button
            className="bg-accent text-surface-deep mt-2 min-h-11 rounded px-4"
            onClick={retry}
          >
            Retry equipment catalog
          </button>
        </div>
      )}
      <CustomizerLoadingSkeleton
        label={`Loading ${family}`}
        family={family}
        tabs={tabs}
        diagram={diagram}
        readOnly={readOnly}
      />
    </div>
  );
}
