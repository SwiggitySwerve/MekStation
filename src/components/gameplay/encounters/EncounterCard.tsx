/**
 * EncounterCard
 *
 * One row on the encounter list page. Renders the encounter name, status,
 * description, template, and a per-side pill for the player and opponent
 * slot. Two pill flavours per side:
 *
 *  - "set + valid"     — gray pill with the force name (or `OpFor: Generated`
 *                        for an opponent slot fed by `opForConfig`).
 *  - "missing"         — yellow pill with `Player force missing` /
 *                        `Opponent force missing` when the row stored a
 *                        forceId but the hydrated reference came back null
 *                        (the force was deleted out from under the row).
 *  - "empty"           — yellow pill with `No Player Force` / `No Opponent`
 *                        when the row never had a force in that slot.
 *
 * Broken-state detection runs through `encounterBrokenRefs(encounter,
 * rawForceIds)` so this component shares the same predicate as the detail
 * page repair banner. The page passes `rawForceIds` in from the store
 * slot populated by `loadEncounters()`.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter List Surfaces Broken-Reference State)
 */

import { Badge, Card } from '@/components/ui';
import {
  encounterBrokenRefs,
  type IRawForceIds,
} from '@/services/encounter/encounterBrokenRefs';
import { IEncounter, SCENARIO_TEMPLATES } from '@/types/encounter';
import { getStatusColor, getStatusLabel } from '@/utils/encounterStatus';

export interface EncounterCardProps {
  readonly encounter: IEncounter;
  /**
   * Raw stored force-id strings for this encounter. When `null` the card
   * defaults to "no missing refs" — useful for callers (Storybook, older
   * server builds) that don't have the rawForceIds payload.
   */
  readonly rawForceIds?: IRawForceIds | null;
  readonly onClick: () => void;
}

const EMPTY_RAW_IDS: IRawForceIds = {
  playerForceId: null,
  opponentForceId: null,
};

export function EncounterCard({
  encounter,
  rawForceIds,
  onClick,
}: EncounterCardProps): React.ReactElement {
  const template = encounter.template
    ? SCENARIO_TEMPLATES.find((t) => t.type === encounter.template)
    : null;

  // Detect broken refs via the shared helper so the card and the detail
  // page banner agree on the predicate. When rawForceIds is unavailable
  // (legacy server, Storybook valid story) treat both sides as "not
  // missing" — the helper still returns `false/false` for empty inputs.
  const broken = encounterBrokenRefs(encounter, rawForceIds ?? EMPTY_RAW_IDS);

  return (
    <Card
      className="hover:border-accent/50 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`encounter-card-${encounter.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <h3
          className="text-text-theme-primary truncate font-medium"
          data-testid="encounter-name"
        >
          {encounter.name}
        </h3>
        <Badge
          variant={getStatusColor(encounter.status)}
          data-testid="encounter-status"
        >
          {getStatusLabel(encounter.status)}
        </Badge>
      </div>

      {encounter.description && (
        <p className="text-text-theme-secondary mb-3 line-clamp-2 text-sm">
          {encounter.description}
        </p>
      )}

      {template && (
        <div className="text-text-theme-muted mb-3 text-xs">
          Template: {template.name}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {/* Player slot — broken (yellow + "missing") wins over the empty
            yellow pill, which itself wins over the gray "Set" pill. */}
        {broken.playerForceMissing ? (
          <span
            className="rounded bg-yellow-900/20 px-2 py-1 text-yellow-400"
            data-testid="encounter-card-player-missing"
          >
            Player force missing
          </span>
        ) : encounter.playerForce ? (
          <span className="bg-surface-raised text-text-theme-secondary rounded px-2 py-1">
            Player: {encounter.playerForce.forceName || 'Set'}
          </span>
        ) : (
          <span className="rounded bg-yellow-900/20 px-2 py-1 text-yellow-400">
            No Player Force
          </span>
        )}

        {/* Opponent slot — same precedence: broken > set > opForConfig
            generation > empty. */}
        {broken.opponentForceMissing ? (
          <span
            className="rounded bg-yellow-900/20 px-2 py-1 text-yellow-400"
            data-testid="encounter-card-opponent-missing"
          >
            Opponent force missing
          </span>
        ) : encounter.opponentForce ? (
          <span className="bg-surface-raised text-text-theme-secondary rounded px-2 py-1">
            Opponent: {encounter.opponentForce.forceName || 'Set'}
          </span>
        ) : encounter.opForConfig ? (
          <span className="bg-surface-raised text-text-theme-secondary rounded px-2 py-1">
            OpFor: Generated
          </span>
        ) : (
          <span className="rounded bg-yellow-900/20 px-2 py-1 text-yellow-400">
            No Opponent
          </span>
        )}
      </div>

      <div className="border-border-theme-subtle text-text-theme-muted mt-3 border-t pt-3 text-xs">
        Updated: {new Date(encounter.updatedAt).toLocaleDateString()}
      </div>
    </Card>
  );
}

export default EncounterCard;
