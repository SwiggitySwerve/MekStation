/**
 * Abort plumbing for an equipment load.
 *
 * The registry init fans out ~30 fetches for `/data/equipment/official/**` on
 * every route. A hard document navigation cancels whatever is still in flight,
 * and the browser reports that cancellation in a shape indistinguishable from a
 * real network failure. Owning the cancellation ourselves - `pagehide` is the
 * browser's own "this document is going away" notice - is what lets the reader
 * tell the two apart.
 *
 * @module services/equipment/equipmentLoadAbort
 */

/**
 * Sentinel returned by a read that was cancelled rather than attempted-and-failed.
 *
 * It lives here rather than beside the reader because the loader must be able
 * to recognise it even when a test replaces the reader module wholesale.
 */
export const EQUIPMENT_READ_ABORTED = Symbol('equipment-read-aborted');

/**
 * A parsed file, `null` for a genuine read failure, or the aborted sentinel.
 */
export type EquipmentReadOutcome<T> = T | null | typeof EQUIPMENT_READ_ABORTED;

/**
 * Narrows a read outcome to the cancelled case.
 */
export function isEquipmentReadAborted(
  outcome: unknown,
): outcome is typeof EQUIPMENT_READ_ABORTED {
  return outcome === EQUIPMENT_READ_ABORTED;
}

export interface IEquipmentLoadAbort {
  /** Threaded down the loader chain; `undefined` outside the browser. */
  readonly signal: AbortSignal | undefined;
  /** Detaches the `pagehide` listener once the load has settled. */
  readonly dispose: () => void;
}

const NO_ABORT: IEquipmentLoadAbort = {
  signal: undefined,
  dispose: (): void => undefined,
};

/**
 * Creates an abort handle that fires when the current document unloads.
 *
 * Server-side and in any environment without `AbortController` this is inert,
 * so the loader keeps its existing unsignalled behaviour.
 */
export function createEquipmentLoadAbort(): IEquipmentLoadAbort {
  if (typeof window === 'undefined' || typeof AbortController === 'undefined') {
    return NO_ABORT;
  }

  const controller = new AbortController();
  const abort = (): void => controller.abort();
  window.addEventListener('pagehide', abort);

  return {
    signal: controller.signal,
    dispose: (): void => window.removeEventListener('pagehide', abort),
  };
}
