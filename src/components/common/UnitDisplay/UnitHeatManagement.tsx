import React from 'react';
import { HeatManagementInfo } from '../../../types/unitDisplay';

interface UnitHeatManagementProps {
  heatManagement: HeatManagementInfo;
  compact?: boolean;
}

const UnitHeatManagement: React.FC<UnitHeatManagementProps> = ({ 
  heatManagement, 
  compact = false 
}) => {
  const getRiskColor = (risk: HeatManagementInfo['overheatingRisk']) => {
    switch (risk) {
      case 'none': return 'text-green-600';
      case 'low': return 'text-yellow-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      case 'critical': return 'text-red-700';
      default: return 'text-gray-600';
    }
  };

  const getRiskBgColor = (risk: HeatManagementInfo['overheatingRisk']) => {
    switch (risk) {
      case 'none': return 'bg-green-100 border-green-400';
      case 'low': return 'bg-yellow-100 border-yellow-400';
      case 'medium': return 'bg-orange-100 border-orange-400';
      case 'high': return 'bg-red-100 border-red-400';
      case 'critical': return 'bg-red-200 border-red-500';
      default: return 'bg-gray-100 border-gray-400';
    }
  };

  const getRiskLabel = (risk: HeatManagementInfo['overheatingRisk']) => {
    switch (risk) {
      case 'none': return 'No Risk';
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'High Risk';
      case 'critical': return 'Critical Risk';
      default: return 'Unknown';
    }
  };

  if (compact) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">Heat Management</h4>
          <div className="text-sm">
            <span className="font-medium">
              {heatManagement.heatBalance >= 0 ? '+' : ''}{heatManagement.heatBalance}
            </span>
            <span className={`ml-2 ${getRiskColor(heatManagement.overheatingRisk)}`}>
              {getRiskLabel(heatManagement.overheatingRisk)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Heat Management</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Generation:</span>
            <span className="font-medium">{heatManagement.totalHeatGeneration}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Dissipation:</span>
            <span className="font-medium">{heatManagement.totalHeatDissipation}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Balance:</span>
            <span className={`font-medium ${heatManagement.heatBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {heatManagement.heatBalance >= 0 ? '+' : ''}{heatManagement.heatBalance}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Overheating Risk:</span>
            <span className={`font-medium ${getRiskColor(heatManagement.overheatingRisk)}`}>
              {getRiskLabel(heatManagement.overheatingRisk)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Heat Sinks:</span>
            <span className="font-medium">{heatManagement.totalHeatSinks}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Heat Sink Type:</span>
            <span className="font-medium">{heatManagement.heatSinkType}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Engine Integrated:</span>
            <span className="font-medium">
              {heatManagement.engineIntegratedHeatSinks} / {heatManagement.engineHeatSinkCapacity}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">External Heat Sinks:</span>
            <span className="font-medium">{heatManagement.externalHeatSinks}</span>
          </div>
        </div>
      </div>

      {heatManagement.overheatingRisk !== 'none' && (
        <div className={`mt-3 p-3 border rounded ${getRiskBgColor(heatManagement.overheatingRisk)}`}>
          <div className="flex items-start">
            <span className="text-lg mr-2">
              {heatManagement.overheatingRisk === 'critical' ? '🔥' : '⚠️'}
            </span>
            <div>
              <p className="font-medium">
                {heatManagement.overheatingRisk === 'critical' ? 'Critical Heat Management Issue!' : 'Heat Management Warning'}
              </p>
              <p className="text-sm mt-1">
                {heatManagement.heatBalance < 0 ? 
                  `Unit generates ${Math.abs(heatManagement.heatBalance)} more heat than it can dissipate. Consider adding heat sinks.` :
                  'Heat management is within acceptable parameters.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitHeatManagement;
