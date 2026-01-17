/**
 * Variant Thumbnail
 *
 * Mini ~40x60px preview showing center torso in each variant's style.
 * Self-contained styling - does not inherit from global theme.
 */

import React from 'react';
import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

interface VariantThumbnailProps {
  variant: ArmorDiagramVariant;
  className?: string;
}

export function VariantThumbnail({ variant, className = '' }: VariantThumbnailProps): React.ReactElement {
  // Make filter/gradient IDs unique per variant to avoid conflicts when multiple thumbnails are rendered
  const neonGlowId = `neon-glow-${variant}`;
  const metallicGradientId = `metallic-gradient-${variant}`;

  // Render a simplified center torso shape with variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'clean-tech':
        return {
          fill: '#22c55e',
          stroke: '#000',
          strokeWidth: 1.5,
          filter: undefined,
        };
      case 'neon-operator':
        return {
          fill: 'rgba(6, 182, 212, 0.3)',
          stroke: '#06b6d4',
          strokeWidth: 2,
          filter: `url(#${neonGlowId})`,
        };
      case 'tactical-hud':
        return {
          fill: '#1e3a5f',
          stroke: '#3b82f6',
          strokeWidth: 1.5,
          filter: undefined,
        };
      case 'premium-material':
        return {
          fill: `url(#${metallicGradientId})`,
          stroke: '#94a3b8',
          strokeWidth: 1,
          filter: undefined,
        };
      case 'megamek':
        return {
          fill: '#f5f5dc', // Beige/cream for record sheet style
          stroke: '#8b7355', // Brown/sepia outline
          strokeWidth: 1.2,
          filter: undefined,
        };
      default: {
        const _exhaustiveCheck: never = variant;
        return _exhaustiveCheck;
      }
    }
  };

  const styles = getVariantStyles();

  return (
    <svg
      viewBox="0 0 40 60"
      className={`w-10 h-[60px] ${className}`}
      aria-label={`${variant} style preview`}
      role="img"
    >
      <defs>
        <filter id={neonGlowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={metallicGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Simplified torso shape */}
      <rect
        x="8"
        y="5"
        width="24"
        height="50"
        rx="3"
        fill={styles.fill}
        stroke={styles.stroke}
        strokeWidth={styles.strokeWidth}
        filter={styles.filter}
      />

      {/* Variant-specific decorations */}
      {variant === 'neon-operator' && (
        <rect
          x="12"
          y="10"
          width="16"
          height="40"
          rx="2"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
      )}

      {variant === 'tactical-hud' && (
        <>
          <rect x="14" y="20" width="12" height="4" fill="#3b82f6" opacity="0.8" />
          <rect x="14" y="28" width="12" height="4" fill="#3b82f6" opacity="0.6" />
          <rect x="14" y="36" width="12" height="4" fill="#3b82f6" opacity="0.4" />
        </>
      )}

      {/* Standard (clean-tech): Front/rear divider line */}
      {variant === 'clean-tech' && (
        <>
          <line
            x1="10"
            y1="35"
            x2="30"
            y2="35"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          <text x="20" y="22" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">F</text>
          <text x="20" y="46" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">R</text>
        </>
      )}

      {/* MegaMek: Shadow offset effect */}
      {variant === 'megamek' && (
        <>
          {/* Shadow layer */}
          <rect
            x="10"
            y="7"
            width="24"
            height="50"
            rx="3"
            fill="#1a1a1a"
            opacity="0.3"
          />
          {/* Divider line */}
          <line
            x1="10"
            y1="35"
            x2="30"
            y2="35"
            stroke="#8b7355"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        </>
      )}

      {/* Chromatic (Premium Material): Circular badge overlay */}
      {variant === 'premium-material' && (
        <>
          {/* Badge circle */}
          <circle
            cx="20"
            cy="30"
            r="10"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle
            cx="20"
            cy="30"
            r="7"
            fill="#475569"
            stroke="#64748b"
            strokeWidth="0.5"
          />
          <text x="20" y="33" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">24</text>
        </>
      )}
    </svg>
  );
}
