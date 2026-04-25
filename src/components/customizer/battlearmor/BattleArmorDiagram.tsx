/**
 * BattleArmorDiagram (compatibility re-export)
 *
 * Pre-Wave 4 placeholder. The full per-type pip grid now lives in
 * {@link BattleArmorPipGrid}. This wrapper preserves the legacy
 * `<BattleArmorDiagram />` import path used by `BattleArmorCustomizer`'s
 * overview sidebar.
 *
 * Per add-per-type-armor-diagrams task 8.2: convert placeholders to re-exports
 * from the new files.
 *
 * @deprecated Import {@link BattleArmorPipGrid} directly.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: BattleArmor Per-Trooper Grid
 */

import React from "react";

import { BattleArmorPipGrid } from "./BattleArmorPipGrid";

interface BattleArmorDiagramProps {
  className?: string;
}

export function BattleArmorDiagram({
  className = "",
}: BattleArmorDiagramProps): React.ReactElement {
  return <BattleArmorPipGrid className={className} />;
}

export default BattleArmorDiagram;
