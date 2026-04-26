/**
 * Award icon shared types — leaf module to break circular dependency
 * between awardIcons.tsx and awardIconComponents.tsx.
 */

export interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}
