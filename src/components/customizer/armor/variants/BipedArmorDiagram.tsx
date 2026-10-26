import React, { useId, useState } from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { MechLocation } from '@/types/construction';

import {
  ArmorLocationTable,
  buildArmorLocationTableRows,
} from '../ArmorLocationTable';
import { ArmorAllocationFooter } from '../shared/ArmorAllocationFooter';
import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { getArmorFaceMaximums } from '../shared/ArmorFaceMaximums';
import { getArmorStatusColor } from '../shared/ArmorFills';
import { ArmorLocationInteractionGroup } from '../shared/ArmorLocationInteractionGroup';
import {
  BIPED_ARMOR_LOCATIONS,
  type ConfigurableArmorDiagramProps,
} from '../shared/ArmorVariantRenderHelpers';
import { DiagramHeader } from '../shared/DiagramHeader';
import { BipedArmorPlateLabel } from './BipedArmorPlateLabel';
import { BipedArmorSurface } from './BipedArmorSurface';
import {
  BIPED_ARMOR_PLATES,
  BIPED_ARMOR_VIEWBOX,
} from './CleanTechBipedDiagram.geometry';

/** Locations whose plate carries a rear face. */
const LOCATIONS_WITH_REAR: ReadonlySet<MechLocation> = new Set(
  BIPED_ARMOR_LOCATIONS.filter((l) => BIPED_ARMOR_PLATES[l]?.hasRear === true),
);

interface BipedArmorDiagramProps extends ConfigurableArmorDiagramProps {
  variant?: ArmorDiagramVariant;
}

/**
 * Neck and pelvis frame. Drawn as a raised, outlined structural fill so the
 * gaps between the head, torso and legs read as part of the silhouette.
 */
function BipedStructureFrame(): React.ReactElement {
  return (
    <g
      fill="var(--surface-raised)"
      stroke="var(--border-theme-subtle)"
      aria-hidden="true"
      data-armor-structure
    >
      <path d="M163 78 H197 V104 H163 Z" />
      <path d="M144 198 H216 L222 238 H138 Z" />
    </g>
  );
}

export function BipedArmorDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  variant = 'clean-tech',
  unallocatedPoints,
  footerVisibility = 'always',
}: BipedArmorDiagramProps): React.ReactElement {
  const [hovered, setHovered] = useState<MechLocation | null>(null);

  const gridId = useId();
  const tableRows = buildArmorLocationTableRows(
    armorData,
    BIPED_ARMOR_LOCATIONS,
    LOCATIONS_WITH_REAR,
  );

  return (
    <div
      className={`bg-surface-base border-border-theme @container flex flex-col rounded-lg border p-3 sm:p-4 ${className}`}
      data-armor-variant={variant}
    >
      <DiagramHeader title="Armor Allocation" className="mb-2 sm:mb-4" />
      <div className="flex flex-col @[40rem]:flex-row @[40rem]:items-center @[40rem]:justify-center @[40rem]:gap-6">
        <div className="min-w-0 @[40rem]:max-w-[440px] @[40rem]:flex-1">
          <p className="text-text-theme-secondary mb-1 text-center text-xs sm:mb-2">
            Front view &middot; click a location to edit
          </p>
          <ArmorDiagramSvgFrame
            viewBox={BIPED_ARMOR_VIEWBOX}
            className="mx-auto max-h-[max(20rem,calc(100dvh-31rem))] w-full max-w-[360px] @[40rem]:max-h-none @[40rem]:max-w-[440px]"
          >
            <g
              fill="var(--text-secondary)"
              fontSize="15"
              textAnchor="middle"
              aria-hidden="true"
            >
              <text x="16" y="294">
                Right
              </text>
              <text x="344" y="294">
                Left
              </text>
            </g>
            <defs>
              <pattern
                id={gridId}
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect
              x="-22"
              y="8"
              width="404"
              height="424"
              fill={`url(#${gridId})`}
              opacity={variant === 'megamek' ? 0 : 0.32}
              aria-hidden="true"
            />
            <BipedStructureFrame />
            <path
              d="M180 12 V428"
              fill="none"
              stroke="var(--border-subtle)"
              strokeDasharray="3 7"
              aria-hidden="true"
            />
            {BIPED_ARMOR_LOCATIONS.map((location) => {
              const plate = BIPED_ARMOR_PLATES[location];
              if (!plate) return null;
              const data = armorData.find((item) => item.location === location);
              const current = data?.current ?? 0;
              const maximum = data?.maximum ?? 0;
              const rear = data?.rear ?? 0;
              const showRear = plate.hasRear === true;
              const total = current + (showRear ? rear : 0);
              const selected = selectedLocation === location;
              const focused = hovered === location;
              const statusColor = getArmorStatusColor(total, maximum);
              const ratio =
                maximum > 0 ? Math.min(1, Math.max(0, total / maximum)) : 0;
              return (
                <ArmorLocationInteractionGroup
                  key={location}
                  location={location}
                  current={current}
                  maximum={maximum}
                  rear={rear}
                  rearMaximum={data?.rearMaximum ?? 0}
                  showRear={showRear}
                  isSelected={selected}
                  onClick={() => onLocationClick(location)}
                  onHover={(active) => setHovered(active ? location : null)}
                >
                  <title>
                    {selected ? location + ' \u2014 selected' : location}
                  </title>
                  <BipedArmorSurface
                    path={plate.path}
                    location={location}
                    variant={variant}
                    current={total}
                    maximum={maximum}
                    selected={selected}
                    focused={focused}
                  />
                  <BipedArmorPlateLabel
                    plate={plate}
                    location={location}
                    variant={variant}
                    current={current}
                    rear={rear}
                    maximum={maximum}
                    faceMaximums={getArmorFaceMaximums(maximum, current, rear)}
                    statusColor={statusColor}
                    ratio={ratio}
                  />
                </ArmorLocationInteractionGroup>
              );
            })}
          </ArmorDiagramSvgFrame>
        </div>
        <ArmorLocationTable
          rows={tableRows}
          selectedLocation={selectedLocation}
          onLocationClick={onLocationClick}
          className="hidden @[40rem]:block @[40rem]:w-[19rem] @[40rem]:shrink-0"
        />
      </div>
      <ArmorAllocationFooter
        unallocatedPoints={unallocatedPoints}
        className={footerVisibility === 'below-xl' ? 'xl:hidden' : ''}
      />
      <p className="sr-only">
        Armor locations are buttons. Tab to a location, then press Enter to edit
        its armor values.
      </p>
    </div>
  );
}
