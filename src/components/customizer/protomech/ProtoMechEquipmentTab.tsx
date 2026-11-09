/**
 * ProtoMechEquipmentTab
 *
 * The equipment database filtered to what a ProtoMech can mount, and the loadout
 * with a location per mount. MegaMekLab 62bf193 PMEquipmentTab shows the same two
 * lists (database filtered by ProtoMekUtil.isProtoMekEquipment; loadout without
 * jump jets, MASC, partial wing, magnetic clamp and UMU) and places mounts in its
 * Assign Criticals tab; here the location is chosen in the loadout list.
 *
 * Limits come from `construction/protomech/mainGun.ts` (TestProtoMek.java,
 * MegaMek 48fcb2f64); this tab never repairs or discards a source value.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import React from 'react';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { isProtoMechCatalogEquipment } from '@/utils/construction/protomech/equipmentLegality';

import { EquipmentBrowser } from '../equipment/EquipmentBrowser';
import { customizerStyles as cs } from '../styles';
import { useProtoMechEquipmentTabControls } from './ProtoMechEquipmentTab.logic';

export interface ProtoMechEquipmentTabProps {
  readOnly?: boolean;
  className?: string;
}

export function ProtoMechEquipmentTab({
  readOnly = false,
  className = '',
}: ProtoMechEquipmentTabProps): React.ReactElement {
  const unitId = useProtoMechStore((s) => s.id);
  const controls = useProtoMechEquipmentTabControls(readOnly);

  return (
    <div
      className={`flex h-full flex-col gap-4 ${className}`}
      data-testid="protomech-equipment-tab"
    >
      {/* A ProtoMech's own mounts can fill the panel; the catalog keeps a usable
          height and the tab scrolls instead of squeezing it to nothing. */}
      <div
        className="min-h-[26rem] flex-1"
        data-testid="protomech-equipment-browser"
      >
        <EquipmentBrowser
          key={unitId}
          readOnly={readOnly}
          addHint="Added to the Torso. Choose a location in the loadout."
          onAddEquipment={controls.handleAdd}
          catalogFilter={isProtoMechCatalogEquipment}
          className="h-full"
        />
      </div>

      <div
        className={`${cs.panel.main} shrink-0`}
        data-testid="protomech-equipment-mounted"
      >
        <h3 className={cs.text.sectionTitle}>
          Mounted Equipment ({controls.mounts.length})
        </h3>
        {controls.mounts.length === 0 ? (
          <div className={cs.panel.empty}>
            <p className="text-text-theme-secondary">No equipment mounted</p>
          </div>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-auto">
            {controls.mounts.map((mount) => (
              <li
                key={mount.id}
                className="bg-surface-raised/50 border-border-theme-subtle flex items-center gap-2 rounded border p-2"
              >
                <span className="text-text-theme-primary min-w-0 flex-1 truncate text-sm">
                  {mount.name}
                </span>
                <select
                  aria-label={`Location of ${mount.name}`}
                  value={mount.location}
                  onChange={(event) =>
                    controls.handleMove(
                      mount.id,
                      event.target.value as typeof mount.location,
                    )
                  }
                  disabled={readOnly}
                  className={`${cs.select.inline} w-28`}
                >
                  {controls.locationOptionsFor(mount).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove ${mount.name}`}
                  onClick={() => controls.handleRemove(mount.id)}
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
            data-testid="protomech-equipment-errors"
            role="alert"
            className="mt-4 list-disc space-y-1 pl-5 text-xs text-red-400"
          >
            {controls.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>

      {readOnly && (
        <div className={cs.panel.notice}>
          This ProtoMech is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

export default ProtoMechEquipmentTab;
