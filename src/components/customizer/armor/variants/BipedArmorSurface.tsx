import React, { useId } from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import {
  getArmorStatusColor,
  lightenColor,
  MEGAMEK_COLORS,
} from '../shared/ArmorFills';

export const BIPED_ARMOR_INK = { primary: '#ffffff', secondary: '#e2e8f0' };

interface BipedArmorSurfaceProps {
  path: string;
  variant: ArmorDiagramVariant;
  current: number;
  maximum: number;
  location?: string;
  selected?: boolean;
  focused?: boolean;
  preview?: boolean;
}

/**
 * Paint one armor plate with a status-colored capacity fill rising from its
 * lower edge. The plate remains the single geometry-bearing path for the
 * location; decorative layers are clipped to the same filled portion.
 */
export function BipedArmorSurface({
  path,
  variant,
  current,
  maximum,
  location,
  selected = false,
  focused = false,
  preview = false,
}: BipedArmorSurfaceProps): React.ReactElement {
  const id = useId();
  const fillId = `${id}-fill`;
  const fillClipId = `${id}-fill-clip`;
  const textureId = `${id}-texture`;
  const status = getArmorStatusColor(current, maximum);
  const ratio = maximum > 0 ? Math.min(1, Math.max(0, current / maximum)) : 0;
  const boundary = 1 - ratio;
  const isGlow = variant === 'neon-operator';
  const isHud = variant === 'tactical-hud';
  const isMetal = variant === 'premium-material';
  const isPaper = variant === 'megamek';
  const emptyColor = isPaper
    ? '#1c1b18'
    : isGlow
      ? '#020b12'
      : isHud
        ? '#03131e'
        : isMetal
          ? '#101d2c'
          : '#0b1620';
  const stroke = selected || focused ? 'var(--accent-primary)' : status;

  return (
    <>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={emptyColor} />
          <stop offset={boundary} stopColor={emptyColor} />
          <stop offset={boundary} stopColor={status} stopOpacity="0.2" />
          <stop offset="1" stopColor={status} stopOpacity="0.2" />
        </linearGradient>
        <clipPath id={fillClipId} clipPathUnits="objectBoundingBox">
          <rect x="0" y={boundary} width="1" height={ratio} />
        </clipPath>
        {isGlow && (
          <radialGradient id={textureId} cx="50%" cy="80%" r="70%">
            <stop
              offset="0"
              stopColor={lightenColor(status, 0.12)}
              stopOpacity="0.24"
            />
            <stop offset="1" stopColor={status} stopOpacity="0" />
          </radialGradient>
        )}
        {isMetal && (
          <linearGradient id={textureId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="0.18" stopColor="#020617" stopOpacity="0.08" />
            <stop offset="0.44" stopColor="#020617" stopOpacity="0.3" />
            <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.44" />
            <stop offset="0.68" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#020617" stopOpacity="0.34" />
          </linearGradient>
        )}
        {isHud && (
          <pattern
            id={textureId}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0 H5"
              stroke={lightenColor(status, 0.2)}
              strokeWidth="1"
              opacity="0.4"
            />
          </pattern>
        )}
        {isPaper && (
          <pattern
            id={textureId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="0.65"
              fill={MEGAMEK_COLORS.OUTLINE}
              opacity="0.3"
            />
          </pattern>
        )}
      </defs>
      <path
        data-armor-plate={location}
        data-armor-status={status}
        data-armor-material={variant}
        data-armor-fill={location ?? 'preview'}
        data-armor-fill-ratio={ratio}
        d={path}
        fill={`url(#${fillId})`}
        stroke={stroke}
        strokeWidth={preview ? 5 : selected || focused ? 3 : 2}
        strokeDasharray={
          focused && !selected ? '5 3' : isHud ? '3 2' : undefined
        }
        strokeLinejoin="round"
        style={
          isGlow ? { filter: `drop-shadow(0 0 4px ${status})` } : undefined
        }
      />
      {(isGlow || isHud || isMetal || isPaper) && (
        <path
          d={path}
          fill={`url(#${textureId})`}
          opacity="0.3"
          clipPath={`url(#${fillClipId})`}
          pointerEvents="none"
          aria-hidden="true"
          data-armor-fill-texture
        />
      )}
    </>
  );
}
