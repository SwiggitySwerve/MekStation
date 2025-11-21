import React, { useState, useMemo, memo, useCallback } from 'react';
import { ArmorLocation } from '../../../types';
import MechSilhouette from './MechSilhouette';
import ArmorValue from './ArmorValue';
import { 
  MechArmorDiagramProps, 
  BIPED_ARMOR_POSITIONS, 
  QUAD_ARMOR_POSITIONS,
  SIZE_CONFIG,
  ArmorLocationMapping 
} from './types';

const MechArmorDiagram: React.FC<MechArmorDiagramProps> = ({
  armorData = [],
  mechType = 'Biped',
  showRearArmor = true,
  interactive = true,
  size = 'medium',
  theme = 'light',
  className = '',
}) => {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const config = SIZE_CONFIG[size];

  // Get armor positions based on mech type
  const armorPositions = useMemo(() => {
    switch (mechType) {
      case 'Quad':
        return QUAD_ARMOR_POSITIONS;
      case 'Biped':
      default:
        return BIPED_ARMOR_POSITIONS;
    }
  }, [mechType]);

  // Create a map of armor data for quick lookup
  const armorMap = useMemo(() => {
    const map = new Map<string, ArmorLocation>();
    armorData.forEach(armor => {
      map.set(armor.location, armor);
    });
    return map;
  }, [armorData]);

  // Handle location hover with useCallback to prevent unnecessary re-renders
  const handleLocationHover = useCallback((location: string | null) => {
    if (interactive) {
      setHoveredLocation(location);
    }
  }, [interactive]);

  // Handle location click with useCallback to prevent unnecessary re-renders
  const handleLocationClick = useCallback((location: string) => {
    if (interactive) {
      setSelectedLocation(prev => prev === location ? null : location);
    }
  }, [interactive]);

  // Get armor data for a specific location (memoized)
  const getArmorForLocation = useCallback((locationName: string) => {
    return armorMap.get(locationName);
  }, [armorMap]);

  // Determine container dimensions
  const containerWidth = config.width + 120; // Extra space for armor values
  const containerHeight = config.height + 80;

  return (
    <div 
      className={`mech-armor-diagram ${className}`}
      style={{ 
        width: containerWidth,
        height: containerHeight,
        position: 'relative',
        margin: '0 auto',
      }}
    >
      {/* Container SVG */}
      <svg
        width={containerWidth}
        height={containerHeight}
        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
        className="w-full h-full"
        style={{ 
          backgroundColor: theme === 'light' ? '#FAFAFA' : '#111827',
          borderRadius: '8px',
          border: `1px solid ${theme === 'light' ? '#E5E7EB' : '#374151'}`,
        }}
      >
        {/* Center the mech silhouette */}
        <g transform={`translate(60, 40)`}>
          <MechSilhouette
            mechType={mechType}
            size={size}
            theme={theme}
            hoveredLocation={hoveredLocation}
            onLocationHover={handleLocationHover}
            onLocationClick={handleLocationClick}
          />
        </g>

        {/* Armor values positioned around the mech */}
        <g transform={`translate(60, 40)`}>
          {armorPositions.map((position: ArmorLocationMapping) => {
            const armorData = getArmorForLocation(position.location);
            
            if (!armorData) return null;

            return (
              <ArmorValue
                key={position.location}
                location={position.location}
                value={armorData.armor_points}
                rearValue={showRearArmor ? armorData.rear_armor_points : undefined}
                x={position.x}
                y={position.y}
                size={size}
                theme={theme}
                interactive={interactive}
                onHover={handleLocationHover}
                onClick={handleLocationClick}
              />
            );
          })}
        </g>

        {/* Selected location info overlay */}
        {selectedLocation && interactive && (
          <g transform={`translate(10, ${containerHeight - 60})`}>
            <rect
              x={0}
              y={0}
              width={containerWidth - 20}
              height={50}
              rx={6}
              fill={theme === 'light' ? '#FFFFFF' : '#374151'}
              stroke={theme === 'light' ? '#D1D5DB' : '#6B7280'}
              strokeWidth={1}
              filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.1))"
            />
            
            <text
              x={10}
              y={15}
              fontSize={12}
              fontWeight="600"
              fill={theme === 'light' ? '#111827' : '#F9FAFB'}
            >
              {selectedLocation}
            </text>
            
            {(() => {
              const armor = getArmorForLocation(selectedLocation);
              if (!armor) return null;
              
              return (
                <g>
                  <text
                    x={10}
                    y={32}
                    fontSize={10}
                    fill={theme === 'light' ? '#6B7280' : '#9CA3AF'}
                  >
                    Armor: {armor.armor_points}
                    {armor.rear_armor_points && armor.rear_armor_points > 0 && 
                      ` | Rear: ${armor.rear_armor_points}`
                    }
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(${containerWidth - 100}, 20)`}>
          <text
            x={0}
            y={0}
            fontSize={10}
            fontWeight="600"
            fill={theme === 'light' ? '#374151' : '#D1D5DB'}
          >
            Armor Values
          </text>
          
          <text
            x={0}
            y={15}
            fontSize={8}
            fill={theme === 'light' ? '#6B7280' : '#9CA3AF'}
          >
            {interactive ? 'Click to select' : 'Hover for details'}
          </text>

          {showRearArmor && (
            <text
              x={0}
              y={28}
              fontSize={8}
              fill={theme === 'light' ? '#6B7280' : '#9CA3AF'}
            >
              Rear armor shown
            </text>
          )}
        </g>
      </svg>

      {/* Accessibility information */}
      <div className="sr-only" role="img" aria-label={`${mechType} mech armor diagram`}>
        {armorData.map(armor => (
          <span key={armor.location}>
            {armor.location}: {armor.armor_points} armor
            {armor.rear_armor_points && armor.rear_armor_points > 0 && 
              `, ${armor.rear_armor_points} rear armor`
            }.
          </span>
        ))}
      </div>
    </div>
  );
};

export default memo(MechArmorDiagram);
