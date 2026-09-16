import React, { useMemo, useState } from 'react';

import type { IEquipmentItem } from '@/types/equipment';

import { Button } from '@/components/ui/Button';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
import { previewCatalogEquipmentPlacement } from '@/stores/unit/catalogEquipmentPlacement';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';

interface CatalogPlacementDialogProps {
  readonly equipment: IEquipmentItem;
  readonly readOnly: boolean;
  readonly onClose: () => void;
  readonly onPlaced: (message: string) => void;
}

/** @spec openspec/specs/equipment-browser/spec.md */
export function CatalogPlacementDialog({
  equipment,
  readOnly,
  onClose,
  onPlaced,
}: CatalogPlacementDialogProps): React.ReactElement {
  const unit = useUnitStore((state) => state);
  const [location, setLocation] = useState<MechLocation | ''>('');
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(
    () => previewCatalogEquipmentPlacement(equipment, unit, readOnly),
    [equipment, unit, readOnly],
  );
  const option = preview.locations.find(
    (candidate) => candidate.location === location,
  );
  const confirm = (): void => {
    if (readOnly || !location) return;
    const result = unit.addEquipmentAtLocation(equipment, location);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onPlaced(
      `${equipment.name} added to ${location}. Undo reverses the whole addition.`,
    );
  };
  return (
    <DialogTemplate
      isOpen
      onClose={onClose}
      title="Add and place equipment"
      subtitle={equipment.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={readOnly || !option?.canFit || Boolean(preview.error)}
          >
            Add and place
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {preview.equipment && (
          <p className="text-text-theme-primary text-sm">
            Weight change: +{Number(preview.weightChange.toFixed(3))} t ·{' '}
            {preview.equipment.criticalSlots} critical slots
          </p>
        )}
        {preview.error ? (
          <p role="alert" className="text-text-theme-primary text-sm">
            {preview.error}
          </p>
        ) : (
          <>
            <label className="text-text-theme-primary block text-sm">
              Location
              <select
                aria-label="Equipment location"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value as MechLocation | '');
                  setError(null);
                }}
                className="bg-surface-raised border-border-theme focus:outline-accent mt-2 min-h-11 w-full rounded border px-3 focus:outline-2"
              >
                <option value="">Choose a location…</option>
                {preview.locations.map((candidate) => (
                  <option
                    key={candidate.location}
                    value={candidate.location}
                    disabled={!candidate.canFit}
                  >
                    {candidate.location} · {candidate.availableSlots} free
                    {candidate.canFit ? '' : ` — ${candidate.reason}`}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-text-theme-secondary text-xs">
              Choose a legal location. Existing equipment stays in place. Cancel
              leaves the unit unchanged.
            </p>
            {!preview.locations.some((candidate) => candidate.canFit) && (
              <p role="alert" className="text-text-theme-primary text-sm">
                No legal location has enough contiguous space. You can add it
                unassigned and adjust the loadout in Critical Slots.
              </p>
            )}
            {location && !option?.canFit && (
              <p role="alert" className="text-text-theme-primary text-sm">
                {option?.reason ?? 'This location is no longer available.'}
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-text-theme-primary text-sm">
            {error}
          </p>
        )}
      </div>
    </DialogTemplate>
  );
}
