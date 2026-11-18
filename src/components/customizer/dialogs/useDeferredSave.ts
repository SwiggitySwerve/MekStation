/**
 * Accept a save click while the dialog's checks are still pending, then submit
 * once they settle. A click is never dropped: it either submits, waits with a
 * visible status, or ends with a visible reason.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/** A pending check that never settles must not hold a save forever. */
export const DEFERRED_SAVE_TIMEOUT_MS = 15_000;
export const DEFERRED_SAVE_WAITING_MESSAGE =
  'Checking the design… the save will continue when the check finishes.';
export const DEFERRED_SAVE_TIMEOUT_MESSAGE =
  'The design check did not finish, so the unit was not saved. Try saving again.';

export interface DeferredSave {
  readonly isQueued: boolean;
  readonly refusal: string | null;
  /** Submit now, or queue until pending checks settle. */
  readonly request: () => void;
  /** Drop a queued save (the user backed out). */
  readonly cancel: () => void;
  /** Show why a save cannot happen. */
  readonly refuse: (reason: string) => void;
}

export function useDeferredSave({
  isOpen,
  targetId,
  isPending,
  resetKey,
  submit,
}: {
  readonly isOpen: boolean;
  /** The unit being saved; a different target drops any queued save. */
  readonly targetId: string | undefined;
  readonly isPending: boolean;
  /** What a refusal was about (names, checks, losses); a change clears it. */
  readonly resetKey: string;
  /** Re-read at settle time so it uses the values the dialog then shows. */
  readonly submit: () => void;
}): DeferredSave {
  // The queued save remembers its target, so it can only submit for that unit.
  const [queued, setQueued] = useState<{ readonly target?: string } | null>(
    null,
  );
  const isQueued = queued !== null && isOpen && queued.target === targetId;
  const [refusal, setRefusal] = useState<string | null>(null);
  // Updated before any event can run against this commit, so a settle never
  // uses an earlier render's values.
  const latestSubmit = useRef(submit);
  useLayoutEffect(() => {
    latestSubmit.current = submit;
  });

  // Closing, reopening or retargeting the dialog never leaves a ghost save.
  // Reset while rendering, so a click in the commit that opens the dialog is
  // queued after the reset rather than cleared by a later effect.
  const [scope, setScope] = useState({ isOpen, targetId });
  if (scope.isOpen !== isOpen || scope.targetId !== targetId) {
    setScope({ isOpen, targetId });
    setQueued(null);
    setRefusal(null);
  }
  // A refusal describes the state it was given for; once the user fixes that
  // state it would be stale, so it clears in the same render.
  const [refusalKey, setRefusalKey] = useState(resetKey);
  if (refusalKey !== resetKey) {
    setRefusalKey(resetKey);
    setRefusal(null);
  }

  useEffect(() => {
    if (!queued || isPending) return;
    setQueued(null);
    if (isOpen && queued.target === targetId) latestSubmit.current();
  }, [queued, isPending, isOpen, targetId]);

  useEffect(() => {
    if (!isQueued) return;
    const timeout = setTimeout(() => {
      setQueued(null);
      setRefusal(DEFERRED_SAVE_TIMEOUT_MESSAGE);
    }, DEFERRED_SAVE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isQueued]);

  // The click's own render supplies submit: a click between a commit and its
  // effects must still use that commit's values.
  const request = useCallback(() => {
    setRefusal(null);
    if (isPending) setQueued({ target: targetId });
    else submit();
  }, [isPending, targetId, submit]);
  const cancel = useCallback(() => setQueued(null), []);
  const refuse = useCallback((reason: string) => setRefusal(reason), []);

  return { isQueued, refusal, request, cancel, refuse };
}
