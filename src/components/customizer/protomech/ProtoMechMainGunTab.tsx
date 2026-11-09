/**
 * ProtoMechMainGunTab
 *
 * The Main Gun mount, what is mounted in it, its slot use against the pinned
 * limit, and the placement findings. MegaMekLab 62bf193 keeps the mount as a
 * checkbox in PMChassisView and assigns weapons from its Equipment and Assign
 * Criticals tabs; MekStation shows it as its own tab, like the vehicle turret.
 *
 * Limits come from `construction/protomech/mainGun.ts` (TestProtoMek.java,
 * MegaMek 48fcb2f64); this tab never repairs or discards a source value.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import React from 'react';

import { customizerStyles as cs } from '../styles';
import { useProtoMechMainGunTabControls } from './ProtoMechMainGunTab.logic';

export interface ProtoMechMainGunTabProps {
  readOnly?: boolean;
  className?: string;
}

export function ProtoMechMainGunTab({
  readOnly = false,
  className = '',
}: ProtoMechMainGunTabProps): React.ReactElement {
  const controls = useProtoMechMainGunTabControls(readOnly);

  return (
    <div
      className={`space-y-6 ${className}`}
      data-testid="protomech-main-gun-tab"
    >
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Main Gun</h3>
        <label className="mb-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            aria-label="Main Gun mount"
            checked={controls.hasMainGun}
            onChange={controls.handleMainGunChange}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className="text-text-theme-primary text-sm">
            Main Gun Mount
          </span>
        </label>

        <div className="mb-3 text-sm">
          <span className={cs.text.secondary}>Slots in use: </span>
          <span
            data-testid="protomech-main-gun-slots"
            className="text-accent font-semibold"
          >
            {controls.slotsUsed} / {controls.slotLimit}
          </span>
        </div>

        {controls.mounts.length === 0 ? (
          <p
            data-testid="protomech-main-gun-empty"
            className={cs.text.secondary}
          >
            Nothing is mounted in the Main Gun. Weapons are assigned from the
            Equipment tab.
          </p>
        ) : (
          <ul data-testid="protomech-main-gun-contents" className="space-y-2">
            {controls.mounts.map((mount) => (
              <li
                key={mount.id}
                className="bg-surface-raised border-border-theme flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span className="text-text-theme-primary">{mount.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${mount.name} from Main Gun`}
                  onClick={() => controls.handleRemoveMount(mount.id)}
                  disabled={readOnly}
                  className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {controls.errors.length > 0 && (
          <ul
            data-testid="protomech-main-gun-errors"
            role="alert"
            className="mt-4 list-disc space-y-1 pl-5 text-xs text-red-400"
          >
            {controls.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ProtoMechMainGunTab;
