import { TechBase } from '@/types/enums/TechBase';

import type { ILibrarySaveReceipt } from '../unitSaveState';

import {
  getUnitDraftFingerprint,
  getUnitLibraryFingerprint,
} from '../unit/unitEditSnapshot';
import {
  createEditorLibrarySaveReceipt,
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
  getEditorLibrarySavePatch,
  getEditorSaveState,
  type UnitSaveEditor,
} from '../unitSaveStateAdapters';
import { createDefaultUnitState } from '../unitState';
import {
  clearNonMechSaveCases,
  nonMechSaveCases,
} from './nonMechSaveState.test-support';

beforeEach(clearNonMechSaveCases);
afterEach(clearNonMechSaveCases);

describe.each(nonMechSaveCases)(
  '$family save metadata',
  ({ family, create, clear, hydrate }) => {
    const editor = (
      state: ReturnType<typeof create>['getState'] extends () => infer S
        ? S
        : never,
    ) => ({ store: family, state }) as UnitSaveEditor;

    it('persists a confirmed receipt through the real registry without changing draft content', () => {
      const store = create();
      const submitted = editor(store.getState());
      const receipt = createEditorLibrarySaveReceipt(submitted, {
        id: 'saved-unit',
        version: 4,
      });
      const write: (patch: {
        librarySave: ILibrarySaveReceipt;
        isModified: boolean;
      }) => void = store.setState;
      write(getEditorLibrarySavePatch(submitted, receipt));
      clear();
      const restored = editor(hydrate().getState());
      expect(restored.state.librarySave).toEqual(receipt);
      expect(getEditorSaveState(restored)).toMatchObject({
        modification: 'clean',
        library: { state: 'matched', receipt },
      });
      expect(getEditorDraftFingerprint(restored)).toBe(
        receipt.draftFingerprint,
      );
    });

    it('compares content across clones and retains edits arriving during a save', () => {
      const submitted = editor(create().getState());
      const receipt = createEditorLibrarySaveReceipt(submitted, {
        id: 'saved-unit',
        version: 4,
      });
      const cloned = editor(JSON.parse(JSON.stringify(submitted.state)));
      expect(getEditorDraftFingerprint(cloned)).toBe(
        getEditorDraftFingerprint(submitted),
      );
      expect(getEditorLibrarySavePatch(cloned, receipt).isModified).toBe(false);
      const edited = {
        ...cloned,
        state: { ...cloned.state, model: 'Later edit' },
      } as UnitSaveEditor;
      expect(getEditorLibrarySavePatch(edited, receipt)).toEqual({
        librarySave: receipt,
        isModified: true,
      });
      expect(getEditorLibraryFingerprint(edited)).not.toBe(receipt.fingerprint);
      const legacy = {
        id: receipt.id,
        version: receipt.version,
        fingerprint: receipt.fingerprint,
      };
      expect(getEditorLibrarySavePatch(cloned, legacy).isModified).toBe(true);
    });

    it('ignores runtime identity, timestamps, modified flags and cached BV in fingerprints', () => {
      const submitted = editor(create().getState());
      const updated = {
        ...submitted,
        state: {
          ...submitted.state,
          id: 'new-runtime-id',
          createdAt: 1,
          lastModifiedAt: 2,
          isModified: !submitted.state.isModified,
          bvBreakdown: undefined,
        },
      } as UnitSaveEditor;
      expect(getEditorDraftFingerprint(updated)).toBe(
        getEditorDraftFingerprint(submitted),
      );
      expect(getEditorLibraryFingerprint(updated)).toBe(
        getEditorLibraryFingerprint(submitted),
      );
    });
  },
);

it('delegates mech fingerprints to the unchanged facade', () => {
  const state = createDefaultUnitState({
    name: 'Reference',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const editor = { store: 'battlemech', state } as const;
  expect(getEditorDraftFingerprint(editor)).toBe(
    getUnitDraftFingerprint(state),
  );
  expect(getEditorLibraryFingerprint(editor)).toBe(
    getUnitLibraryFingerprint(state),
  );
});
