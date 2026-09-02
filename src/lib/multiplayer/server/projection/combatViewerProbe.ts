/**
 * The combat `IViewerProjectionProbe`
 * (add-authoritative-history-branches; umbrella 13.5).
 *
 * The impact derivation asks one question per viewer - "did what this
 * viewer sees change between these two heads?" - and can only answer it
 * through an injected probe, because the campaign projector consumes
 * campaign events and the combat one consumes game events. This is the
 * combat probe.
 *
 * It is a COMPOSITION, not a new rule. `audienceDigest` already fogs
 * through `filterEventForPlayer` and field-projects through
 * `projectEventForViewerClass` - the same two steps the live broadcaster
 * runs - and it is used here untouched. A second implementation would
 * agree with the wire right up until somebody edited one of them, and
 * the failure mode is a GM approving a blast radius computed by a
 * projection nobody ships.
 *
 * FOG IS OFF, and the consequence is stated rather than hidden.
 * `filterEventForPlayer` short-circuits when fog is disabled, returning
 * the event before `state` is read at all, so this probe separates
 * viewer CLASSES (gm vs player) but NOT the two players from each other.
 * That is D1's finding on record, carried in its own words. `state` is
 * still a required dep and is threaded through: the day fog state is
 * available this becomes a config flip rather than a signature change,
 * and a `{} as IGameState` cast today is exactly how an unused parameter
 * becomes a lie tomorrow.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IViewerProjectionProbe } from '@/lib/events/journal/EventHistoryImpactDerivation';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  audiencesFor,
  audienceDigest,
  type IShadowAudienceInput,
} from '@/lib/multiplayer/server/journalAuthorityShadow';

export interface ICombatViewerProbeDeps {
  /**
   * Required and threaded even though fog-off never dereferences it.
   * See the header: the alternative is a cast that stops being true the
   * moment fog is enabled.
   */
  readonly state: IGameState;
  /** Durable audience identities: GM, players, config, side assignments. */
  readonly audience: IShadowAudienceInput;
}

/**
 * The combat probe.
 *
 * Viewer ids are the audience names `audiencesFor` mints - `'gm'` and
 * `'player:<playerId>'` - so the probe and the shadow comparison name
 * the same audiences rather than two parallel vocabularies.
 */
export function combatViewerProbe(
  deps: ICombatViewerProbeDeps,
): IViewerProjectionProbe {
  const byId = new Map(
    audiencesFor(deps.audience).map((audience) => [
      audience.audience,
      audience,
    ]),
  );
  return {
    digest: (viewerId: string, events: readonly IProjectableBranchEvent[]) => {
      const audience = byId.get(viewerId);
      if (audience === undefined) {
        // Neither default is safe: `player` hands the most permissive
        // projection to whoever we failed to recognise, and `gm` leaks
        // authority-only fields outright. So it refuses.
        throw new Error(
          `unknown viewer '${viewerId}': not the GM and not a seated player of this match`,
        );
      }
      return audienceDigest(
        events.map((event) => event.payload as IGameEvent),
        deps.state,
        audience,
        deps.audience,
      );
    },
  };
}
