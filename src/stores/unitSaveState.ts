/** Plain save-state rules. See unitSaveState.rules.md for compatibility and rollout. */

/**
 * The library writer that produces receipt fingerprints. Bump it in the same PR
 * as any change that makes the loader or writer recover or keep more facts.
 */
export const LIBRARY_WRITER_VERSION = 2;

export interface ILibrarySaveReceipt {
  readonly id: string;
  readonly version: number;
  readonly fingerprint: string;
  readonly draftFingerprint?: string;
  /** Absent on receipts written before versioning, which count as 0. */
  readonly writerVersion?: number;
}

export interface IUnitSaveFingerprints {
  readonly draft: string;
  readonly library: string;
}

export type UnitLibrarySaveState =
  | { readonly state: 'none' }
  | {
      readonly state: 'matched' | 'saved-older-writer' | 'changed' | 'unknown';
      readonly receipt: ILibrarySaveReceipt;
    };

export type SaveState = {
  readonly modification: 'clean' | 'modified' | 'unknown';
  readonly draft: 'pending' | 'saved' | 'failed';
  readonly library: UnitLibrarySaveState;
};

export interface IUnitSaveMetadata {
  readonly isModified?: boolean;
  readonly librarySave?: ILibrarySaveReceipt;
}

export type UnitSaveEvent =
  | {
      readonly type: 'draftWriteCompleted';
      readonly status: 'saved' | 'failed';
    }
  | {
      readonly type: 'unitChanged';
      readonly isModified: boolean;
      readonly libraryFingerprint: string;
      readonly draftFingerprint: string;
    }
  | {
      readonly type: 'librarySaved';
      readonly receipt: ILibrarySaveReceipt;
      readonly current: IUnitSaveFingerprints;
    }
  | { readonly type: 'librarySaveFailed' };

/** Missing legacy editor baselines cannot establish that a draft is clean. */
export function isUnitDraftModified(
  current: () => string,
  baseline: string | undefined,
): boolean {
  return baseline === undefined || current() !== baseline;
}

function libraryState(
  receipt: ILibrarySaveReceipt | undefined,
  current: string,
  currentDraft: string | undefined,
  isModified: boolean | undefined,
): UnitLibrarySaveState {
  if (!receipt) return { state: 'none' };
  if (receipt.draftFingerprint === undefined)
    return { state: 'unknown', receipt };
  if (current === receipt.fingerprint) return { state: 'matched', receipt };
  // An unedited draft whose receipt an older writer made: the library copy
  // lacks facts today's writer keeps, not the user's edits.
  if (
    (receipt.writerVersion ?? 0) < LIBRARY_WRITER_VERSION &&
    isModified === false
  )
    return { state: 'saved-older-writer', receipt };
  return {
    state:
      currentDraft === receipt.draftFingerprint
        ? 'saved-older-writer'
        : 'changed',
    receipt,
  };
}

/** Read compatibility fields without inventing a successful write or receipt. */
export function getUnitSaveState(
  metadata: IUnitSaveMetadata,
  currentLibraryFingerprint: string,
  currentDraftFingerprint: string | undefined,
  draft: SaveState['draft'] = 'pending',
): SaveState {
  return {
    modification:
      metadata.isModified === undefined
        ? 'unknown'
        : metadata.isModified
          ? 'modified'
          : 'clean',
    draft,
    library: libraryState(
      metadata.librarySave,
      currentLibraryFingerprint,
      currentDraftFingerprint,
      metadata.isModified,
    ),
  };
}

export function createUnitLibrarySaveReceipt(
  reference: Pick<ILibrarySaveReceipt, 'id' | 'version'>,
  fingerprints: IUnitSaveFingerprints,
): ILibrarySaveReceipt & {
  readonly draftFingerprint: string;
  readonly writerVersion: number;
} {
  return {
    ...reference,
    fingerprint: fingerprints.library,
    draftFingerprint: fingerprints.draft,
    writerVersion: LIBRARY_WRITER_VERSION,
  };
}

/** Apply the submitted receipt even if current content changed during the save. */
export function getUnitLibrarySavePatch(
  receipt: ILibrarySaveReceipt,
  currentDraftFingerprint: string,
): { librarySave: ILibrarySaveReceipt; isModified: boolean } {
  return {
    librarySave: receipt,
    isModified: isUnitDraftModified(
      () => currentDraftFingerprint,
      receipt.draftFingerprint,
    ),
  };
}

/** The single event boundary; browser and library outcomes stay independent. */
export function transitionUnitSaveState(
  state: SaveState,
  event: UnitSaveEvent,
): SaveState {
  switch (event.type) {
    case 'draftWriteCompleted':
      return { ...state, draft: event.status };
    case 'unitChanged':
      return getUnitSaveState(
        {
          isModified: event.isModified,
          librarySave:
            state.library.state === 'none' ? undefined : state.library.receipt,
        },
        event.libraryFingerprint,
        event.draftFingerprint,
        state.draft,
      );
    case 'librarySaved':
      return getUnitSaveState(
        getUnitLibrarySavePatch(event.receipt, event.current.draft),
        event.current.library,
        event.current.draft,
        state.draft,
      );
    case 'librarySaveFailed':
      return state;
    default: {
      const unhandled: never = event;
      throw new Error(`Unhandled unit save event: ${String(unhandled)}`);
    }
  }
}
