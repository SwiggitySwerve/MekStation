import React, { useMemo } from 'react';
import { EditableUnit, ValidationError } from '../../../types/editor';
import { IArmorDef } from '../../../types/core/ComponentInterfaces';

interface ArmorValidationDisplayProps {
  unit: EditableUnit;
  armorType: IArmorDef;
  totalTonnage: number;
  maxTonnage: number;
}

interface ArmorValidation {
  type: 'error' | 'warning' | 'info';
  location?: string;
  message: string;
  field?: string;
}

const ArmorValidationDisplay: React.FC<ArmorValidationDisplayProps> = ({
  unit,
  armorType,
  totalTonnage,
  maxTonnage,
}) => {
  // Perform armor validation checks
  const validations = useMemo((): ArmorValidation[] => {
    const results: ArmorValidation[] = [];
    
    // Check for over-allocation
    if (totalTonnage > maxTonnage) {
      results.push({
        type: 'error',
        message: `Armor tonnage (${totalTonnage.toFixed(1)}) exceeds maximum (${maxTonnage.toFixed(1)})`,
        field: 'tonnage',
      });
    }

    // Map allocation to a list for iteration
    const armorAlloc = unit.armor?.allocation;
    if (!armorAlloc) return results;

    const locations = [
      { name: 'Head', front: armorAlloc.head, rear: 0 },
      { name: 'Center Torso', front: armorAlloc.centerTorso, rear: armorAlloc.centerTorsoRear },
      { name: 'Left Torso', front: armorAlloc.leftTorso, rear: armorAlloc.leftTorsoRear },
      { name: 'Right Torso', front: armorAlloc.rightTorso, rear: armorAlloc.rightTorsoRear },
      { name: 'Left Arm', front: armorAlloc.leftArm, rear: 0 },
      { name: 'Right Arm', front: armorAlloc.rightArm, rear: 0 },
      { name: 'Left Leg', front: armorAlloc.leftLeg, rear: 0 },
      { name: 'Right Leg', front: armorAlloc.rightLeg, rear: 0 },
    ];

    const mass = unit.tonnage || 0;

    // Check each location for violations
    locations.forEach(loc => {
      const maxArmor = getMaxArmorForLocation(loc.name, mass);
      const totalLocationArmor = loc.front + loc.rear;

      // Over-allocation per location
      if (totalLocationArmor > maxArmor) {
        results.push({
          type: 'error',
          location: loc.name,
          message: `${loc.name} armor (${totalLocationArmor}) exceeds maximum (${maxArmor})`,
          field: 'armor',
        });
      }

      // Head armor warnings
      if (loc.name === 'Head' && loc.front < 9) {
        results.push({
          type: 'warning',
          location: loc.name,
          message: 'Head has less than maximum armor - vulnerable to headshots',
          field: 'armor',
        });
      }

      // Rear armor warnings
      if (['Center Torso', 'Left Torso', 'Right Torso'].includes(loc.name)) {
        if (loc.rear === 0) {
          results.push({
            type: 'warning',
            location: loc.name,
            message: `${loc.name} has no rear armor`,
            field: 'armor',
          });
        } else if (loc.front > 0 && loc.rear / loc.front < 0.25) {
          results.push({
            type: 'warning',
            location: loc.name,
            message: `${loc.name} has minimal rear armor (less than 25% of front)`,
            field: 'armor',
          });
        }
      }

      // Low armor warnings
      if (totalLocationArmor > 0 && totalLocationArmor < maxArmor * 0.5) {
        results.push({
          type: 'warning',
          location: loc.name,
          message: `${loc.name} has less than 50% armor coverage`,
          field: 'armor',
        });
      }
    });

    // Tech level conflicts
    const unitRulesLevel = unit.rulesLevel?.toString() || '';
    if (armorType.techLevel === 'Advanced' && unitRulesLevel.toLowerCase().includes('standard')) {
      results.push({
        type: 'error',
        message: `${armorType.name} requires ${armorType.techLevel} tech level`,
        field: 'techLevel',
      });
    }

    // Special armor requirements
    if (armorType.type === 'Stealth') { // Assuming type name check
      // TODO: Check for ECM properly using IEquipmentInstance
      const hasGuardianECM = unit.equipment?.some((eq) => 
        eq.equipment.name?.includes('Guardian ECM')
      );
      if (!hasGuardianECM) {
        results.push({
          type: 'error',
          message: 'Stealth armor requires Guardian ECM Suite',
          field: 'equipment',
        });
      }
    }

    // Critical slot violations
    const usedCriticalSlots = armorType.criticalSlots || 0;
    if (usedCriticalSlots > 0) {
      results.push({
        type: 'info',
        message: `${armorType.name} uses ${usedCriticalSlots} critical slots`,
        field: 'criticals',
      });
    }

    // Construction rules
    // Check for minimum armor requirements
    const totalArmor = locations.reduce((sum, loc) => sum + loc.front + loc.rear, 0);
    const minRecommended = mass;
    if (totalArmor < minRecommended) {
      results.push({
        type: 'info',
        message: `Total armor (${totalArmor}) is below recommended minimum (${minRecommended}) for ${mass}-ton mech`,
        field: 'armor',
      });
    }

    return results;
  }, [unit, armorType, totalTonnage, maxTonnage]);

  // Group validations by type
  const errors = validations.filter(v => v.type === 'error');
  const warnings = validations.filter(v => v.type === 'warning');
  const info = validations.filter(v => v.type === 'info');

  // Get max armor for location
  function getMaxArmorForLocation(location: string, mass: number): number {
    switch (location) {
      case 'Head':
        return mass > 100 ? 12 : 9;
      case 'Center Torso':
        return Math.floor(mass * 2 * 0.4);
      case 'Left Torso':
      case 'Right Torso':
        return Math.floor(mass * 2 * 0.3);
      case 'Left Arm':
      case 'Right Arm':
      case 'Left Leg':
      case 'Right Leg':
        return Math.floor(mass * 2 * 0.25);
      default:
        return Math.floor(mass * 2 * 0.2);
    }
  }

  if (validations.length === 0) {
    return (
      <div className="armor-validation-display bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-100 mb-2">Validation</h3>
        <div className="text-xs text-green-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          All armor configurations are valid
        </div>
      </div>
    );
  }

  return (
    <div className="armor-validation-display bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-100 mb-3">Validation</h3>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Errors ({errors.length})
          </h4>
          <div className="space-y-1">
            {errors.map((error, idx) => (
              <div key={idx} className="text-xs text-red-300 pl-5">
                {error.location && <span className="font-medium">[{error.location}] </span>}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-yellow-400 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-1">
            {warnings.map((warning, idx) => (
              <div key={idx} className="text-xs text-yellow-300 pl-5">
                {warning.location && <span className="font-medium">[{warning.location}] </span>}
                {warning.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {info.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Information ({info.length})
          </h4>
          <div className="space-y-1">
            {info.map((item, idx) => (
              <div key={idx} className="text-xs text-blue-300 pl-5">
                {item.location && <span className="font-medium">[{item.location}] </span>}
                {item.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          {errors.length > 0 ? (
            <span className="text-red-400">Fix {errors.length} error{errors.length > 1 ? 's' : ''} before saving</span>
          ) : warnings.length > 0 ? (
            <span className="text-yellow-400">Review {warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
          ) : (
            <span className="text-green-400">Configuration is valid</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArmorValidationDisplay;
