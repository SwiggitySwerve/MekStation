/**
 * ConnectorOverlay Component
 *
 * Renders visual connections between mech parts based on layout connectors.
 * Useful for debugging layouts and showing relationships between parts.
 */

import React from 'react';
import { ConnectorPath, ResolvedLayout } from './LayoutTypes';

// ============================================================================
// Connector Styles
// ============================================================================

export type ConnectorStyle = 'line' | 'bracket' | 'joint' | 'dashed' | 'dotted';

interface ConnectorStyleConfig {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
}

const CONNECTOR_STYLES: Record<ConnectorStyle, ConnectorStyleConfig> = {
  line: {
    stroke: '#64748b',
    strokeWidth: 1,
    opacity: 0.6,
  },
  bracket: {
    stroke: '#22d3ee',
    strokeWidth: 2,
    opacity: 0.8,
  },
  joint: {
    stroke: '#f59e0b',
    strokeWidth: 2,
    opacity: 0.7,
  },
  dashed: {
    stroke: '#64748b',
    strokeWidth: 1,
    strokeDasharray: '4 2',
    opacity: 0.6,
  },
  dotted: {
    stroke: '#64748b',
    strokeWidth: 1,
    strokeDasharray: '1 2',
    opacity: 0.5,
  },
};

// ============================================================================
// Individual Connector Component
// ============================================================================

interface ConnectorProps {
  connector: ConnectorPath;
  style?: ConnectorStyle;
  className?: string;
}

function Connector({
  connector,
  style = 'line',
  className = '',
}: ConnectorProps): React.ReactElement {
  const styleConfig = CONNECTOR_STYLES[connector.style ?? style];

  return (
    <path
      d={connector.path}
      fill="none"
      stroke={styleConfig.stroke}
      strokeWidth={styleConfig.strokeWidth}
      strokeDasharray={styleConfig.strokeDasharray}
      opacity={styleConfig.opacity}
      className={`transition-opacity duration-200 ${className}`}
    />
  );
}

// ============================================================================
// Anchor Point Indicator Component
// ============================================================================

interface AnchorIndicatorProps {
  x: number;
  y: number;
  label?: string;
  color?: string;
  size?: number;
}

function AnchorIndicator({
  x,
  y,
  label,
  color = '#22d3ee',
  size = 4,
}: AnchorIndicatorProps): React.ReactElement {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={size}
        fill={color}
        opacity={0.8}
        className="transition-all duration-200"
      />
      <circle
        cx={x}
        cy={y}
        r={size + 2}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.4}
      />
      {label && (
        <text
          x={x}
          y={y - size - 4}
          textAnchor="middle"
          fontSize={8}
          fill={color}
          opacity={0.8}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ============================================================================
// Main ConnectorOverlay Component
// ============================================================================

export interface ConnectorOverlayProps {
  /** The resolved layout containing connector paths */
  layout: ResolvedLayout;
  /** Default style for connectors */
  style?: ConnectorStyle;
  /** Whether to show anchor point indicators */
  showAnchors?: boolean;
  /** Anchor point indicator color */
  anchorColor?: string;
  /** Whether to show anchor labels */
  showAnchorLabels?: boolean;
  /** Only show specific connectors (by index) */
  visibleConnectors?: number[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders visual connector lines between mech parts
 *
 * @example
 * ```tsx
 * const { layout } = useResolvedLayout('geometric-biped');
 *
 * return (
 *   <svg viewBox={layout.viewBox}>
 *     <ConnectorOverlay layout={layout} style="dashed" showAnchors />
 *   </svg>
 * );
 * ```
 */
export function ConnectorOverlay({
  layout,
  style = 'line',
  showAnchors = false,
  anchorColor = '#22d3ee',
  showAnchorLabels = false,
  visibleConnectors,
  className = '',
}: ConnectorOverlayProps): React.ReactElement {
  const connectors = visibleConnectors
    ? layout.connectors.filter((_, i) => visibleConnectors.includes(i))
    : layout.connectors;

  return (
    <g className={`connector-overlay ${className}`}>
      {/* Render connector lines */}
      {connectors.map((connector, index) => (
        <Connector key={index} connector={connector} style={style} />
      ))}

      {/* Render anchor points if enabled */}
      {showAnchors &&
        Object.entries(layout.positions).map(([location, pos]) => {
          if (!pos) return null;

          return Object.entries(pos.anchors).map(([anchorId, anchor]) => (
            <AnchorIndicator
              key={`${location}-${anchorId}`}
              x={anchor.x}
              y={anchor.y}
              label={showAnchorLabels ? anchorId : undefined}
              color={anchorColor}
              size={3}
            />
          ));
        })}
    </g>
  );
}

// ============================================================================
// Debug Overlay Component
// ============================================================================

export interface DebugOverlayProps {
  /** The resolved layout to debug */
  layout: ResolvedLayout;
  /** Whether to show part bounding boxes */
  showBoundingBoxes?: boolean;
  /** Whether to show part centers */
  showCenters?: boolean;
  /** Whether to show all anchors */
  showAnchors?: boolean;
  /** Whether to show connectors */
  showConnectors?: boolean;
  /** Whether to show labels */
  showLabels?: boolean;
}

/**
 * Debug overlay that shows layout structure
 */
export function DebugOverlay({
  layout,
  showBoundingBoxes = true,
  showCenters = true,
  showAnchors = true,
  showConnectors = true,
  showLabels = true,
}: DebugOverlayProps): React.ReactElement {
  return (
    <g className="debug-overlay" pointerEvents="none">
      {/* Bounding boxes */}
      {showBoundingBoxes &&
        Object.entries(layout.positions).map(([location, pos]) => {
          if (!pos) return null;

          return (
            <rect
              key={`bbox-${location}`}
              x={pos.x}
              y={pos.y}
              width={pos.width}
              height={pos.height}
              fill="none"
              stroke="#ef4444"
              strokeWidth={0.5}
              strokeDasharray="2 2"
              opacity={0.5}
            />
          );
        })}

      {/* Centers */}
      {showCenters &&
        Object.entries(layout.positions).map(([location, pos]) => {
          if (!pos) return null;

          return (
            <g key={`center-${location}`}>
              <circle
                cx={pos.center.x}
                cy={pos.center.y}
                r={2}
                fill="#ef4444"
                opacity={0.8}
              />
              {showLabels && (
                <text
                  x={pos.center.x}
                  y={pos.center.y - 6}
                  textAnchor="middle"
                  fontSize={7}
                  fill="#ef4444"
                  opacity={0.8}
                >
                  {location}
                </text>
              )}
            </g>
          );
        })}

      {/* Anchors */}
      {showAnchors && (
        <ConnectorOverlay
          layout={layout}
          showAnchors
          showAnchorLabels={showLabels}
          anchorColor="#22d3ee"
        />
      )}

      {/* Connectors */}
      {showConnectors && (
        <ConnectorOverlay layout={layout} style="dashed" />
      )}
    </g>
  );
}

export default ConnectorOverlay;
