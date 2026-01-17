/**
 * Armor Fill Styles and Gradients
 *
 * SVG definitions for various fill styles used by armor diagrams.
 */

import React from 'react';

/**
 * Status thresholds for armor coloring
 */
export const ARMOR_STATUS = {
  HEALTHY: { min: 0.6, color: '#22c55e' },     // green-500  (≥60%)
  MODERATE: { min: 0.4, color: '#f59e0b' },    // amber-500  (≥40%)
  LOW: { min: 0.2, color: '#f97316' },         // orange-500 (≥20%)
  CRITICAL: { min: 0, color: '#ef4444' },      // red-500    (<20%)
} as const;

export const SELECTED_COLOR = '#3b82f6';        // blue-500
export const SELECTED_STROKE = '#60a5fa';       // blue-400
export const HOVER_LIGHTEN = 0.15;

// Front/Rear armor colors for consistent UI
export const FRONT_ARMOR_COLOR = '#f59e0b';     // amber-500
export const REAR_ARMOR_COLOR = '#0ea5e9';      // sky-500
export const FRONT_ARMOR_LIGHT = '#fbbf24';     // amber-400
export const REAR_ARMOR_LIGHT = '#38bdf8';      // sky-400

/**
 * MegaMek-specific record sheet colors
 * Uses beige/cream palette for authentic appearance
 */
export const MEGAMEK_COLORS = {
  HEALTHY: '#d4c896',     // Warm beige - high armor
  MODERATE: '#c9a868',    // Tan/amber - moderate armor
  LOW: '#b8905a',         // Brown-tan - low armor
  CRITICAL: '#a3694a',    // Brown-red - critical armor
  OUTLINE: '#8b7355',     // Brown/sepia outline
  SHADOW: '#1a1a1a',      // Shadow color
} as const;

/**
 * Get MegaMek status color (beige palette) based on armor percentage
 */
export function getMegaMekStatusColor(current: number, maximum: number): string {
  if (maximum === 0) return MEGAMEK_COLORS.CRITICAL;
  const ratio = current / maximum;

  if (ratio >= ARMOR_STATUS.HEALTHY.min) return MEGAMEK_COLORS.HEALTHY;
  if (ratio >= ARMOR_STATUS.MODERATE.min) return MEGAMEK_COLORS.MODERATE;
  if (ratio >= ARMOR_STATUS.LOW.min) return MEGAMEK_COLORS.LOW;
  return MEGAMEK_COLORS.CRITICAL;
}

/**
 * Get MegaMek front torso status color
 */
export function getMegaMekFrontStatusColor(frontCurrent: number, totalMax: number): string {
  const expectedFrontMax = Math.round(totalMax * 0.75);
  return getMegaMekStatusColor(frontCurrent, expectedFrontMax);
}

/**
 * Get MegaMek rear torso status color
 */
export function getMegaMekRearStatusColor(rearCurrent: number, totalMax: number): string {
  const expectedRearMax = Math.round(totalMax * 0.25);
  return getMegaMekStatusColor(rearCurrent, expectedRearMax);
}

/**
 * Get status color based on armor percentage
 */
export function getArmorStatusColor(current: number, maximum: number): string {
  if (maximum === 0) return ARMOR_STATUS.CRITICAL.color;
  const ratio = current / maximum;

  if (ratio >= ARMOR_STATUS.HEALTHY.min) return ARMOR_STATUS.HEALTHY.color;
  if (ratio >= ARMOR_STATUS.MODERATE.min) return ARMOR_STATUS.MODERATE.color;
  if (ratio >= ARMOR_STATUS.LOW.min) return ARMOR_STATUS.LOW.color;
  return ARMOR_STATUS.CRITICAL.color;
}

/**
 * Standard front/rear armor distribution ratio (75/25 split)
 */
const FRONT_RATIO = 0.75;
const REAR_RATIO = 0.25;

/**
 * Get status color for torso front armor based on expected capacity
 *
 * Uses 75/25 split as baseline - front "expected max" is 75% of total max.
 * This ensures front armor shows green when at expected capacity,
 * even though front has more raw points than rear.
 *
 * @param frontCurrent - Current front armor points
 * @param totalMax - Total max armor for location (front + rear combined)
 * @returns Status color
 */
export function getTorsoFrontStatusColor(frontCurrent: number, totalMax: number): string {
  const expectedFrontMax = Math.round(totalMax * FRONT_RATIO);
  return getArmorStatusColor(frontCurrent, expectedFrontMax);
}

/**
 * Get status color for torso rear armor based on expected capacity
 *
 * Uses 75/25 split as baseline - rear "expected max" is 25% of total max.
 *
 * @param rearCurrent - Current rear armor points
 * @param totalMax - Total max armor for location (front + rear combined)
 * @returns Status color
 */
export function getTorsoRearStatusColor(rearCurrent: number, totalMax: number): string {
  const expectedRearMax = Math.round(totalMax * REAR_RATIO);
  return getArmorStatusColor(rearCurrent, expectedRearMax);
}

/**
 * Get status color for a torso location based on total (front + rear) armor
 * For non-torso locations, use getArmorStatusColor instead
 */
export function getTorsoStatusColor(
  frontCurrent: number,
  frontMax: number,
  rearCurrent: number = 0
): string {
  // Total max is frontMax (which is the full location max)
  // Total current is front + rear
  const totalCurrent = frontCurrent + rearCurrent;
  const totalMax = frontMax;

  return getArmorStatusColor(totalCurrent, totalMax);
}

/**
 * Calculate fill percentage for a torso location based on total (front + rear)
 */
export function getTorsoFillPercent(
  frontCurrent: number,
  frontMax: number,
  rearCurrent: number = 0
): number {
  const totalCurrent = frontCurrent + rearCurrent;
  const totalMax = frontMax;

  if (totalMax === 0) return 0;
  return Math.min(100, (totalCurrent / totalMax) * 100);
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Darken a hex color
 */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * SVG Definitions for gradient fills
 */
export function GradientDefs(): React.ReactElement {
  return (
    <defs>
      {/* Solid status gradients */}
      <linearGradient id="armor-gradient-healthy" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>

      <linearGradient id="armor-gradient-moderate" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      <linearGradient id="armor-gradient-low" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>

      <linearGradient id="armor-gradient-critical" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>

      <linearGradient id="armor-gradient-selected" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>

      {/* Front armor gradient (amber) */}
      <linearGradient id="armor-gradient-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      {/* Rear armor gradient (sky blue) */}
      <linearGradient id="armor-gradient-rear" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>

      {/* Metallic effect */}
      <linearGradient id="armor-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
      </linearGradient>

      {/* Glow filter */}
      <filter id="armor-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Strong glow for neon effect */}
      <filter id="armor-neon-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur1" />
        <feGaussianBlur stdDeviation="8" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Drop shadow for lift effect */}
      <filter id="armor-lift-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
      </filter>

      {/* Inner shadow for depth */}
      <filter id="armor-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feOffset dx="1" dy="1" />
        <feGaussianBlur stdDeviation="2" result="offset-blur" />
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
        <feFlood floodColor="black" floodOpacity="0.3" result="color" />
        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
      </filter>

      {/* Scanline pattern for HUD effect */}
      <pattern id="armor-scanlines" patternUnits="userSpaceOnUse" width="4" height="4">
        <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      </pattern>

      {/* Grid pattern for technical look */}
      <pattern id="armor-grid" patternUnits="userSpaceOnUse" width="10" height="10">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      </pattern>

      {/* Carbon fiber texture */}
      <pattern id="armor-carbon" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="4" height="4" fill="#1e293b" />
        <rect x="0" y="0" width="2" height="2" fill="#334155" />
        <rect x="2" y="2" width="2" height="2" fill="#334155" />
      </pattern>
    </defs>
  );
}

/**
 * Get gradient ID based on armor ratio
 */
export function getArmorGradientId(current: number, maximum: number, isSelected: boolean): string {
  if (isSelected) return 'url(#armor-gradient-selected)';
  if (maximum === 0) return 'url(#armor-gradient-critical)';

  const ratio = current / maximum;
  if (ratio >= ARMOR_STATUS.HEALTHY.min) return 'url(#armor-gradient-healthy)';
  if (ratio >= ARMOR_STATUS.MODERATE.min) return 'url(#armor-gradient-moderate)';
  if (ratio >= ARMOR_STATUS.LOW.min) return 'url(#armor-gradient-low)';
  return 'url(#armor-gradient-critical)';
}

/**
 * Props for creating a tank-fill clip path
 */
export interface TankFillProps {
  id: string;
  fillPercent: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Create a clip path for tank-style bottom-up fill
 */
export function TankFillClipPath({ id, fillPercent, x, y, width, height }: TankFillProps): React.ReactElement {
  const fillHeight = height * (fillPercent / 100);
  const fillY = y + height - fillHeight;

  return (
    <clipPath id={id}>
      <rect x={x} y={fillY} width={width} height={fillHeight} />
    </clipPath>
  );
}
