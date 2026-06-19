import React from 'react';

export interface ArmorLocationInteractionGroupProps {
  location: string;
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
  showRear: boolean;
  isSelected: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  children: React.ReactNode;
}

function handleArmorLocationKeyDown(
  event: React.KeyboardEvent<SVGGElement>,
  onClick: () => void,
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick();
  }
}

export function ArmorLocationInteractionGroup({
  location,
  current,
  maximum,
  rear = 0,
  rearMaximum = 1,
  showRear,
  isSelected,
  onClick,
  onHover,
  children,
}: ArmorLocationInteractionGroupProps): React.ReactElement {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${current} of ${maximum}${showRear ? `, rear: ${rear} of ${rearMaximum}` : ''}`}
      aria-pressed={isSelected}
      className="cursor-pointer focus:outline-none"
      onClick={onClick}
      onKeyDown={(event) => handleArmorLocationKeyDown(event, onClick)}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      {children}
    </g>
  );
}
