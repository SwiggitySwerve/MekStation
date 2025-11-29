import React, { useState, useCallback, useEffect } from 'react';
import { EditableUnit, MountedBattleArmor } from '../../../types/editor';

interface BattleArmorMountingPanelProps {
  unit: EditableUnit;
  onUnitChange: (unit: EditableUnit) => void;
  readOnly?: boolean;
}

const BattleArmorMountingPanel: React.FC<BattleArmorMountingPanelProps> = ({
  unit,
  onUnitChange,
  readOnly = false,
}) => {
  const [mountedBA, setMountedBA] = useState<MountedBattleArmor[]>(
    unit.mountedBattleArmor || []
  );

  useEffect(() => {
    setMountedBA(unit.mountedBattleArmor || []);
  }, [unit.mountedBattleArmor]);

  // Battle Armor mounting locations based on mech type
  const getMountingLocations = useCallback(() => {
    const baseLocations = ['Center Torso', 'Left Torso', 'Right Torso'];
    
    // Heuristic for Quad mech since we don't have direct access to critical slots structure here easily
    // properly without ICompleteUnitState.
    // TODO: Use a more robust way to determine Quad vs Biped
    const isQuad = unit.chassis.toLowerCase().includes('quad') || unit.model.toLowerCase().includes('quad');
    
    if (isQuad) {
      // Quad mech
      return [...baseLocations, 'Front Left Leg', 'Front Right Leg', 'Rear Left Leg', 'Rear Right Leg'];
    } else {
      // Default to Biped (most common)
      return [...baseLocations, 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];
    }
  }, [unit.chassis, unit.model]);

  // Maximum BA that can be mounted per location
  const getMaxTroopersPerLocation = (location: string): number => {
    if (location.includes('Arm')) return 2;
    if (location.includes('Leg')) return 2;
    if (location.includes('Torso')) return 4;
    return 2;
  };

  // Handle mounting BA
  const handleMountBA = useCallback((ba: MountedBattleArmor) => {
    const newMountedBA = [...mountedBA, ba];
    setMountedBA(newMountedBA);
    
    const updatedUnit = {
      ...unit,
      mountedBattleArmor: newMountedBA,
    };
    
    onUnitChange(updatedUnit);
  }, [mountedBA, unit, onUnitChange]);

  // Check if location can accept more BA
  const canMountAtLocation = useCallback((location: string): boolean => {
    const currentAtLocation = mountedBA
      .filter(ba => ba.location === location)
      .reduce((sum, ba) => sum + ba.troopers, 0);
    
    return currentAtLocation < getMaxTroopersPerLocation(location);
  }, [mountedBA]);

  // Handle mounting BA from available types
  const handleMountNewBA = useCallback((baType: { name: string, squad: number }) => {
    if (readOnly) return;

    // Find first valid location
    const locations = getMountingLocations();
    let targetLocation = '';

    for (const loc of locations) {
      if (canMountAtLocation(loc)) {
        targetLocation = loc;
        break;
      }
    }

    if (!targetLocation) {
      // No available locations
      return;
    }

    const newBA: MountedBattleArmor = {
      id: `ba-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: baType.name,
      squad: `Squad ${mountedBA.length + 1}`,
      troopers: baType.squad,
      location: targetLocation,
      isOmniMount: unit.hasOmniMounts || false,
    };

    handleMountBA(newBA);
  }, [mountedBA, unit.hasOmniMounts, readOnly, getMountingLocations, canMountAtLocation, handleMountBA]);

  // Handle dismounting BA
  const handleDismountBA = useCallback((baId: string) => {
    const newMountedBA = mountedBA.filter(ba => ba.id !== baId);
    setMountedBA(newMountedBA);
    
    const updatedUnit = {
      ...unit,
      mountedBattleArmor: newMountedBA,
    };
    
    onUnitChange(updatedUnit);
  }, [mountedBA, unit, onUnitChange]);

  // Calculate total weight of mounted BA
  const getTotalBAWeight = (): number => {
    return mountedBA.reduce((sum, ba) => sum + (ba.troopers * 1), 0); // 1 ton per trooper
  };

  return (
    <div className="battle-armor-mounting-panel bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Battle Armor Transport</h3>

      {/* Mounting Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-600">Total BA Weight:</span>
            <span className="ml-2 font-medium">{getTotalBAWeight()} tons</span>
          </div>
          <div>
            <span className="text-gray-600">Mounted Squads:</span>
            <span className="ml-2 font-medium">{mountedBA.length}</span>
          </div>
        </div>
      </div>

      {/* Mounting Locations */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Mounting Locations</h4>
        <div className="space-y-2">
          {getMountingLocations().map((location) => {
            const baAtLocation = mountedBA.filter(ba => ba.location === location);
            const troopersAtLocation = baAtLocation.reduce((sum, ba) => sum + ba.troopers, 0);
            const maxTroopers = getMaxTroopersPerLocation(location);
            const isFull = troopersAtLocation >= maxTroopers;

            return (
              <div
                key={location}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200
                  ${isFull
                    ? 'border-red-300 bg-red-50'
                    : canMountAtLocation(location)
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">{location}</h5>
                    <p className="text-xs text-gray-600">
                      {troopersAtLocation}/{maxTroopers} troopers
                    </p>
                  </div>
                  <div className="text-xs">
                    {baAtLocation.map((ba) => (
                      <div key={ba.name} className="flex items-center space-x-2 mb-1">
                        <span className="text-gray-700">{ba.name} ({ba.troopers})</span>
                        <button
                          onClick={() => handleDismountBA(ba.id)}
                          disabled={readOnly}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Dismount
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BA Types */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Available Battle Armor Types</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Elemental', weight: 1, squad: 5 },
            { name: 'Gnome', weight: 1, squad: 5 },
            { name: 'Salamander', weight: 1, squad: 4 },
            { name: 'Gray Death Scout', weight: 0.8, squad: 6 },
          ].map((baType) => (
            <div
              key={baType.name}
              className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-between"
            >
              <div>
                <h5 className="text-xs font-medium text-gray-900">{baType.name}</h5>
                <p className="text-xs text-gray-600 mb-2">
                  {baType.weight}t per trooper, Squad: {baType.squad}
                </p>
              </div>
              <button
                onClick={() => handleMountNewBA(baType)}
                disabled={readOnly}
                className="w-full py-1 px-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Mount
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mounting Rules */}
      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="text-blue-700">
          <strong>Mounting Rules:</strong>
        </p>
        <ul className="mt-1 space-y-0.5 text-blue-600">
          <li>• Arms/Legs: Max 2 troopers each</li>
          <li>• Torsos: Max 4 troopers each</li>
          <li>• Omnimech mounts allow quick release</li>
          <li>• Standard mounts require 30 seconds</li>
          <li>• BA cannot fire while mounted</li>
        </ul>
      </div>

      {/* Movement Effects */}
      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <p className="text-yellow-700">
          <strong>Movement Effects:</strong>
        </p>
        <ul className="mt-1 space-y-0.5 text-yellow-600">
          <li>• -1 MP per 5 mounted BA troopers</li>
          <li>• +1 to-hit modifier while carrying BA</li>
          <li>• No jumping with mounted BA (except VTOL)</li>
          <li>• BA takes damage from mech falls</li>
        </ul>
      </div>

      {/* Special Equipment */}
      {unit.hasOmniMounts && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <p className="text-green-700">
            <strong>OmniMech BA Mounts Detected!</strong>
          </p>
          <ul className="mt-1 space-y-0.5 text-green-600">
            <li>• Quick release capability</li>
            <li>• No movement penalties</li>
            <li>• BA can dismount during movement</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default BattleArmorMountingPanel;
