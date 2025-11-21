/**
 * Simple armor efficiency notification for the customizer v2 armor tab
 * Detects and warns about wasted armor points due to smart caps
 */

import React from 'react';

export interface ArmorEfficiencyNotificationProps {
  unit: any; // UnitCriticalManager instance
  onOptimizeArmor?: (newTonnage: number) => void;
  readOnly?: boolean;
}

export const ArmorEfficiencyNotification: React.FC<ArmorEfficiencyNotificationProps> = ({
  unit,
  onOptimizeArmor,
  readOnly = false,
}) => {
  // Use the data model's armor waste analysis method
  const stats = unit.getArmorWasteAnalysis();
  const config = unit.getConfiguration();
  const maxArmorTonnage = unit.getMaxArmorTonnage();

  // Only show when at maximum armor tonnage AND there's waste
  const isAtMaxTonnage = config.armorTonnage >= maxArmorTonnage;
  const hasWaste = stats.totalWasted > 0;

  // Don't render unless we're at max tonnage with waste
  if (!isAtMaxTonnage || !hasWaste) {
    return null;
  }

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded p-2 mb-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">⚠️</span>
          <span className="text-yellow-100">
            Armor Efficiency Warning: <strong>{stats.totalWasted} points</strong> wasted
          </span>
        </div>
        <div className="text-yellow-300 font-medium">
          {(100 - stats.wastePercentage).toFixed(0)}% efficient
        </div>
      </div>
    </div>
  );
};

export default ArmorEfficiencyNotification;
