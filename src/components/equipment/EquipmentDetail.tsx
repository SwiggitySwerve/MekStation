import React from 'react';

import { IEquipmentItem } from '../../types/equipment';

/**
 * Extended equipment details for weapon-specific display
 * Used to show combat stats when available
 */
export interface WeaponDetails {
  damage?: number | string;
  range?: string;
  heat?: number;
}

export interface EquipmentDetailProps {
  item: IEquipmentItem;
  weaponDetails?: WeaponDetails;
  description?: string;
  onBack: () => void;
  onAssign?: () => void;
  className?: string;
}

export function EquipmentDetail({
  item,
  weaponDetails,
  description,
  onBack,
  onAssign,
  className = '',
}: EquipmentDetailProps): React.ReactElement {
  return (
    <div
      className={`equipment-detail fixed inset-0 z-20 translate-x-0 transform bg-white transition-transform duration-300 dark:bg-gray-900 ${className}`.trim()}
      style={{
        animation: 'slideInRight 300ms ease-out',
      }}
    >
      {/* Header with back button */}
      <div className="p-safe sticky top-0 z-10 border-b border-gray-200 bg-white px-4 pt-4 pb-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Go back"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="flex-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
            Equipment Details
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Equipment name */}
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          {item.name}
        </h2>

        {/* Stats sections */}
        <div className="space-y-4">
          {/* Basic info */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Category
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Weight
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.weight} tons
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Critical Slots
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.criticalSlots}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Tech Base
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.techBase}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Cost
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.costCBills.toLocaleString()} C-Bills
                </span>
              </div>
            </div>
          </div>

          {/* Combat stats (only shown for weapons) */}
          {weaponDetails &&
            (weaponDetails.damage !== undefined ||
              weaponDetails.range ||
              weaponDetails.heat !== undefined) && (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Combat Stats
                </h3>
                <div className="space-y-2">
                  {weaponDetails.damage !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Damage
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {weaponDetails.damage}
                      </span>
                    </div>
                  )}
                  {weaponDetails.range && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Range
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {weaponDetails.range}
                      </span>
                    </div>
                  )}
                  {weaponDetails.heat !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Heat
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {weaponDetails.heat}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Description */}
          {description && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Description
              </h3>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons at bottom */}
      <div className="p-safe sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {onAssign && (
          <button
            type="button"
            onClick={onAssign}
            className="min-h-[44px] w-full rounded-md bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600"
          >
            Assign Equipment
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
