import React, { useState, useCallback } from 'react';
import { EditableUnit, MECH_LOCATIONS } from '../../../types/editor';
import ArmorLocationVisual from './ArmorLocationVisual';

interface MechArmorDiagramProps {
  unit: EditableUnit;
  onArmorChange: (location: string, front: number, rear: number) => void;
  readOnly?: boolean;
  showLabels?: boolean;
  showTooltips?: boolean;
  mechType?: 'Biped' | 'Quad' | 'LAM' | 'Tripod';
}

const MechArmorDiagram: React.FC<MechArmorDiagramProps> = ({
  unit,
  onArmorChange,
  readOnly = false,
  showLabels = true,
  showTooltips = true,
  mechType = 'Biped',
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);

  // Get armor data for a location
  const getLocationArmor = useCallback((location: string) => {
    const armorLocation = unit.data?.armor?.locations?.find(loc => loc.location === location);
    return {
      front: armorLocation?.armor_points || 0,
      rear: armorLocation?.rear_armor_points || 0,
      max: getMaxArmorForLocation(location, unit.mass || 0),
    };
  }, [unit]);

  // Calculate max armor for location
  const getMaxArmorForLocation = (location: string, mass: number): number => {
    switch (location) {
      case MECH_LOCATIONS.HEAD:
        return mass > 100 ? 12 : 9;
      case MECH_LOCATIONS.CENTER_TORSO:
        return Math.floor(mass * 2 * 0.4);
      case MECH_LOCATIONS.LEFT_TORSO:
      case MECH_LOCATIONS.RIGHT_TORSO:
        return Math.floor(mass * 2 * 0.3);
      case MECH_LOCATIONS.LEFT_ARM:
      case MECH_LOCATIONS.RIGHT_ARM:
      case MECH_LOCATIONS.LEFT_LEG:
      case MECH_LOCATIONS.RIGHT_LEG:
        return Math.floor(mass * 2 * 0.25);
      default:
        return Math.floor(mass * 2 * 0.2);
    }
  };

  // Has rear armor
  const hasRearArmor = (location: string): boolean => {
    return [MECH_LOCATIONS.CENTER_TORSO, MECH_LOCATIONS.LEFT_TORSO, MECH_LOCATIONS.RIGHT_TORSO]
      .includes(location as any);
  };

  // Handle location click
  const handleLocationClick = useCallback((location: string) => {
    setSelectedLocation(selectedLocation === location ? null : location);
    // If clicking on a new location while editing another, close the current edit and open the new one
    if (!readOnly && editingLocation !== location) {
      setEditingLocation(location);
    }
  }, [selectedLocation, editingLocation, readOnly]);

  // Handle edit popup close
  const handleEditPopupClose = useCallback(() => {
    setEditingLocation(null);
  }, []);

  return (
    <div className="mech-armor-diagram bg-gray-900 rounded-lg p-6">
      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-100 mb-4">Armor Diagram</h3>

      {/* SVG Mech Diagram */}
      <div className="relative mx-auto" style={{ width: '400px', height: '500px' }}>
        <svg
          width="400"
          height="500"
          viewBox="0 0 400 500"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid lines for alignment (debug - remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <g className="opacity-10">
              {[...Array(10)].map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 40}
                  y1="0"
                  x2={i * 40}
                  y2="500"
                  stroke="white"
                  strokeWidth="1"
                />
              ))}
              {[...Array(13)].map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 40}
                  x2="400"
                  y2={i * 40}
                  stroke="white"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* Head */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.HEAD}
            x={175}
            y={20}
            width={50}
            height={40}
            armorData={getLocationArmor(MECH_LOCATIONS.HEAD)}
            hasRear={false}
            isSelected={selectedLocation === MECH_LOCATIONS.HEAD}
            isHovered={hoveredLocation === MECH_LOCATIONS.HEAD}
            isEditing={editingLocation === MECH_LOCATIONS.HEAD}
            onClick={() => handleLocationClick(MECH_LOCATIONS.HEAD)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.HEAD, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Center Torso */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.CENTER_TORSO}
            x={150}
            y={80}
            width={100}
            height={120}
            armorData={getLocationArmor(MECH_LOCATIONS.CENTER_TORSO)}
            hasRear={true}
            isSelected={selectedLocation === MECH_LOCATIONS.CENTER_TORSO}
            isHovered={hoveredLocation === MECH_LOCATIONS.CENTER_TORSO}
            isEditing={editingLocation === MECH_LOCATIONS.CENTER_TORSO}
            onClick={() => handleLocationClick(MECH_LOCATIONS.CENTER_TORSO)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.CENTER_TORSO, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Left Torso */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.LEFT_TORSO}
            x={60}
            y={90}
            width={80}
            height={100}
            armorData={getLocationArmor(MECH_LOCATIONS.LEFT_TORSO)}
            hasRear={true}
            isSelected={selectedLocation === MECH_LOCATIONS.LEFT_TORSO}
            isHovered={hoveredLocation === MECH_LOCATIONS.LEFT_TORSO}
            isEditing={editingLocation === MECH_LOCATIONS.LEFT_TORSO}
            onClick={() => handleLocationClick(MECH_LOCATIONS.LEFT_TORSO)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.LEFT_TORSO, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Right Torso */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.RIGHT_TORSO}
            x={260}
            y={90}
            width={80}
            height={100}
            armorData={getLocationArmor(MECH_LOCATIONS.RIGHT_TORSO)}
            hasRear={true}
            isSelected={selectedLocation === MECH_LOCATIONS.RIGHT_TORSO}
            isHovered={hoveredLocation === MECH_LOCATIONS.RIGHT_TORSO}
            isEditing={editingLocation === MECH_LOCATIONS.RIGHT_TORSO}
            onClick={() => handleLocationClick(MECH_LOCATIONS.RIGHT_TORSO)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.RIGHT_TORSO, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Left Arm */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.LEFT_ARM}
            x={10}
            y={100}
            width={40}
            height={140}
            armorData={getLocationArmor(MECH_LOCATIONS.LEFT_ARM)}
            hasRear={false}
            isSelected={selectedLocation === MECH_LOCATIONS.LEFT_ARM}
            isHovered={hoveredLocation === MECH_LOCATIONS.LEFT_ARM}
            isEditing={editingLocation === MECH_LOCATIONS.LEFT_ARM}
            onClick={() => handleLocationClick(MECH_LOCATIONS.LEFT_ARM)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.LEFT_ARM, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Right Arm */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.RIGHT_ARM}
            x={350}
            y={100}
            width={40}
            height={140}
            armorData={getLocationArmor(MECH_LOCATIONS.RIGHT_ARM)}
            hasRear={false}
            isSelected={selectedLocation === MECH_LOCATIONS.RIGHT_ARM}
            isHovered={hoveredLocation === MECH_LOCATIONS.RIGHT_ARM}
            isEditing={editingLocation === MECH_LOCATIONS.RIGHT_ARM}
            onClick={() => handleLocationClick(MECH_LOCATIONS.RIGHT_ARM)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.RIGHT_ARM, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Left Leg */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.LEFT_LEG}
            x={110}
            y={220}
            width={60}
            height={180}
            armorData={getLocationArmor(MECH_LOCATIONS.LEFT_LEG)}
            hasRear={false}
            isSelected={selectedLocation === MECH_LOCATIONS.LEFT_LEG}
            isHovered={hoveredLocation === MECH_LOCATIONS.LEFT_LEG}
            isEditing={editingLocation === MECH_LOCATIONS.LEFT_LEG}
            onClick={() => handleLocationClick(MECH_LOCATIONS.LEFT_LEG)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.LEFT_LEG, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />

          {/* Right Leg */}
          <ArmorLocationVisual
            location={MECH_LOCATIONS.RIGHT_LEG}
            x={230}
            y={220}
            width={60}
            height={180}
            armorData={getLocationArmor(MECH_LOCATIONS.RIGHT_LEG)}
            hasRear={false}
            isSelected={selectedLocation === MECH_LOCATIONS.RIGHT_LEG}
            isHovered={hoveredLocation === MECH_LOCATIONS.RIGHT_LEG}
            isEditing={editingLocation === MECH_LOCATIONS.RIGHT_LEG}
            onClick={() => handleLocationClick(MECH_LOCATIONS.RIGHT_LEG)}
            onHover={setHoveredLocation}
            onArmorChange={(front, rear) => onArmorChange(MECH_LOCATIONS.RIGHT_LEG, front, rear)}
            onEditClose={handleEditPopupClose}
            readOnly={readOnly}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />
        </svg>
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-sm font-medium text-gray-200">{selectedLocation}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Front Armor:</span>
              <span className="text-gray-200">{getLocationArmor(selectedLocation).front}</span>
            </div>
            {hasRearArmor(selectedLocation) && (
              <div className="flex justify-between">
                <span className="text-gray-400">Rear Armor:</span>
                <span className="text-gray-200">{getLocationArmor(selectedLocation).rear}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Max Armor:</span>
              <span className="text-gray-200">{getLocationArmor(selectedLocation).max}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Coverage:</span>
              <span className="text-gray-200">
                {Math.round(((getLocationArmor(selectedLocation).front + getLocationArmor(selectedLocation).rear) / getLocationArmor(selectedLocation).max) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-400">90%+</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-400">60-89%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-gray-400">20-59%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-400">&lt;20%</span>
        </div>
      </div>
    </div>
  );
};

export default MechArmorDiagram;
