import {
  createUnitLibrarySaveReceipt,
  getUnitLibrarySavePatch,
  getUnitSaveState,
  isUnitDraftModified,
  transitionUnitSaveState,
  type SaveState,
} from '../unitSaveState';

const fingerprints = { draft: 'editor-content', library: 'library-content' };
const receipt = {
  id: 'custom-library-id',
  version: 3,
  fingerprint: fingerprints.library,
  draftFingerprint: fingerprints.draft,
};

describe('unit save-state owner', () => {
  it.each([
    [undefined, 'unknown'],
    [false, 'clean'],
    [true, 'modified'],
  ] as const)(
    'reads legacy modification %s without inventing a library receipt',
    (isModified, modification) => {
      expect(getUnitSaveState({ isModified }, fingerprints.library)).toEqual({
        modification,
        draft: 'pending',
        library: { state: 'none' },
      });
    },
  );

  it('keeps editor-only changes separate from a matching library design', () => {
    expect(
      getUnitSaveState(
        { isModified: true, librarySave: receipt },
        fingerprints.library,
        'failed',
      ),
    ).toEqual({
      modification: 'modified',
      draft: 'failed',
      library: { state: 'matched', receipt },
    });
    expect(
      getUnitSaveState(
        { isModified: false, librarySave: receipt },
        'new-construction',
      ).library,
    ).toEqual({
      state: 'changed',
      receipt,
    });
  });

  it.each([
    ['same', 'same', false],
    ['new', 'old', true],
    ['current', undefined, true],
    ['', '', false],
  ] as const)(
    'compares draft %s against baseline %s',
    (current, baseline, expected) => {
      expect(isUnitDraftModified(() => current, baseline)).toBe(expected);
    },
  );

  it('does not evaluate editor content when no clean baseline is known', () => {
    const fingerprint = jest.fn(() => {
      throw new Error('An unknown baseline must short-circuit');
    });
    expect(isUnitDraftModified(fingerprint, undefined)).toBe(true);
    expect(fingerprint).not.toHaveBeenCalled();
  });

  it('creates the existing receipt shape and records the submitted content', () => {
    expect(
      createUnitLibrarySaveReceipt(
        { id: receipt.id, version: receipt.version },
        fingerprints,
      ),
    ).toEqual(receipt);
    expect(getUnitLibrarySavePatch(receipt, fingerprints.draft)).toEqual({
      librarySave: receipt,
      isModified: false,
    });
    expect(getUnitLibrarySavePatch(receipt, 'newer-editor-content')).toEqual({
      librarySave: receipt,
      isModified: true,
    });
  });

  it('accepts an old receipt without an editor fingerprint without inventing a clean baseline', () => {
    const { draftFingerprint: _legacyMissing, ...legacy } = receipt;
    expect(
      getUnitSaveState(
        { isModified: false, librarySave: legacy },
        fingerprints.library,
      ).library,
    ).toEqual({ state: 'matched', receipt: legacy });
    expect(getUnitLibrarySavePatch(legacy, fingerprints.draft).isModified).toBe(
      true,
    );
  });

  const states: SaveState[] = (
    ['clean', 'modified', 'unknown'] as const
  ).flatMap((modification) =>
    (['pending', 'saved', 'failed'] as const).flatMap((draft) =>
      (['none', 'matched', 'changed'] as const).map(
        (state): SaveState => ({
          modification,
          draft,
          library: state === 'none' ? { state } : { state, receipt },
        }),
      ),
    ),
  );

  it.each(states)(
    'keeps independent axes through every event from %j',
    (state) => {
      expect(
        transitionUnitSaveState(state, {
          type: 'draftWriteCompleted',
          status: 'saved',
        }),
      ).toEqual({ ...state, draft: 'saved' });
      expect(
        transitionUnitSaveState(state, {
          type: 'draftWriteCompleted',
          status: 'failed',
        }),
      ).toEqual({ ...state, draft: 'failed' });
      expect(
        transitionUnitSaveState(state, { type: 'librarySaveFailed' }),
      ).toBe(state);
      expect(
        transitionUnitSaveState(state, {
          type: 'unitChanged',
          isModified: false,
          libraryFingerprint: fingerprints.library,
        }),
      ).toEqual({
        ...state,
        modification: 'clean',
        library:
          state.library.state === 'none'
            ? { state: 'none' }
            : { state: 'matched', receipt },
      });
      expect(
        transitionUnitSaveState(state, {
          type: 'unitChanged',
          isModified: true,
          libraryFingerprint: 'changed',
        }),
      ).toEqual({
        ...state,
        modification: 'modified',
        library:
          state.library.state === 'none'
            ? { state: 'none' }
            : { state: 'changed', receipt },
      });
      expect(
        transitionUnitSaveState(state, {
          type: 'librarySaved',
          receipt,
          current: fingerprints,
        }),
      ).toEqual({
        modification: 'clean',
        draft: state.draft,
        library: { state: 'matched', receipt },
      });
      expect(
        transitionUnitSaveState(state, {
          type: 'librarySaved',
          receipt,
          current: { draft: 'newer-edit', library: 'newer-construction' },
        }),
      ).toEqual({
        modification: 'modified',
        draft: state.draft,
        library: { state: 'changed', receipt },
      });
    },
  );
});
