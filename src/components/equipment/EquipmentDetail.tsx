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
      className={`equipment-detail fixed inset-0 z-20 bg-white dark:bg-gray-900 transform transition-transform duration-300 translate-x-0 ${className}`.trim()}
      style={{
        animation: 'slideInRight 300ms ease-out',
      }}
    >
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-safe pt-4 pb-3 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full min-h-[44px] min-w-[44px]"
            aria-label="Go back"
          >
            <svg
              className="w-6 h-6"
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
          <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white truncate">
            Equipment Details
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Equipment name */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {item.name}
        </h2>

        {/* Stats sections */}
        <div className="space-y-4">
          {/* Basic info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Category</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Weight</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.weight} tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Critical Slots</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.criticalSlots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tech Base</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.techBase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cost</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.costCBills.toLocaleString()} C-Bills</span>
              </div>
            </div>
          </div>

          {/* Combat stats (only shown for weapons) */}
          {weaponDetails && (weaponDetails.damage !== undefined || weaponDetails.range || weaponDetails.heat !== undefined) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Combat Stats
              </h3>
              <div className="space-y-2">
                {weaponDetails.damage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Damage</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{weaponDetails.damage}</span>
                  </div>
                )}
                {weaponDetails.range && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Range</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{weaponDetails.range}</span>
                  </div>
                )}
                {weaponDetails.heat !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Heat</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{weaponDetails.heat}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Description
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons at bottom */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 p-safe">
        {onAssign && (
          <button
            type="button"
            onClick={onAssign}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium min-h-[44px] transition-colors"
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
