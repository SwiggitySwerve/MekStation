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
  HEALTHY: { min: 0.75, color: '#22c55e' },    // green-500
  MODERATE: { min: 0.5, color: '#f59e0b' },    // amber-500
  LOW: { min: 0.25, color: '#f97316' },        // orange-500
  CRITICAL: { min: 0, color: '#ef4444' },      // red-500
} as const;

export const SELECTED_COLOR = '#3b82f6';        // blue-500
export const SELECTED_STROKE = '#60a5fa';       // blue-400
export const HOVER_LIGHTEN = 0.15;

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
  if (ratio >= 0.75) return 'url(#armor-gradient-healthy)';
  if (ratio >= 0.5) return 'url(#armor-gradient-moderate)';
  if (ratio >= 0.25) return 'url(#armor-gradient-low)';
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
