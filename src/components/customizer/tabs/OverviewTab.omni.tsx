import React, { useCallback, useLayoutEffect, useRef } from 'react';

import { useUnitStore, useUnitStoreApi } from '@/stores/useUnitStore';
import {
  captureEquipmentMutationPolicy,
  matchesEquipmentMutationPolicy,
} from '@/utils/construction/equipmentMutationPolicy';

import { useCustomizerConfirmation } from '../dialogs/CustomizerConfirmationProvider';
import { customizerStyles as cs } from '../styles';

export function OverviewOmniControls({
  readOnly,
}: {
  readonly readOnly: boolean;
}): React.ReactElement {
  // OmniMech state and actions
  const isOmni = useUnitStore((s) => s.isOmni);
  const setIsOmni = useUnitStore((s) => s.setIsOmni);
  const unitStore = useUnitStoreApi();
  const { requestConfirmation } = useCustomizerConfirmation();
  const committed = useRef<{
    readonly unitStore: typeof unitStore;
    readonly readOnly: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    committed.current = { unitStore, readOnly };
  });

  const handleOmniMechChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsOmni(e.target.checked);
    },
    [setIsOmni],
  );

  const handleResetChassis = useCallback(() => {
    const requested = committed.current;
    if (!requested || requested.readOnly) return;
    const snapshot = requested.unitStore.getState();
    if (!snapshot.isOmni) return;
    const policies = captureEquipmentMutationPolicy(snapshot.equipment);
    requestConfirmation({
      title: 'Reset chassis?',
      message:
        'Reset to base chassis configuration? This will remove all pod-mounted equipment.',
      confirmLabel: 'Reset Chassis',
      isCurrent: () => {
        const current = committed.current;
        if (
          !current ||
          current.readOnly ||
          current.unitStore !== requested.unitStore
        )
          return false;
        const state = current.unitStore.getState();
        return (
          state.id === snapshot.id &&
          state.isOmni &&
          matchesEquipmentMutationPolicy(policies, state.equipment)
        );
      },
      onConfirm: () => committed.current?.unitStore.getState().resetChassis(),
    });
  }, [requestConfirmation]);

  return (
    <div
      className="border-border-theme-subtle bg-surface-deep/35 flex flex-wrap items-center gap-x-3 gap-y-2 rounded border px-3"
      data-testid="omnimech-section"
    >
      <input
        type="checkbox"
        id="omniMech"
        checked={isOmni}
        onChange={handleOmniMechChange}
        disabled={readOnly}
        className="border-border-theme-subtle bg-surface-deep text-accent focus:ring-accent h-4 w-4 rounded"
        data-testid="omnimech-checkbox"
      />
      {/* The label is the 44px target for the small native checkbox. The
          hint follows it one space away, like "Clan Name (Optional)". */}
      <span className="inline-flex items-center gap-1">
        <label
          htmlFor="omniMech"
          className={`${cs.text.label} inline-flex min-h-11 cursor-pointer items-center`}
        >
          OmniMech
        </label>
        {/* One muted hint style, the same as "(Optional)". */}
        <span className="text-text-theme-muted text-sm">
          (Modular equipment pods)
        </span>
      </span>
      {isOmni && !readOnly && (
        <button
          type="button"
          onClick={handleResetChassis}
          className="border-border-theme-subtle bg-surface-deep hover:bg-surface-default text-content-secondary hover:text-content-primary min-h-11 rounded border px-3 py-1 text-sm transition-colors sm:ml-auto"
          data-testid="reset-chassis-button"
        >
          Reset Chassis
        </button>
      )}
    </div>
  );
}
