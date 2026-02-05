import React, { useState } from 'react';

export interface CriticalSlotData {
  id: string;
  index: number;
  equipment: {
    id: string;
    name: string;
    type: string;
    icon?: string;
  } | null;
}

export interface CriticalSlotProps {
  slot: CriticalSlotData;
  onRemove: (slotId: string) => void;
  onAssign?: (slotId: string) => void;
  className?: string;
}

export function CriticalSlot({
  slot,
  onRemove,
  onAssign,
  className = '',
}: CriticalSlotProps): React.ReactElement {
  const [isHighlighted, setIsHighlighted] = useState(false);

  const handleTap = () => {
    if (!slot.equipment && onAssign) {
      onAssign(slot.id);
    } else {
      setIsHighlighted(!isHighlighted);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(slot.id);
  };

  const hasEquipment = slot.equipment !== null;

  return (
    <div
      className={`critical-slot relative min-h-[88px] rounded-lg border-2 bg-gray-50 transition-colors dark:bg-gray-800 ${
        isHighlighted
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      } ${className}`.trim()}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-label={`Critical slot ${slot.index + 1}${hasEquipment && slot.equipment ? ` containing ${slot.equipment.name}` : ' empty'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      {/* Slot number */}
      <div className="absolute top-1 left-2 text-xs text-gray-400 dark:text-gray-500">
        #{slot.index + 1}
      </div>

      {hasEquipment && slot.equipment ? (
        <>
          {/* Equipment icon */}
          <div className="mb-1 flex h-12 items-center justify-center">
            {slot.equipment.icon ? (
              // oxlint-disable-next-line @next/next/no-img-element -- Equipment icons are static SVG/PNG assets
              <img
                src={slot.equipment.icon}
                alt=""
                className="h-10 w-10"
                aria-hidden="true"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg
                  className="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Equipment name */}
          <div className="px-2 text-center">
            <p className="line-clamp-2 text-xs font-medium text-gray-900 dark:text-white">
              {slot.equipment.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {slot.equipment.type}
            </p>
          </div>

          {/* Remove button - visible when highlighted */}
          {isHighlighted && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full bg-red-500 p-1 transition-colors hover:bg-red-600"
              aria-label={`Remove ${slot.equipment.name} from slot ${slot.index + 1}`}
            >
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </>
      ) : (
        <>
          {/* Empty slot state */}
          <div className="flex h-full flex-col items-center justify-center px-2 py-4">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <svg
                className="h-6 w-6 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              {onAssign ? 'Tap to assign' : 'Empty slot'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export interface CriticalSlotsGridProps {
  slots: CriticalSlotData[];
  onRemove: (slotId: string) => void;
  onAssign?: (slotId: string) => void;
  className?: string;
}

export function CriticalSlotsGrid({
  slots,
  onRemove,
  onAssign,
  className = '',
}: CriticalSlotsGridProps): React.ReactElement {
  return (
    <div
      className={`critical-slots-grid grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${className}`.trim()}
    >
      {slots.map((slot) => (
        <CriticalSlot
          key={slot.id}
          slot={slot}
          onRemove={onRemove}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
}
