/**
 * VehicleDiagram (compatibility re-export)
 *
 * The original placeholder lived here pre-Wave 4. The full per-type armor
 * diagram is now {@link VehicleArmorDiagram}. This thin wrapper preserves the
 * legacy `<VehicleDiagram />` import path used by `VehicleCustomizer`'s
 * "Vehicle Overview" sidebar so callers continue to work.
 *
 * Per add-per-type-armor-diagrams task 8.2: convert placeholders to re-exports
 * from the new files.
 *
 * @deprecated Import {@link VehicleArmorDiagram} directly. This wrapper exists
 *   only to keep historic call-sites compiling.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Vehicle Diagram Geometry
 */

import React from "react";

import { VehicleArmorDiagram } from "./VehicleArmorDiagram";

interface VehicleDiagramProps {
  className?: string;
  /** Compact mode is no longer honoured — the new diagram is always responsive. */
  compact?: boolean;
}

export function VehicleDiagram({
  className = "",
}: VehicleDiagramProps): React.ReactElement {
  return <VehicleArmorDiagram className={className} />;
}

export default VehicleDiagram;
