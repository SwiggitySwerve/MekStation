import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import {
  validateSavedBattleMechIndex,
  type SavedDesignOption,
} from '@/services/units/savedDesignIndex';

export function SavedDesignPicker({
  loadSavedDesignIndex,
  onAdd,
}: {
  loadSavedDesignIndex: () => Promise<readonly unknown[]>;
  onAdd: (
    name: string,
    tonnage: number,
    unitRef: string,
    sourceVersion: number,
  ) => void;
}): React.ReactElement {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    options: readonly SavedDesignOption[];
    rejected: number;
  }>({ status: 'loading', options: [], rejected: 0 });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading', options: [], rejected: 0 });
    void loadSavedDesignIndex()
      .then((rows) => {
        if (!live) return;
        const mapped = validateSavedBattleMechIndex(rows);
        setState({
          status: 'ready',
          options: mapped.options,
          rejected: mapped.rejected.length,
        });
      })
      .catch(() => {
        if (live) setState({ status: 'error', options: [], rejected: 0 });
      });
    return () => {
      live = false;
    };
  }, [tick, loadSavedDesignIndex]);
  const { status, options, rejected } = state;
  const statusMessage =
    status === 'loading'
      ? 'Loading saved designs'
      : status === 'error'
        ? 'Saved designs unavailable'
        : options.length === 0
          ? 'No saved designs'
          : rejected > 0
            ? `${rejected} saved designs unavailable`
            : `${options.length} saved designs ready`;
  return (
    <div className="mb-4">
      <h3
        className="text-text-theme-primary mb-2 text-sm font-medium"
        data-camp01-fixture-alias="Saved Designs"
        data-camp01-fixture-id="camp01-picker-saved-design"
      >
        Saved Designs
      </h3>
      <p className="text-text-theme-muted mb-2 text-xs" role="status">
        {statusMessage}
      </p>
      {status === 'error' ? (
        <Button
          variant="secondary"
          size="sm"
          aria-label="Retry saved designs"
          onClick={() => setTick((value) => value + 1)}
        >
          Retry
        </Button>
      ) : null}
      {status === 'ready' && options.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-label={`Add saved design ${option.name}`}
              data-testid={`add-saved-design-${option.id}`}
              onClick={() =>
                onAdd(
                  option.name,
                  option.tonnage,
                  option.id,
                  option.currentVersion,
                )
              }
              className="border-border-theme-subtle bg-surface-deep hover:border-accent/50 flex items-center gap-3 rounded-lg border p-3 text-left"
            >
              <span className="text-accent text-sm font-bold">
                {option.tonnage}t
              </span>
              <span className="text-text-theme-primary text-sm font-medium">
                {option.name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
