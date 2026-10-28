import React from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { Button } from '@/components/ui/Button';

import { SeverityIcon } from '../shared/BuildStatusLabel';

/**
 * The banner's one action, outlined in its red status tone (not a pale grey
 * chip), so it reads as the way to resolve the error.
 */
const PLACE_ACTION_CLASS =
  'shrink-0 !border-red-400/70 !bg-red-400/10 !text-red-300 hover:!bg-red-400/20 aria-pressed:!bg-red-400/25';

interface CriticalSlotsPlaceBannerProps {
  readonly unassignedEquipment: readonly IMountedEquipmentInstance[];
  readonly selectedEquipmentId?: string | null;
  readonly readOnly: boolean;
  readonly onSelectEquipment?: (id: string | null) => void;
}

/** Error banner for equipment that still needs slots, with one Select action. */
export function CriticalSlotsPlaceBanner({
  unassignedEquipment,
  selectedEquipmentId,
  readOnly,
  onSelectEquipment,
}: CriticalSlotsPlaceBannerProps): React.ReactElement | null {
  const firstUnassigned = unassignedEquipment[0];
  if (!firstUnassigned) return null;

  return (
    <section
      aria-label="Equipment to place"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-red-400/20 bg-red-400/5 px-3 py-0.5 text-sm max-sm:flex-nowrap"
    >
      <p
        className="text-text-theme-secondary min-w-0 max-sm:flex-1 max-sm:truncate"
        title={firstUnassigned.name}
      >
        <span className="font-medium text-red-400">
          <SeverityIcon kind="error" className="mr-1 inline-block" />
          {unassignedEquipment.length}{' '}
          {unassignedEquipment.length === 1 ? 'item' : 'items'} to place:{' '}
          {firstUnassigned.name}
          {unassignedEquipment.length > 1 &&
            ` and ${unassignedEquipment.length - 1} more`}
        </span>
        {/* The button below says "Select <name>", so the text never
            repeats it: before a selection it gives the size to find room
            for, after it the next step. */}
        {readOnly ? (
          ' — read-only.'
        ) : selectedEquipmentId === firstUnassigned.instanceId ? (
          <span className="hidden sm:inline">
            {' — '}
            <span className="hidden pointer-fine:inline">click</span>
            <span className="pointer-fine:hidden">tap</span>
            {' a highlighted slot or drag.'}
          </span>
        ) : unassignedEquipment.length === 1 ? (
          <span className="hidden sm:inline">
            {` — needs ${firstUnassigned.criticalSlots} ${firstUnassigned.criticalSlots === 1 ? 'slot' : 'slots'}.`}
          </span>
        ) : null}
      </p>
      {onSelectEquipment && !readOnly && (
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={selectedEquipmentId === firstUnassigned.instanceId}
          onClick={() => onSelectEquipment(firstUnassigned.instanceId)}
          className={PLACE_ACTION_CLASS}
        >
          Select {firstUnassigned.name}
        </Button>
      )}
    </section>
  );
}
