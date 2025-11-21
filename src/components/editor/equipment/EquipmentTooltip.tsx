import React from 'react';

interface EquipmentTooltipProps {
  equipment: {
    name: string;
    type: string;
    damage?: number | string;
    heat?: number;
    minRange?: number;
    shortRange?: number;
    mediumRange?: number;
    longRange?: number;
    weight: number;
    crits: number;
    cost?: number;
    bv?: number;
    ammoPerTon?: number;
    techBase?: string;
    availability?: string;
    description?: string;
  };
  children: React.ReactNode;
}

const EquipmentTooltip: React.FC<EquipmentTooltipProps> = ({ equipment, children }) => {
  const formatRange = () => {
    if (equipment.minRange || equipment.shortRange || equipment.mediumRange || equipment.longRange) {
      const ranges = [];
      if (equipment.minRange) ranges.push(`Min: ${equipment.minRange}`);
      if (equipment.shortRange) ranges.push(`Short: ${equipment.shortRange}`);
      if (equipment.mediumRange) ranges.push(`Med: ${equipment.mediumRange}`);
      if (equipment.longRange) ranges.push(`Long: ${equipment.longRange}`);
      return ranges.join(' / ');
    }
    return null;
  };

  const getDamageDisplay = () => {
    if (!equipment.damage) return null;
    if (typeof equipment.damage === 'string') return equipment.damage;
    return equipment.damage.toString();
  };

  return (
    <div className="relative group inline-block">
      {children}
      
      {/* Tooltip */}
      <div className="invisible group-hover:visible absolute z-50 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none -top-2 left-full ml-2">
        {/* Arrow */}
        <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-900"></div>
        
        {/* Content */}
        <div className="space-y-2">
          {/* Header */}
          <div>
            <div className="font-semibold text-sm">{equipment.name}</div>
            <div className="text-gray-400">{equipment.type}</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-gray-700">
            {/* Damage */}
            {getDamageDisplay() && (
              <>
                <div className="text-gray-400">Damage:</div>
                <div className="font-medium">{getDamageDisplay()}</div>
              </>
            )}

            {/* Heat */}
            {equipment.heat !== undefined && (
              <>
                <div className="text-gray-400">Heat:</div>
                <div className="font-medium">{equipment.heat}</div>
              </>
            )}

            {/* Weight */}
            <div className="text-gray-400">Weight:</div>
            <div className="font-medium">{equipment.weight} tons</div>

            {/* Crits */}
            <div className="text-gray-400">Crits:</div>
            <div className="font-medium">{equipment.crits}</div>

            {/* BV */}
            {equipment.bv && (
              <>
                <div className="text-gray-400">BV:</div>
                <div className="font-medium">{equipment.bv}</div>
              </>
            )}

            {/* Cost */}
            {equipment.cost && (
              <>
                <div className="text-gray-400">Cost:</div>
                <div className="font-medium">{equipment.cost.toLocaleString()} C-bills</div>
              </>
            )}

            {/* Ammo */}
            {equipment.ammoPerTon && (
              <>
                <div className="text-gray-400">Ammo/Ton:</div>
                <div className="font-medium">{equipment.ammoPerTon}</div>
              </>
            )}

            {/* Tech Base */}
            {equipment.techBase && (
              <>
                <div className="text-gray-400">Tech Base:</div>
                <div className="font-medium">{equipment.techBase}</div>
              </>
            )}
          </div>

          {/* Range */}
          {formatRange() && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-400 mb-1">Range:</div>
              <div className="font-medium">{formatRange()}</div>
            </div>
          )}

          {/* Availability */}
          {equipment.availability && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-400">Availability:</div>
              <div className="font-medium">{equipment.availability}</div>
            </div>
          )}

          {/* Description */}
          {equipment.description && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-300 leading-relaxed">{equipment.description}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentTooltip;
