import type { VehicleArmorLocation } from '@/utils/construction/vehicle/editorArmor';

/** Presentation coordinates only; installed sides and armor come from construction. */
const REGIONS: Readonly<Record<string, readonly [string, number, number]>> = {
  Front: ['10,55 120,0 230,55 180,80 120,50 60,80', 120, 30],
  'Front Right': ['230,55 230,110 180,110 180,80', 204, 84],
  'Front Left': ['10,55 60,80 60,110 10,110', 36, 84],
  'Rear Right': ['230,110 230,165 180,140 180,110', 204, 139],
  'Rear Left': ['10,110 60,110 60,140 10,165', 36, 139],
  Rear: ['10,165 60,140 120,170 180,140 230,165 120,220', 120, 192],
};

export function VehicleSixSideArmorDiagram({
  locations,
  allocation,
  hasTurret,
  hasSecondaryTurret,
}: {
  locations: readonly { location: VehicleArmorLocation; label: string }[];
  allocation: Readonly<Record<string, number>>;
  hasTurret: boolean;
  hasSecondaryTurret: boolean;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 240 220"
      className="w-full max-w-xs"
      role="img"
      aria-label="Six-Side Armor Layout"
      data-testid="vehicle-six-side-armor-diagram"
    >
      {locations.map(({ location, label }) => {
        const region = REGIONS[location];
        if (!region) return null;
        const [points, x, y] = region;
        return (
          <g key={location}>
            <polygon
              points={points}
              className="fill-surface-raised stroke-cyan-400"
            />
            <foreignObject x={x - 30} y={y - 8} width="60" height="16">
              <div className="text-text-theme-primary flex h-full items-center justify-center text-[9px]">
                <span data-testid="six-side-label">{label}</span>
              </div>
            </foreignObject>
            <text
              x={x}
              y={y + 13}
              textAnchor="middle"
              className="fill-cyan-400 text-[10px]"
            >
              {allocation[location] ?? 0}
            </text>
          </g>
        );
      })}
      {hasTurret && (
        <circle
          cx="120"
          cy="125"
          r="18"
          className="fill-amber-900/30 stroke-amber-500"
        />
      )}
      {hasSecondaryTurret && (
        <circle
          cx="120"
          cy="85"
          r="18"
          className="fill-orange-900/30 stroke-orange-500"
        />
      )}
    </svg>
  );
}
