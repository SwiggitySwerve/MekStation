import React, { useCallback, useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';

interface MovementPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
  onJumpJetWeightChange?: (weight: number) => void;
}

const MovementPanel: React.FC<MovementPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
  onJumpJetWeightChange,
}) => {
  // Calculate walk MP
  const walkMP = unit.data?.movement?.walk_mp || 1;
  
  // Calculate run MP (walk * 1.5, rounded up)
  const runMP = useMemo(() => {
    return Math.ceil(walkMP * 1.5);
  }, [walkMP]);

  // Calculate jump MP
  const jumpMP = unit.data?.movement?.jump_mp || 0;
  const jumpType = unit.data?.movement?.jump_type || 'Jump Jet';
  const mechJumpBoosterMP = unit.data?.movement?.mech_jump_booster_mp || 0;

  // Calculate jump jet weight
  const jumpJetWeight = useMemo(() => {
    if (jumpMP === 0) return 0;
    
    const unitTonnage = unit.mass;
    let weightPerJJ = 1.0;
    
    // Weight varies by tonnage class
    if (unitTonnage <= 55) {
      weightPerJJ = 0.5;
    } else if (unitTonnage <= 85) {
      weightPerJJ = 1.0;
    } else {
      weightPerJJ = 2.0;
    }
    
    // UMU weighs the same as jump jets
    // Mechanical Jump Boosters are handled differently
    if (jumpType === 'Mechanical Jump Booster') {
      // MJB weight is based on tonnage
      return Math.ceil(unitTonnage * 0.05 * mechJumpBoosterMP);
    }
    
    return jumpMP * weightPerJJ;
  }, [jumpMP, jumpType, mechJumpBoosterMP, unit.mass]);

  // Handle walk MP change
  const handleWalkMPChange = useCallback((newWalkMP: number) => {
    if (newWalkMP < 1) return;
    
    const maxWalkMP = Math.floor(400 / unit.mass); // Max engine rating is 400
    if (newWalkMP > maxWalkMP) return;
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        movement: {
          ...unit.data.movement,
          walk_mp: newWalkMP,
          run_mp: Math.ceil(newWalkMP * 1.5),
          cruise_mp: newWalkMP,
          flank_mp: Math.ceil(newWalkMP * 1.5),
        },
      },
    };
    
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  // Handle jump MP change
  const handleJumpMPChange = useCallback((newJumpMP: number) => {
    if (newJumpMP < 0) return;
    
    // Jump MP cannot exceed walk MP
    if (newJumpMP > walkMP) return;
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        movement: {
          ...unit.data.movement,
          jump_mp: newJumpMP,
        },
      },
    };
    
    onUnitChange(updatedUnit);
    
    // Notify parent of weight change
    if (onJumpJetWeightChange) {
      const newWeight = calculateJumpJetWeight(newJumpMP, jumpType, mechJumpBoosterMP, unit.mass);
      onJumpJetWeightChange(newWeight);
    }
  }, [unit, onUnitChange, onJumpJetWeightChange, walkMP, jumpType, mechJumpBoosterMP]);

  // Handle jump type change
  const handleJumpTypeChange = useCallback((newJumpType: string) => {
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        movement: {
          ...unit.data.movement,
          jump_type: newJumpType,
        },
      },
    };
    
    onUnitChange(updatedUnit);
    
    // Recalculate weight
    if (onJumpJetWeightChange) {
      const newWeight = calculateJumpJetWeight(jumpMP, newJumpType, mechJumpBoosterMP, unit.mass);
      onJumpJetWeightChange(newWeight);
    }
  }, [unit, onUnitChange, onJumpJetWeightChange, jumpMP, mechJumpBoosterMP]);

  // Handle MJB MP change
  const handleMJBMPChange = useCallback((newMJBMP: number) => {
    if (newMJBMP < 0) return;
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        movement: {
          ...unit.data.movement,
          mech_jump_booster_mp: newMJBMP,
        },
      },
    };
    
    onUnitChange(updatedUnit);
    
    // Recalculate weight
    if (onJumpJetWeightChange && jumpType === 'Mechanical Jump Booster') {
      const newWeight = calculateJumpJetWeight(jumpMP, jumpType, newMJBMP, unit.mass);
      onJumpJetWeightChange(newWeight);
    }
  }, [unit, onUnitChange, onJumpJetWeightChange, jumpMP, jumpType]);

  // Notify parent of weight changes
  React.useEffect(() => {
    if (onJumpJetWeightChange) {
      onJumpJetWeightChange(jumpJetWeight);
    }
  }, [jumpJetWeight, onJumpJetWeightChange]);

  return (
    <div className="movement-panel bg-white rounded-lg border border-gray-300 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Movement</h3>
      
      <div className="space-y-3">
        {/* Movement Points Table */}
        <div className="text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1"></th>
                <th className="text-center px-2">Base</th>
                <th className="text-center px-2">Final</th>
              </tr>
            </thead>
            <tbody>
              {/* Walk MP */}
              <tr>
                <td className="py-1 font-medium">Walk MP:</td>
                <td className="text-center px-2">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => handleWalkMPChange(walkMP - 1)}
                      disabled={readOnly || walkMP <= 1}
                      className="p-0.5 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={walkMP}
                      onChange={(e) => handleWalkMPChange(parseInt(e.target.value) || 1)}
                      disabled={readOnly}
                      className="w-10 px-1 py-0.5 text-xs text-center border border-gray-300 rounded"
                      min={1}
                    />
                    <button
                      onClick={() => handleWalkMPChange(walkMP + 1)}
                      disabled={readOnly}
                      className="p-0.5 text-gray-600 hover:text-gray-900"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="text-center px-2">{walkMP}</td>
              </tr>
              
              {/* Run MP */}
              <tr>
                <td className="py-1 font-medium">Run MP:</td>
                <td className="text-center px-2">{runMP}</td>
                <td className="text-center px-2">{runMP}</td>
              </tr>
              
              {/* Jump/UMU MP */}
              <tr>
                <td className="py-1 font-medium">Jump/UMU MP:</td>
                <td className="text-center px-2">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => handleJumpMPChange(jumpMP - 1)}
                      disabled={readOnly || jumpMP <= 0}
                      className="p-0.5 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={jumpMP}
                      onChange={(e) => handleJumpMPChange(parseInt(e.target.value) || 0)}
                      disabled={readOnly}
                      className="w-10 px-1 py-0.5 text-xs text-center border border-gray-300 rounded"
                      min={0}
                      max={walkMP}
                    />
                    <button
                      onClick={() => handleJumpMPChange(jumpMP + 1)}
                      disabled={readOnly || jumpMP >= walkMP}
                      className="p-0.5 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="text-center px-2">{jumpMP}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Jump Type */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 w-24">Jump Type:</label>
          <select
            value={jumpType}
            onChange={(e) => handleJumpTypeChange(e.target.value)}
            disabled={readOnly || jumpMP === 0}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="Jump Jet">Jump Jet</option>
            <option value="UMU">UMU</option>
            <option value="Mechanical Jump Booster">Mechanical Jump Booster</option>
          </select>
        </div>

        {/* Mechanical Jump Booster MP (if selected) */}
        {jumpType === 'Mechanical Jump Booster' && (
          <div className="flex items-center">
            <label className="text-xs font-medium text-gray-700 w-24">Mech. J. Booster MP:</label>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleMJBMPChange(mechJumpBoosterMP - 1)}
                disabled={readOnly || mechJumpBoosterMP <= 0}
                className="p-0.5 text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                value={mechJumpBoosterMP}
                onChange={(e) => handleMJBMPChange(parseInt(e.target.value) || 0)}
                disabled={readOnly}
                className="w-10 px-1 py-0.5 text-xs text-center border border-gray-300 rounded"
                min={0}
              />
              <button
                onClick={() => handleMJBMPChange(mechJumpBoosterMP + 1)}
                disabled={readOnly}
                className="p-0.5 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Movement Details */}
        <div className="pt-2 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          <div>Engine Rating: {walkMP * unit.mass}</div>
          {jumpMP > 0 && (
            <div>Jump Jets: {jumpMP} ({jumpJetWeight} tons)</div>
          )}
          {mechJumpBoosterMP > 0 && jumpType === 'Mechanical Jump Booster' && (
            <div>MJB provides +{mechJumpBoosterMP} jump MP when activated</div>
          )}
        </div>

        {/* Validation Warnings */}
        {walkMP * unit.mass > 400 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-700">
              Engine rating {walkMP * unit.mass} exceeds maximum of 400!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate jump jet weight
function calculateJumpJetWeight(
  jumpMP: number,
  jumpType: string,
  mechJumpBoosterMP: number,
  unitMass: number
): number {
  if (jumpMP === 0) return 0;
  
  let weightPerJJ = 1.0;
  
  // Weight varies by tonnage class
  if (unitMass <= 55) {
    weightPerJJ = 0.5;
  } else if (unitMass <= 85) {
    weightPerJJ = 1.0;
  } else {
    weightPerJJ = 2.0;
  }
  
  // Mechanical Jump Boosters are handled differently
  if (jumpType === 'Mechanical Jump Booster') {
    return Math.ceil(unitMass * 0.05 * mechJumpBoosterMP);
  }
  
  return jumpMP * weightPerJJ;
}

export default MovementPanel;
