/**
 * CasualtyPanel
 *
 * Lists every player-side unit that ended damaged, destroyed, or
 * ejected with a per-unit damage summary: final status badge,
 * destroyed locations, destroyed components, ammo bins consumed, and
 * final heat reading.
 *
 * Operates entirely on the campaign-facing `IUnitCombatDelta` slice of
 * the outcome — no need to walk the raw event log.
 *
 * @spec openspec/changes/add-post-battle-review-ui § 3 (Casualty Panel)
 * @module components/gameplay/post-battle/CasualtyPanel
 */

import React from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardSection } from "@/components/ui/Card";
import {
  type ICombatOutcome,
  type IUnitCombatDelta,
  UnitFinalStatus,
} from "@/types/combat/CombatOutcome";
import { GameSide } from "@/types/gameplay/GameSessionInterfaces";

export interface CasualtyPanelProps {
  /** Hand-off shape from the engine. */
  readonly outcome: ICombatOutcome;
  /** Side this UI player controls. Defaults to Player. */
  readonly playerSide?: GameSide;
}

/**
 * Map a unit's final status onto a badge variant. Intact stays muted
 * because intact units don't appear in the casualty list — but we keep
 * the mapping exhaustive so a future refactor that surfaces *all*
 * units doesn't get a surprise default.
 */
function statusBadgeVariant(
  status: UnitFinalStatus,
): "emerald" | "amber" | "orange" | "red" | "slate" {
  switch (status) {
    case UnitFinalStatus.Intact:
      return "emerald";
    case UnitFinalStatus.Damaged:
      return "amber";
    case UnitFinalStatus.Crippled:
      return "orange";
    case UnitFinalStatus.Destroyed:
      return "red";
    case UnitFinalStatus.Ejected:
      return "slate";
    default:
      return "slate";
  }
}

function statusLabel(status: UnitFinalStatus): string {
  return status.toUpperCase();
}

/**
 * Find the human-readable designation for a unit by walking the
 * composed Phase 1 report. The delta only carries the unit id; the
 * report carries the designation that was on the record sheet.
 */
function designationFor(outcome: ICombatOutcome, unitId: string): string {
  const report = outcome.report.units.find((u) => u.unitId === unitId);
  return report?.designation ?? unitId;
}

/**
 * One row in the casualty list. Extracted so the empty / non-empty
 * paths in `CasualtyPanel` stay legible.
 */
function CasualtyRow({
  outcome,
  delta,
}: {
  readonly outcome: ICombatOutcome;
  readonly delta: IUnitCombatDelta;
}): React.ReactElement {
  return (
    <li
      className="border-border-theme-subtle border-b py-3 last:border-b-0"
      data-testid={`casualty-row-${delta.unitId}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-text-theme-primary font-medium">
          {designationFor(outcome, delta.unitId)}
        </div>
        <Badge
          variant={statusBadgeVariant(delta.finalStatus)}
          size="sm"
          data-testid={`casualty-status-${delta.unitId}`}
        >
          {statusLabel(delta.finalStatus)}
        </Badge>
      </div>
      <div className="text-text-theme-secondary mt-1 text-xs">
        Heat at end: {delta.heatEnd}
        {delta.destroyedLocations.length > 0 ? (
          <>
            {" "}
            &middot; Destroyed locations:{" "}
            <span className="text-red-400">
              {delta.destroyedLocations.join(", ")}
            </span>
          </>
        ) : null}
      </div>
      {delta.destroyedComponents.length > 0 ? (
        <div
          className="text-text-theme-secondary mt-1 text-xs"
          data-testid={`casualty-components-${delta.unitId}`}
        >
          Components destroyed:{" "}
          <span className="text-amber-400">
            {delta.destroyedComponents.join(", ")}
          </span>
        </div>
      ) : null}
      {Object.keys(delta.ammoRemaining).length > 0 ? (
        <div
          className="text-text-theme-secondary mt-1 text-xs"
          data-testid={`casualty-ammo-${delta.unitId}`}
        >
          Ammo bins remaining:{" "}
          <span className="text-cyan-400">
            {Object.entries(delta.ammoRemaining)
              .map(([binId, rounds]) => `${binId}: ${rounds}`)
              .join(", ")}
          </span>
        </div>
      ) : null}
    </li>
  );
}

export function CasualtyPanel({
  outcome,
  playerSide = GameSide.Player,
}: CasualtyPanelProps): React.ReactElement {
  // Filter to player-side units that took meaningful damage. Intact
  // units don't belong on a casualty list.
  const casualties = outcome.unitDeltas.filter(
    (d) => d.side === playerSide && d.finalStatus !== UnitFinalStatus.Intact,
  );

  return (
    <Card data-testid="casualty-panel">
      <CardSection title="Casualties" titleColor="rose">
        {casualties.length === 0 ? (
          <p
            className="text-text-theme-secondary text-sm"
            data-testid="casualty-empty"
          >
            No casualties — all units returned intact.
          </p>
        ) : (
          <ul className="divide-border-theme-subtle">
            {casualties.map((delta) => (
              <CasualtyRow key={delta.unitId} outcome={outcome} delta={delta} />
            ))}
          </ul>
        )}
      </CardSection>
    </Card>
  );
}

export default CasualtyPanel;
