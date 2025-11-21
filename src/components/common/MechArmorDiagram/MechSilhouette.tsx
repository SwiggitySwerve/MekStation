import React, { memo } from 'react';
import { MechSilhouetteProps, SIZE_CONFIG } from './types';

const MechSilhouette: React.FC<MechSilhouetteProps> = ({
  mechType = 'Biped',
  size = 'medium',
  theme = 'light',
  hoveredLocation,
  onLocationHover,
  onLocationClick,
}) => {
  const config = SIZE_CONFIG[size];
  const isInteractive = !!onLocationHover || !!onLocationClick;
  
  // Color scheme based on theme
  const colors = {
    outline: theme === 'light' ? '#374151' : '#E5E7EB',
    fill: theme === 'light' ? '#F9FAFB' : '#1F2937',
    hover: theme === 'light' ? '#DBEAFE' : '#1E40AF',
    stroke: theme === 'light' ? '#6B7280' : '#9CA3AF',
  };

  const handleLocationInteraction = (location: string, event: React.MouseEvent) => {
    if (event.type === 'mouseenter' && onLocationHover) {
      onLocationHover(location);
    } else if (event.type === 'mouseleave' && onLocationHover) {
      onLocationHover(null);
    } else if (event.type === 'click' && onLocationClick) {
      onLocationClick(location);
    }
  };

  const getLocationStyle = (location: string) => ({
    fill: hoveredLocation === location ? colors.hover : colors.fill,
    stroke: colors.outline,
    strokeWidth: 2,
    cursor: isInteractive ? 'pointer' : 'default',
    transition: 'fill 0.2s ease-in-out',
  });

  const renderBipedMech = () => (
    <g>
      {/* Head */}
      <ellipse
        cx={config.width / 2}
        cy={50}
        rx={20}
        ry={25}
        style={getLocationStyle('Head')}
        onMouseEnter={(e) => handleLocationInteraction('Head', e)}
        onMouseLeave={(e) => handleLocationInteraction('Head', e)}
        onClick={(e) => handleLocationInteraction('Head', e)}
      />
      
      {/* Center Torso */}
      <rect
        x={config.width / 2 - 25}
        y={80}
        width={50}
        height={80}
        rx={8}
        style={getLocationStyle('Center Torso')}
        onMouseEnter={(e) => handleLocationInteraction('Center Torso', e)}
        onMouseLeave={(e) => handleLocationInteraction('Center Torso', e)}
        onClick={(e) => handleLocationInteraction('Center Torso', e)}
      />
      
      {/* Left Torso */}
      <rect
        x={config.width / 2 - 60}
        y={90}
        width={35}
        height={70}
        rx={6}
        style={getLocationStyle('Left Torso')}
        onMouseEnter={(e) => handleLocationInteraction('Left Torso', e)}
        onMouseLeave={(e) => handleLocationInteraction('Left Torso', e)}
        onClick={(e) => handleLocationInteraction('Left Torso', e)}
      />
      
      {/* Right Torso */}
      <rect
        x={config.width / 2 + 25}
        y={90}
        width={35}
        height={70}
        rx={6}
        style={getLocationStyle('Right Torso')}
        onMouseEnter={(e) => handleLocationInteraction('Right Torso', e)}
        onMouseLeave={(e) => handleLocationInteraction('Right Torso', e)}
        onClick={(e) => handleLocationInteraction('Right Torso', e)}
      />
      
      {/* Left Arm */}
      <ellipse
        cx={config.width / 2 - 85}
        cy={120}
        rx={15}
        ry={40}
        style={getLocationStyle('Left Arm')}
        onMouseEnter={(e) => handleLocationInteraction('Left Arm', e)}
        onMouseLeave={(e) => handleLocationInteraction('Left Arm', e)}
        onClick={(e) => handleLocationInteraction('Left Arm', e)}
      />
      
      {/* Right Arm */}
      <ellipse
        cx={config.width / 2 + 85}
        cy={120}
        rx={15}
        ry={40}
        style={getLocationStyle('Right Arm')}
        onMouseEnter={(e) => handleLocationInteraction('Right Arm', e)}
        onMouseLeave={(e) => handleLocationInteraction('Right Arm', e)}
        onClick={(e) => handleLocationInteraction('Right Arm', e)}
      />
      
      {/* Left Leg */}
      <rect
        x={config.width / 2 - 40}
        y={170}
        width={25}
        height={100}
        rx={8}
        style={getLocationStyle('Left Leg')}
        onMouseEnter={(e) => handleLocationInteraction('Left Leg', e)}
        onMouseLeave={(e) => handleLocationInteraction('Left Leg', e)}
        onClick={(e) => handleLocationInteraction('Left Leg', e)}
      />
      
      {/* Right Leg */}
      <rect
        x={config.width / 2 + 15}
        y={170}
        width={25}
        height={100}
        rx={8}
        style={getLocationStyle('Right Leg')}
        onMouseEnter={(e) => handleLocationInteraction('Right Leg', e)}
        onMouseLeave={(e) => handleLocationInteraction('Right Leg', e)}
        onClick={(e) => handleLocationInteraction('Right Leg', e)}
      />
      
      {/* Connection lines for structural clarity */}
      <g stroke={colors.stroke} strokeWidth={1} fill="none">
        {/* Head to torso */}
        <line x1={config.width / 2} y1={75} x2={config.width / 2} y2={80} />
        
        {/* Arms to torso */}
        <line x1={config.width / 2 - 70} y1={120} x2={config.width / 2 - 60} y2={110} />
        <line x1={config.width / 2 + 70} y1={120} x2={config.width / 2 + 60} y2={110} />
        
        {/* Torso to legs */}
        <line x1={config.width / 2 - 25} y1={160} x2={config.width / 2 - 25} y2={170} />
        <line x1={config.width / 2 + 25} y1={160} x2={config.width / 2 + 25} y2={170} />
      </g>
    </g>
  );

  const renderQuadMech = () => (
    <g>
      {/* Head */}
      <ellipse
        cx={config.width / 2}
        cy={50}
        rx={18}
        ry={22}
        style={getLocationStyle('Head')}
        onMouseEnter={(e) => handleLocationInteraction('Head', e)}
        onMouseLeave={(e) => handleLocationInteraction('Head', e)}
        onClick={(e) => handleLocationInteraction('Head', e)}
      />
      
      {/* Center Torso - larger for quad */}
      <rect
        x={config.width / 2 - 30}
        y={80}
        width={60}
        height={100}
        rx={10}
        style={getLocationStyle('Center Torso')}
        onMouseEnter={(e) => handleLocationInteraction('Center Torso', e)}
        onMouseLeave={(e) => handleLocationInteraction('Center Torso', e)}
        onClick={(e) => handleLocationInteraction('Center Torso', e)}
      />
      
      {/* Left Torso */}
      <rect
        x={config.width / 2 - 65}
        y={90}
        width={35}
        height={80}
        rx={6}
        style={getLocationStyle('Left Torso')}
        onMouseEnter={(e) => handleLocationInteraction('Left Torso', e)}
        onMouseLeave={(e) => handleLocationInteraction('Left Torso', e)}
        onClick={(e) => handleLocationInteraction('Left Torso', e)}
      />
      
      {/* Right Torso */}
      <rect
        x={config.width / 2 + 30}
        y={90}
        width={35}
        height={80}
        rx={6}
        style={getLocationStyle('Right Torso')}
        onMouseEnter={(e) => handleLocationInteraction('Right Torso', e)}
        onMouseLeave={(e) => handleLocationInteraction('Right Torso', e)}
        onClick={(e) => handleLocationInteraction('Right Torso', e)}
      />
      
      {/* Front Left Leg */}
      <ellipse
        cx={config.width / 2 - 50}
        cy={120}
        rx={12}
        ry={35}
        style={getLocationStyle('Front Left Leg')}
        onMouseEnter={(e) => handleLocationInteraction('Front Left Leg', e)}
        onMouseLeave={(e) => handleLocationInteraction('Front Left Leg', e)}
        onClick={(e) => handleLocationInteraction('Front Left Leg', e)}
      />
      
      {/* Front Right Leg */}
      <ellipse
        cx={config.width / 2 + 50}
        cy={120}
        rx={12}
        ry={35}
        style={getLocationStyle('Front Right Leg')}
        onMouseEnter={(e) => handleLocationInteraction('Front Right Leg', e)}
        onMouseLeave={(e) => handleLocationInteraction('Front Right Leg', e)}
        onClick={(e) => handleLocationInteraction('Front Right Leg', e)}
      />
      
      {/* Rear Left Leg */}
      <ellipse
        cx={config.width / 2 - 50}
        cy={220}
        rx={12}
        ry={35}
        style={getLocationStyle('Rear Left Leg')}
        onMouseEnter={(e) => handleLocationInteraction('Rear Left Leg', e)}
        onMouseLeave={(e) => handleLocationInteraction('Rear Left Leg', e)}
        onClick={(e) => handleLocationInteraction('Rear Left Leg', e)}
      />
      
      {/* Rear Right Leg */}
      <ellipse
        cx={config.width / 2 + 50}
        cy={220}
        rx={12}
        ry={35}
        style={getLocationStyle('Rear Right Leg')}
        onMouseEnter={(e) => handleLocationInteraction('Rear Right Leg', e)}
        onMouseLeave={(e) => handleLocationInteraction('Rear Right Leg', e)}
        onClick={(e) => handleLocationInteraction('Rear Right Leg', e)}
      />
    </g>
  );

  const renderMechType = () => {
    switch (mechType) {
      case 'Quad':
        return renderQuadMech();
      case 'Biped':
      default:
        return renderBipedMech();
    }
  };

  return (
    <svg
      width={config.width}
      height={config.height}
      viewBox={`0 0 ${config.width} ${config.height}`}
      className="mech-silhouette"
    >
      <defs>
        {/* Add subtle shadow for depth */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.1" />
        </filter>
      </defs>
      
      <g filter="url(#shadow)">
        {renderMechType()}
      </g>
    </svg>
  );
};

export default memo(MechSilhouette);
