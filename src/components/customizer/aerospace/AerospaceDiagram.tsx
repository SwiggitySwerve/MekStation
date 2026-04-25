/**
 * AerospaceDiagram (compatibility re-export)
 *
 * Pre-Wave 4 placeholder. The full per-type armor diagram now lives in
 * {@link AerospaceArmorDiagram}. This wrapper preserves the legacy
 * `<AerospaceDiagram />` import path used by `AerospaceCustomizer`'s overview
 * sidebar.
 *
 * Per add-per-type-armor-diagrams task 8.2: convert placeholders to re-exports
 * from the new files.
 *
 * @deprecated Import {@link AerospaceArmorDiagram} directly.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Aerospace Diagram Geometry
 */

import React from "react";

import { AerospaceArmorDiagram } from "./AerospaceArmorDiagram";

interface AerospaceDiagramProps {
  className?: string;
  /** Compact mode is no longer honoured — the new diagram is always responsive. */
  compact?: boolean;
}

export function AerospaceDiagram({
  className = "",
}: AerospaceDiagramProps): React.ReactElement {
  return <AerospaceArmorDiagram className={className} />;
}

export default AerospaceDiagram;
