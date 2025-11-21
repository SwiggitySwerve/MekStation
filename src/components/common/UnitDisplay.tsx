import React, { useMemo } from 'react';
import { CustomizableUnit, UnitEquipmentItem, EquipmentItem } from '../../types/customizer';
import { UnitDisplayOptions, UnitDisplayData, UnitAnalysisContext } from '../../types/unitDisplay';
import { UnitAnalyzer } from '../../utils/unitAnalysis';
import UnitBasicInfo from './UnitDisplay/UnitBasicInfo';
import UnitMovementInfo from './UnitDisplay/UnitMovementInfo';
import UnitHeatManagement from './UnitDisplay/UnitHeatManagement';
import UnitArmorInfo from './UnitDisplay/UnitArmorInfo';
import UnitStructureInfo from './UnitDisplay/UnitStructureInfo';
import UnitEquipmentSummary from './UnitDisplay/UnitEquipmentSummary';
import UnitCriticalSlotSummary from './UnitDisplay/UnitCriticalSlotSummary';
import UnitBuildRecommendations from './UnitDisplay/UnitBuildRecommendations';
import UnitTechnicalSpecs from './UnitDisplay/UnitTechnicalSpecs';

interface UnitDisplayProps {
  unit: CustomizableUnit | null;
  loadout?: UnitEquipmentItem[];
  availableEquipment?: EquipmentItem[];
  options?: UnitDisplayOptions;
  className?: string;
  onRecommendationAction?: (recommendationId: string, action: string) => void;
}

const defaultOptions: UnitDisplayOptions = {
  showBasicInfo: true,
  showMovement: true,
  showArmor: true,
  showStructure: true,
  showHeatManagement: true,
  showEquipmentSummary: true,
  showCriticalSlotSummary: true,
  showBuildRecommendations: true,
  showTechnicalSpecs: false,
  showFluffText: false,
  compact: false,
  interactive: true
};

const UnitDisplay: React.FC<UnitDisplayProps> = ({
  unit,
  loadout = [],
  availableEquipment = [],
  options = defaultOptions,
  className = '',
  onRecommendationAction
}) => {
  const finalOptions = { ...defaultOptions, ...options };

  const analysisData = useMemo(() => {
    if (!unit) return null;

    const context: UnitAnalysisContext = {
      includeHeatAnalysis: finalOptions.showHeatManagement || false,
      includeArmorAnalysis: finalOptions.showArmor || false,
      includeEquipmentAnalysis: finalOptions.showEquipmentSummary || false,
      includeBuildRecommendations: finalOptions.showBuildRecommendations || false,
      unitType: unit.type === 'BattleMech' ? 'BattleMech' : 
                unit.type === 'Vehicle' ? 'Vehicle' :
                unit.type === 'BattleArmor' ? 'BattleArmor' :
                unit.type === 'ProtoMech' ? 'ProtoMech' : 'BattleMech'
    };

    return UnitAnalyzer.analyzeUnit(unit, loadout, availableEquipment, context);
  }, [unit, loadout, availableEquipment, finalOptions]);

  if (!unit) {
    return (
      <div className={`p-4 border rounded shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className={`p-4 border rounded shadow-sm ${className}`}>
        <p className="text-gray-500">Unable to analyze unit data</p>
      </div>
    );
  }

  const containerClass = finalOptions.compact 
    ? "space-y-2" 
    : "space-y-4";

  return (
    <div className={`${className}`}>
      <div className={containerClass}>
        {finalOptions.showBasicInfo && (
          <UnitBasicInfo 
            unit={unit} 
            loadout={loadout}
            availableEquipment={availableEquipment}
            compact={finalOptions.compact}
          />
        )}

        {finalOptions.showMovement && (
          <UnitMovementInfo 
            unit={unit}
            technicalSpecs={analysisData.technicalSpecs}
            compact={finalOptions.compact}
          />
        )}

        {finalOptions.showHeatManagement && analysisData.heatManagement && (
          <UnitHeatManagement 
            heatManagement={analysisData.heatManagement}
            compact={finalOptions.compact}
          />
        )}

        {finalOptions.showArmor && analysisData.armorInfo && (
          <UnitArmorInfo 
            armorInfo={analysisData.armorInfo}
            compact={finalOptions.compact}
          />
        )}

        {finalOptions.showStructure && analysisData.structureInfo && (
          <UnitStructureInfo 
            structureInfo={analysisData.structureInfo}
            compact={finalOptions.compact}
          />
        )}

        {finalOptions.showEquipmentSummary && analysisData.equipmentSummary && (
          <UnitEquipmentSummary 
            equipmentSummary={analysisData.equipmentSummary}
            compact={finalOptions.compact}
            interactive={finalOptions.interactive}
          />
        )}

        {finalOptions.showCriticalSlotSummary && analysisData.criticalSlotSummary && (
          <UnitCriticalSlotSummary 
            criticalSlotSummary={analysisData.criticalSlotSummary}
            compact={finalOptions.compact}
          />
        )}

        {finalOptions.showBuildRecommendations && analysisData.buildRecommendations && (
          <UnitBuildRecommendations 
            recommendations={analysisData.buildRecommendations}
            compact={finalOptions.compact}
            onRecommendationAction={onRecommendationAction}
          />
        )}

        {finalOptions.showTechnicalSpecs && analysisData.technicalSpecs && (
          <UnitTechnicalSpecs 
            technicalSpecs={analysisData.technicalSpecs}
            compact={finalOptions.compact}
          />
        )}
      </div>
    </div>
  );
};

export default UnitDisplay;
