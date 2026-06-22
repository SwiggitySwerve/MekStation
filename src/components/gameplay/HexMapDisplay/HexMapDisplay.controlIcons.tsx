import React from 'react';

interface ControlIconProps {
  readonly children: React.ReactNode;
}

function ControlIcon({ children }: ControlIconProps): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IsometricIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 3 21 8 12 13 3 8 12 3Z" />
      <path d="M21 8v7l-9 6-9-6V8" />
      <path d="M12 13v8" />
    </ControlIcon>
  );
}

export function TopDownIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" />
      <path d="M8 8.5h8" />
      <path d="M8 12h8" />
      <path d="M8 15.5h8" />
    </ControlIcon>
  );
}

export function RotateLeftIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M9 7H4V2" />
      <path d="M4.6 7.8A8 8 0 1 1 6 18.5" />
    </ControlIcon>
  );
}

export function RotateRightIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M15 7h5V2" />
      <path d="M19.4 7.8A8 8 0 1 0 18 18.5" />
    </ControlIcon>
  );
}

export function MovementIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M5 17 9 7l4 10 2-5 4 5" />
      <circle cx={9} cy={7} r={2} />
      <circle cx={19} cy={17} r={2} />
    </ControlIcon>
  );
}

export function CoverIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 3 19 6v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6l7-3Z" />
      <path d="M9 12h6" />
    </ControlIcon>
  );
}

export function ElevationIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M5 17h14" />
      <path d="M7 13h10" />
      <path d="M9 9h6" />
      <path d="M12 5v12" />
      <path d="M9 8 12 5l3 3" />
    </ControlIcon>
  );
}

export function FiringArcIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 18V6" />
      <path d="M6 18a6 6 0 0 1 12 0" />
      <path d="M8 10 12 6l4 4" />
    </ControlIcon>
  );
}

export function LosIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M4 12h16" />
      <path d="M7 9 4 12l3 3" />
      <path d="M17 9l3 3-3 3" />
      <circle cx={12} cy={12} r={2} />
    </ControlIcon>
  );
}

export function ZoomInIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <circle cx={10.5} cy={10.5} r={5.5} />
      <path d="M10.5 8v5" />
      <path d="M8 10.5h5" />
      <path d="M15 15l5 5" />
    </ControlIcon>
  );
}

export function ZoomOutIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <circle cx={10.5} cy={10.5} r={5.5} />
      <path d="M8 10.5h5" />
      <path d="M15 15l5 5" />
    </ControlIcon>
  );
}

export function ResetViewIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v6h6" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </ControlIcon>
  );
}
