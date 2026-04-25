/**
 * PilotXpPanel
 *
 * Per-pilot summary card. Shows pilot id (until Wave 5 wires real
 * pilot lookup), wound state, KIA/MIA flags, and a heuristic XP gain
 * derived from the outcome (scenario base + kill count delta).
 *
 * The processor is the source of truth for actual XP / wound mutation;
 * this panel previews what *will* happen when the player taps "Apply
 * outcome". For MVP we surface the engine's reported wound count and
 * final status verbatim and approximate XP using the same scenario +
 * kill heuristic the processor uses.
 *
 * @spec openspec/changes/add-post-battle-review-ui § 4 (Pilot Outcome Panel)
 * @module components/gameplay/post-battle/PilotXpPanel
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardSection } from '@/components/ui/Card';
import {
  type ICombatOutcome,
  type IUnitCombatDelta,
  PilotFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

export interface PilotXpPanelProps {
  /** Hand-off shape from the engine. */
  readonly outcome: ICombatOutcome;
  /** Side this UI player controls. Defaults to Player. */
  readonly playerSide?: GameSide;
  /** Pilot name lookup keyed by unit id. */
  readonly pilotNames?: Readonly<Record<string, string>>;
  /** Scenario XP base (defaults to 1 — matches awardScenarioXP). */
  readonly scenarioXpBase?: number;
  /** Kill XP per kill (defaults to 1). */
  readonly killXpPerKill?: number;
}

function pilotStatusBadge(status: PilotFinalStatus): {
  variant: 'emerald' | 'amber' | 'orange' | 'red' | 'slate';
  label: string;
} {
  switch (status) {
    case PilotFinalStatus.Active:
      return { variant: 'emerald', label: 'ACTIVE' };
    case PilotFinalStatus.Wounded:
      return { variant: 'amber', label: 'WOUNDED' };
    case PilotFinalStatus.Unconscious:
      return { variant: 'orange', label: 'UNCONSCIOUS' };
    case PilotFinalStatus.KIA:
      return { variant: 'red', label: 'KIA' };
    case PilotFinalStatus.MIA:
      return { variant: 'slate', label: 'MIA' };
    case PilotFinalStatus.Captured:
      return { variant: 'slate', label: 'CAPTURED' };
    default:
      return { variant: 'slate', label: String(status).toUpperCase() };
  }
}

/**
 * Estimate XP for a pilot. Mirrors the processor's heuristic:
 *   - Scenario participation always awards `scenarioXpBase`.
 *   - Player-side survivors who fought and won earn `killXpPerKill`
 *     per kill recorded in the report.
 */
function estimateXpGain(
  outcome: ICombatOutcome,
  delta: IUnitCombatDelta,
  scenarioXpBase: number,
  killXpPerKill: number,
): number {
  let total = scenarioXpBase;
  const playerWon = outcome.report.winner === delta.side;
  if (playerWon) {
    const reportEntry = outcome.report.units.find(
      (u) => u.unitId === delta.unitId,
    );
    const kills = reportEntry?.kills ?? 0;
    total += kills * killXpPerKill;
  }
  return total;
}

function PilotRow({
  outcome,
  delta,
  pilotNames,
  scenarioXpBase,
  killXpPerKill,
}: {
  readonly outcome: ICombatOutcome;
  readonly delta: IUnitCombatDelta;
  readonly pilotNames: Readonly<Record<string, string>>;
  readonly scenarioXpBase: number;
  readonly killXpPerKill: number;
}): React.ReactElement {
  const { variant, label } = pilotStatusBadge(delta.pilotState.finalStatus);
  const displayName = pilotNames[delta.unitId] ?? delta.unitId;
  const xp = estimateXpGain(outcome, delta, scenarioXpBase, killXpPerKill);
  // KIA pilots do not receive posthumous XP per campaign rules — the
  // panel hides the XP estimate row for them and shows only the wound
  // tracker + status badge.
  const isKia = delta.pilotState.finalStatus === PilotFinalStatus.KIA;
  // Clamp wounds to the 0..6 tracker capacity so junk data never
  // produces 7+ filled dots.
  const wounds = Math.min(6, Math.max(0, delta.pilotState.wounds));

  return (
    <li
      className="border-border-theme-subtle flex items-center justify-between border-b py-3 last:border-b-0"
      data-testid={`pilot-row-${delta.unitId}`}
    >
      <div>
        <div className="text-text-theme-primary font-medium">{displayName}</div>
        <div
          className="mt-1 flex items-center gap-1"
          aria-label={`Wounds taken: ${wounds} of 6`}
          data-testid={`pilot-wound-tracker-${delta.unitId}`}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              data-testid={`pilot-wound-dot-${delta.unitId}-${i}`}
              data-filled={i < wounds ? 'true' : 'false'}
              className={
                i < wounds
                  ? 'inline-block h-2 w-2 rounded-full bg-red-500'
                  : 'inline-block h-2 w-2 rounded-full bg-slate-600/60'
              }
            />
          ))}
          <span className="text-text-theme-secondary ml-2 text-xs">
            {wounds}/6
          </span>
        </div>
        {isKia ? (
          <div
            className="mt-1 text-xs text-red-400"
            data-testid={`pilot-kia-notice-${delta.unitId}`}
          >
            KIA — no posthumous XP awarded.
          </div>
        ) : (
          <div className="text-text-theme-secondary mt-1 text-xs">
            XP gain: <span className="text-emerald-400">+{xp}</span>
          </div>
        )}
      </div>
      <Badge
        variant={variant}
        size="sm"
        data-testid={`pilot-status-${delta.unitId}`}
      >
        {label}
      </Badge>
    </li>
  );
}

export function PilotXpPanel({
  outcome,
  playerSide = GameSide.Player,
  pilotNames = {},
  scenarioXpBase = 1,
  killXpPerKill = 1,
}: PilotXpPanelProps): React.ReactElement {
  const playerDeltas = outcome.unitDeltas.filter((d) => d.side === playerSide);

  return (
    <Card data-testid="pilot-xp-panel">
      <CardSection title="Pilot XP & Wounds" titleColor="cyan">
        {playerDeltas.length === 0 ? (
          <p
            className="text-text-theme-secondary text-sm"
            data-testid="pilot-empty"
          >
            No pilots to update.
          </p>
        ) : (
          <ul className="divide-border-theme-subtle">
            {playerDeltas.map((delta) => (
              <PilotRow
                key={delta.unitId}
                outcome={outcome}
                delta={delta}
                pilotNames={pilotNames}
                scenarioXpBase={scenarioXpBase}
                killXpPerKill={killXpPerKill}
              />
            ))}
          </ul>
        )}
      </CardSection>
    </Card>
  );
}

export default PilotXpPanel;
