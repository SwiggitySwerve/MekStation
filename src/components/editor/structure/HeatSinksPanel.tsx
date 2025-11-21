import React, { useCallback, useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';
import { calculateInternalHeatSinksForEngine } from '../../../utils/heatSinkCalculations';

interface HeatSinksPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
  onWeightChange?: (weight: number) => void;
}

const HeatSinksPanel: React.FC<HeatSinksPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
  onWeightChange,
}) => {
  // Calculate engine rating
  const engineRating = useMemo(() => {
    const walkMP = unit.data?.movement?.walk_mp || 1;
    return walkMP * unit.mass;
  }, [unit.mass, unit.data?.movement?.walk_mp]);

  // Calculate free heat sinks from engine
  const engineFreeHeatSinks = useMemo(() => {
    // Fusion engines provide free heat sinks based on rating
    const engineType = unit.data?.engine?.type || 'fusion';
    return calculateInternalHeatSinksForEngine(engineRating, engineType);
  }, [engineRating, unit.data?.engine?.type]);

  // Get heat sink type and properties
  const heatSinkType = unit.data?.heat_sinks?.type || 'single';
  const isDualHS = heatSinkType === 'double' || heatSinkType === 'double_clan';
  const heatSinkWeight = isDualHS ? 1.0 : 1.0; // Both single and double are 1 ton each
  const heatDissipation = isDualHS ? 2 : 1;
  const criticalSlots = isDualHS ? 3 : 1;

  // Calculate current heat sink count
  const currentHeatSinkCount = unit.data?.heat_sinks?.count || 10;
  
  // Calculate additional heat sinks (beyond free ones)
  const additionalHeatSinks = Math.max(0, currentHeatSinkCount - engineFreeHeatSinks);
  
  // Calculate weight
  const heatSinkTotalWeight = additionalHeatSinks * heatSinkWeight;
  
  // Calculate total dissipation
  const totalDissipation = currentHeatSinkCount * heatDissipation;

  // Calculate equipment heat generation
  const totalEquipmentHeat = useMemo(() => {
    let heat = 0;
    
    // Add heat from weapons
    unit.equipmentPlacements?.forEach(placement => {
      const equipmentHeat = (placement.equipment as any).heat || 
                           placement.equipment.data?.heatmap || 0;
      heat += Number(equipmentHeat);
    });
    
    // Add heat from jump jets (1 heat per jump MP)
    heat += unit.data?.movement?.jump_mp || 0;
    
    // Add heat from running (+2)
    if (unit.data?.movement?.run_mp && unit.data.movement.run_mp > 0) {
      heat += 2;
    }
    
    return heat;
  }, [unit.equipmentPlacements, unit.data?.movement]);

  // Update heat sinks when values change
  const handleHeatSinkCountChange = useCallback((count: number) => {
    if (count < 10) return; // Minimum 10 heat sinks
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        heat_sinks: {
          ...unit.data.heat_sinks,
          count,
        },
      },
    };
    
    onUnitChange(updatedUnit);
    
    // Update weight in parent
    if (onWeightChange) {
      const newAdditional = Math.max(0, count - engineFreeHeatSinks);
      onWeightChange(newAdditional * heatSinkWeight);
    }
  }, [unit, onUnitChange, onWeightChange, engineFreeHeatSinks, heatSinkWeight]);

  // Handle heat sink type change
  const handleHeatSinkTypeChange = useCallback((type: string) => {
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        heat_sinks: {
          ...unit.data.heat_sinks,
          type,
          dissipation_per_sink: type.includes('double') ? 2 : 1,
        },
      },
    };
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  // Notify parent of weight changes
  React.useEffect(() => {
    if (onWeightChange) {
      onWeightChange(heatSinkTotalWeight);
    }
  }, [heatSinkTotalWeight, onWeightChange]);

  return (
    <div className="heat-sinks-panel bg-white rounded-lg border border-gray-300 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Heat Sinks</h3>
      
      <div className="space-y-3">
        {/* Type Selection */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Type:</label>
          <select
            value={heatSinkType}
            onChange={(e) => handleHeatSinkTypeChange(e.target.value)}
            disabled={readOnly}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="double_clan">Double (Clan)</option>
            <option value="compact">Compact</option>
          </select>
        </div>

        {/* Number of Heat Sinks */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Number:</label>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleHeatSinkCountChange(currentHeatSinkCount - 1)}
              disabled={readOnly || currentHeatSinkCount <= 10}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              value={currentHeatSinkCount}
              onChange={(e) => handleHeatSinkCountChange(parseInt(e.target.value) || 10)}
              disabled={readOnly}
              className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded"
              min={10}
            />
            <button
              onClick={() => handleHeatSinkCountChange(currentHeatSinkCount + 1)}
              disabled={readOnly}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Engine Free */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Engine Free:</label>
          <span className="text-xs">{engineFreeHeatSinks}</span>
        </div>

        {/* Weight Free */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Weight Free:</label>
          <span className="text-xs">{heatSinkTotalWeight} tons</span>
        </div>

        {/* Total Dissipation */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Total Dissipation:</label>
          <span className="text-xs font-medium">{totalDissipation}</span>
        </div>

        {/* Total Equipment Heat */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Total Equipment Heat:</label>
          <span className={`text-xs font-medium ${totalEquipmentHeat > totalDissipation ? 'text-red-600' : ''}`}>
            {totalEquipmentHeat}
          </span>
        </div>
      </div>

      {/* Heat Efficiency Warning */}
      {totalEquipmentHeat > totalDissipation && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-700">
            Heat generation exceeds dissipation by {totalEquipmentHeat - totalDissipation}!
          </p>
        </div>
      )}

      {/* Heat Sink Details */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div>
            Each {heatSinkType} heat sink: {heatDissipation} dissipation, 
            {criticalSlots} critical slot{criticalSlots > 1 ? 's' : ''}
          </div>
          <div>
            Additional heat sinks: {additionalHeatSinks} 
            ({additionalHeatSinks * criticalSlots} critical slots)
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatSinksPanel;
