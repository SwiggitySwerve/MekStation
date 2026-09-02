/**
 * The GM-facing wording for a rewind preview (umbrella 19.3).
 *
 * Two things are pinned here that no component row can pin honestly. The
 * refusal sweep is DERIVED from the closed union rather than listed by
 * hand, so a twelfth refusal member cannot ship without a sentence of its
 * own; and the confirm arm is a predicate the rows call directly, because
 * a row whose only actuation is a disabled DOM control cannot fail.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { GmCombatRewindPreviewResult } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';

import {
  CONFIRM_NEEDS_PREVIEW_REASON,
  CONFIRM_UNBUILT_REASON,
  describeRewindBlastRadius,
  describeRewindRefusal,
  dispatchWhenArmed,
  GM_REWIND_REFUSAL_REASONS,
  PREVIEW_UNBUILT_REASON,
  rewindConfirmArm,
  rewindPreviewArm,
} from '../gmRewindPreviewPhrasing';

type PreviewOk = Extract<GmCombatRewindPreviewResult, { kind: 'preview' }>;

function artifact(
  overrides: Partial<IAffectedArtifact> = {},
): IAffectedArtifact {
  return {
    artifactKind: 'checkpoint',
    artifactId: 'artifact-a',
    sourceRevision: 6,
    ...overrides,
  };
}

function preview(overrides: Partial<PreviewOk> = {}): PreviewOk {
  return {
    kind: 'preview',
    matchId: 'match-1',
    targetRevision: 3,
    priorHead: { branchId: 'root', revision: 7, effectiveGeneration: 1 },
    changedViewerIds: ['pid_host', 'pid_guest'],
    entries: [artifact()],
    ...overrides,
  };
}

describe('rewind refusal phrasing', () => {
  it('sweeps every member of the closed refusal union', () => {
    // Deliberately a tripwire. The union is closed at eleven today; when a
    // twelfth lands, the phrasing record stops compiling AND this count
    // goes red, so the member cannot reach a GM unphrased. Bump it in the
    // same edit that writes its sentence.
    expect(GM_REWIND_REFUSAL_REASONS).toHaveLength(13);
    for (const reason of GM_REWIND_REFUSAL_REASONS) {
      const phrasing = describeRewindRefusal({
        kind: 'refused',
        reason,
        detail: 'raw server detail that a GM must never be handed',
      });
      expect(phrasing.length).toBeGreaterThan(20);
    }
  });

  it('gives every refusal its own sentence', () => {
    const sentences = GM_REWIND_REFUSAL_REASONS.map((reason) =>
      describeRewindRefusal({ kind: 'refused', reason, detail: 'x' }),
    );
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it('never hands the server detail to the GM', () => {
    const detail =
      "Revision 3 precedes branch 'root' base revision 5 (raw operator text)";
    for (const reason of GM_REWIND_REFUSAL_REASONS) {
      expect(
        describeRewindRefusal({ kind: 'refused', reason, detail }),
      ).not.toContain(detail);
    }
  });
});

describe('rewind blast radius', () => {
  it('counts the artifacts a rewind would invalidate', () => {
    const radius = describeRewindBlastRadius(
      preview({
        entries: [
          artifact({ artifactId: 'a', sourceRevision: 6 }),
          artifact({
            artifactId: 'b',
            artifactKind: 'replay',
            sourceRevision: 4,
          }),
        ],
      }),
    );
    expect(radius.summary).toContain('2 saved artifacts');
    expect(radius.artifactLines).toEqual([
      '1 checkpoint, from revision 6',
      '1 replay, from revision 4',
    ]);
  });

  it('names the target and the head the truncation would replace', () => {
    const radius = describeRewindBlastRadius(preview());
    expect(radius.summary).toContain('revision 3');
    expect(radius.summary).toContain('head at 7');
  });

  it('says so when nothing derived would be invalidated', () => {
    const radius = describeRewindBlastRadius(
      preview({ entries: [], changedViewerIds: [] }),
    );
    expect(radius.summary).toContain('nothing that has been derived');
    expect(radius.summary).toContain('no player');
    expect(radius.artifactLines).toEqual([]);
  });

  it('reports the changed viewers even when no artifact is affected', () => {
    const radius = describeRewindBlastRadius(
      preview({ entries: [], changedViewerIds: ['pid_guest'] }),
    );
    expect(radius.summary).toContain('nothing that has been derived');
    expect(radius.summary).toContain('1 player sees');
  });

  it('reports the artifacts even when no viewer projection changes', () => {
    const radius = describeRewindBlastRadius(preview({ changedViewerIds: [] }));
    expect(radius.summary).toContain('1 saved artifact');
    expect(radius.summary).toContain('no player');
  });
});

describe('rewind confirm arm', () => {
  it('is disabled while no producer can apply a rewind', () => {
    const arm = rewindConfirmArm(preview(), false);
    expect(arm.enabled).toBe(false);
    expect(arm.disabledReason).toBe(CONFIRM_UNBUILT_REASON);
  });

  it('is enabled once a producer exists and a preview came back', () => {
    const arm = rewindConfirmArm(preview(), true);
    expect(arm.enabled).toBe(true);
    expect(arm.disabledReason).toBeNull();
  });

  it('is disabled while the preview is still in flight', () => {
    const arm = rewindConfirmArm(null, true);
    expect(arm.enabled).toBe(false);
    expect(arm.disabledReason).toBe(CONFIRM_NEEDS_PREVIEW_REASON);
  });

  it('is disabled on a refusal, producer or not', () => {
    const refused: GmCombatRewindPreviewResult = {
      kind: 'refused',
      reason: 'STALE_REVISION',
      detail: 'stale',
    };
    expect(rewindConfirmArm(refused, true).enabled).toBe(false);
    expect(rewindConfirmArm({ kind: 'unavailable' }, true).enabled).toBe(false);
  });

  it('arms the preview request only when a producer can answer it', () => {
    expect(rewindPreviewArm(true)).toEqual({
      enabled: true,
      disabledReason: null,
    });
    const unarmed = rewindPreviewArm(false);
    expect(unarmed.enabled).toBe(false);
    expect(unarmed.disabledReason).toBe(PREVIEW_UNBUILT_REASON);
  });

  it('refuses the dispatch itself, not only the control', () => {
    const onConfirm = jest.fn();
    const blocked = dispatchWhenArmed(
      rewindConfirmArm(preview(), false),
      onConfirm,
    );
    expect(blocked).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();

    const allowed = dispatchWhenArmed(
      rewindConfirmArm(preview(), true),
      onConfirm,
    );
    expect(allowed).toBe(true);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
