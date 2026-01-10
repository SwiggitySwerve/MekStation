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
      className={`critical-slot relative bg-gray-50 dark:bg-gray-800 rounded-lg border-2 transition-colors min-h-[88px] ${
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

      {hasEquipment ? (
        <>
          {/* Equipment icon */}
          <div className="flex items-center justify-center h-12 mb-1">
            {slot.equipment.icon ? (
              <img
                src={slot.equipment.icon}
                alt=""
                className="w-10 h-10"
                aria-hidden="true"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-500"
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
            <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">
              {slot.equipment.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{slot.equipment.type}</p>
          </div>

          {/* Remove button - visible when highlighted */}
          {isHighlighted && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
              aria-label={`Remove ${slot.equipment.name} from slot ${slot.index + 1}`}
            >
              <svg
                className="w-4 h-4 text-white"
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
          <div className="flex flex-col items-center justify-center h-full py-4 px-2">
            <div className="w-12 h-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center mb-2">
              <svg
                className="w-6 h-6 text-gray-400 dark:text-gray-500"
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
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
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
    <div className={`critical-slots-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ${className}`.trim()}>
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
