/**
 * What a GM is told about a rewind preview, and whether they may act on it
 * (umbrella 19.3).
 *
 * The preview module answers in typed rows - a refusal reason, a list of
 * affected artifacts, a list of viewer ids. None of that is a sentence, and
 * none of it should be shown raw. Every player-facing string is authored
 * here so the surface has no wording of its own to drift.
 *
 * THE `detail` FIELD IS NEVER SHOWN. `GmCombatRewindPreviewResult` carries
 * free text alongside the reason, written for an operator reading a log:
 * it names branch ids, outcome ids and revisions the GM has no way to act
 * on. Handing it to a screen reader as the accessible description would be
 * the worst of both - unactionable AND the only thing announced. The
 * `reason` is the closed set, so the reason is what gets phrased.
 *
 * THE SWEEP IS DERIVED, NOT LISTED. `GM_REWIND_REFUSAL_PHRASING` is a total
 * `Record` over the union, so a twelfth refusal member stops this file
 * compiling until someone writes its sentence, and the reason list every
 * test iterates comes off that record rather than being retyped beside it.
 *
 * THE ARMS ARE PREDICATES, NOT `disabled` ATTRIBUTES. A control that is
 * only disabled in the DOM cannot be proven to refuse anything - clicking
 * a disabled button is a no-op in the browser and in jsdom either way. The
 * enable decision lives here as a value, the dispatch consults it before
 * calling anything, and the rows call both directly.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import type { EventHistoryArtifactKind } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type {
  GmCombatRewindPreviewRefusal,
  GmCombatRewindPreviewResult,
} from '@/lib/multiplayer/server/history/GmCombatRewindPreview';

/**
 * A preview the surface could not get an answer to at all: the request
 * threw, or the route replied with a transport error carrying no `kind`.
 * Deliberately carries NO message - what threw is a network fact about a
 * server, and putting it in the type is how it reaches a GM by accident.
 */
export interface IGmRewindPreviewUnavailable {
  readonly kind: 'unavailable';
}

export type GmRewindPreviewOutcome =
  | GmCombatRewindPreviewResult
  | IGmRewindPreviewUnavailable;

type PreviewOk = Extract<GmCombatRewindPreviewResult, { kind: 'preview' }>;
type PreviewRefused = Extract<GmCombatRewindPreviewResult, { kind: 'refused' }>;

/**
 * One GM-facing sentence per refusal. Total over the union by type, so the
 * compiler is the thing that stops an unphrased member shipping.
 */
export const GM_REWIND_REFUSAL_PHRASING: Readonly<
  Record<GmCombatRewindPreviewRefusal, string>
> = Object.freeze({
  'gm-role-required':
    'Only the game master for this match can preview a rewind.',
  'actor-mismatch':
    'This request was signed by a different account than the one holding game master authority here.',
  'state-not-owned': 'This match is not under your game master authority.',
  'replacement-events-unsupported':
    'A rewind can only take history back. It cannot put different events in place of the ones it removes.',
  PROJECTION_REBUILDING:
    'Another correction is rebuilding this match history. Ask again once it settles.',
  'campaign-receipt-delivered':
    'A campaign has already taken delivery of this combat outcome, so a combat-only rewind cannot unmake what was spent on it.',
  STALE_BRANCH:
    'Your view names a different branch than the one this match is on. Catch up before rewinding.',
  STALE_REVISION:
    'This match has moved on since your view was built. Catch up before rewinding.',
  STALE_GENERATION:
    'This match history has been corrected since your view was built. Catch up before rewinding.',
  'rewind-target-above-head':
    'The revision you named is not behind the current head, so there is nothing to take back.',
  'rewind-target-below-branch-base':
    'The revision you named comes before this branch begins, so a rewind cannot reach it.',
});

/**
 * Every refusal the GM can be shown, derived from the phrasing record. The
 * record's totality is the type-level pin; this is its runtime shadow, so
 * a sweep cannot fall behind the union by being written out by hand.
 */
export const GM_REWIND_REFUSAL_REASONS: readonly GmCombatRewindPreviewRefusal[] =
  Object.freeze(
    Object.keys(GM_REWIND_REFUSAL_PHRASING) as GmCombatRewindPreviewRefusal[],
  );

/** Shown when the server could not be asked, or did not answer in kind. */
export const PREVIEW_UNAVAILABLE_PHRASING =
  'The match server could not answer the preview request. Nothing was changed; you can ask again.';

/** The refusal sentence for this reason. The server `detail` is dropped. */
export function describeRewindRefusal(refusal: PreviewRefused): string {
  return GM_REWIND_REFUSAL_PHRASING[refusal.reason];
}

/** What a GM reads when nothing came back at all. */
export function describePreviewUnavailable(): string {
  return PREVIEW_UNAVAILABLE_PHRASING;
}

export interface IRewindBlastRadius {
  /** One sentence covering both halves of the radius. */
  readonly summary: string;
  /** One line per affected artifact kind; empty when nothing is affected. */
  readonly artifactLines: readonly string[];
}

function pluralize(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}

/**
 * The blast radius, from BOTH halves of the preview. The affected
 * artifacts and the changed viewer projections are different costs - one
 * is saved work that goes stale, the other is what a player would see
 * change under them - and a summary that mentioned only one would let the
 * GM approve the other unseen.
 */
export function describeRewindBlastRadius(
  preview: PreviewOk,
): IRewindBlastRadius {
  const artifactCount = preview.entries.length;
  const viewerCount = preview.changedViewerIds.length;

  const artifactClause =
    artifactCount === 0
      ? 'would invalidate nothing that has been derived from this match'
      : `would invalidate ${pluralize(artifactCount, 'saved artifact')}`;
  const viewerClause =
    viewerCount === 0
      ? 'change no player view'
      : viewerCount === 1
        ? 'change what 1 player sees'
        : `change what ${viewerCount} players see`;

  return Object.freeze({
    summary:
      `Rewinding to revision ${preview.targetRevision}, from the head at ` +
      `${preview.priorHead.revision}, ${artifactClause} and would ${viewerClause}.`,
    artifactLines: Object.freeze(describeArtifactLines(preview.entries)),
  });
}

/**
 * One line per kind rather than per artifact: a GM approving a rewind
 * needs the shape of the loss, and an id list of forty checkpoints is a
 * wall rather than a fact. The earliest source revision is kept because it
 * says how far back the staleness reaches.
 */
function describeArtifactLines(
  entries: PreviewOk['entries'],
): readonly string[] {
  const byKind = new Map<EventHistoryArtifactKind, number[]>();
  for (const entry of entries) {
    const revisions = byKind.get(entry.artifactKind) ?? [];
    revisions.push(entry.sourceRevision);
    byKind.set(entry.artifactKind, revisions);
  }
  return Array.from(byKind.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([kind, revisions]) =>
        `${pluralize(revisions.length, kind)}, from revision ${Math.min(...revisions)}`,
    );
}

export interface IGmRewindArm {
  readonly enabled: boolean;
  /** Why not, when not. Rendered - a reason nothing renders reaches nobody. */
  readonly disabledReason: string | null;
}

const ARMED: IGmRewindArm = Object.freeze({
  enabled: true,
  disabledReason: null,
});

export const PREVIEW_UNBUILT_REASON =
  'This build cannot ask the server for a rewind preview yet.';
export const CONFIRM_UNBUILT_REASON =
  'This build can show the effect of a rewind but cannot apply one yet.';
export const CONFIRM_NEEDS_PREVIEW_REASON =
  'There is nothing to apply until a preview comes back.';

/**
 * Whether the GM may ask for a preview. False today on every page, because
 * the route that answers (`POST /api/matches/[id]/rewind-preview`) is task
 * 3b-iii and no caller passes a producer yet - stated as a disabled control
 * with a reason rather than a control that looks live and does nothing.
 */
export function rewindPreviewArm(hasProducer: boolean): IGmRewindArm {
  return hasProducer
    ? ARMED
    : Object.freeze({ enabled: false, disabledReason: PREVIEW_UNBUILT_REASON });
}

/**
 * Whether the GM may apply the rewind they are looking at. Two independent
 * refusals: there is no producer to apply it (3b-iv), and there is nothing
 * to apply because the answer was not a preview. Both are real states, and
 * a refusal is never "confirm anyway" - the GM's next move after one is to
 * ask again, not to commit.
 */
export function rewindConfirmArm(
  outcome: GmRewindPreviewOutcome | null,
  hasProducer: boolean,
): IGmRewindArm {
  if (outcome === null || outcome.kind !== 'preview') {
    return Object.freeze({
      enabled: false,
      disabledReason: CONFIRM_NEEDS_PREVIEW_REASON,
    });
  }
  return hasProducer
    ? ARMED
    : Object.freeze({ enabled: false, disabledReason: CONFIRM_UNBUILT_REASON });
}

/**
 * The dispatch guard. The arm decides, then this refuses the call itself -
 * a gate that only greys a button out is the silent path a keyboard or a
 * programmatic click walks straight through.
 */
export function dispatchWhenArmed(
  arm: IGmRewindArm,
  action: (() => void) | undefined,
): boolean {
  if (!arm.enabled || action === undefined) return false;
  action();
  return true;
}
