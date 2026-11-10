/**
 * Old ProtoMech units that were saved with the Ultraheavy chassis keep their bytes (4.1-b3d).
 *
 * Ultraheavy is a mass above 9 t, not a chassis (PMChassisView.java:205-207), so the editor
 * no longer produces `chassisType: "Ultraheavy"`. A draft or library record written before
 * that still reads, as a Biped of the same tonnage, and its saved fingerprints (literals in
 * the fixture, captured from the code at #3296 head 901bbf314) still match: a reviewed
 * loader shim (unitSaveState.rules.md) projects the legacy label back into the fingerprint.
 * Never regenerate the literals; extend the fixture instead.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import type { ProtoMechState } from '../protoMechState';

import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '../protoMechStoreRegistry';
import { createUnitLibrarySaveReceipt } from '../unitSaveState';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
  getEditorSaveState,
} from '../unitSaveStateAdapters';
import legacy from './fixtures/protomech-ultraheavy-legacy.json';

type LegacyCase = (typeof legacy.cases)[keyof typeof legacy.cases];
const ULTRAHEAVY = ['ultraheavy-biped-12t', 'ultraheavy-biped-15t'] as const;
const UNCHANGED = ['quad-13t', 'glider-14t'] as const;
const ALL = [...ULTRAHEAVY, ...UNCHANGED] as const;
const cases = legacy.cases as Record<(typeof ALL)[number], LegacyCase>;

const stateOf = (key: (typeof ALL)[number]) =>
  (JSON.parse(cases[key].rawDraft) as { state: ProtoMechState }).state;

afterEach(() => clearAllProtoMechStores(true));

describe('a saved draft written with the Ultraheavy chassis', () => {
  it.each(ULTRAHEAVY)('%s opens as a Biped of the same tonnage', (key) => {
    const saved = stateOf(key);
    expect(saved.chassisType).toBe('Ultraheavy'); // the literal is a legacy draft
    localStorage.setItem(`megamek-protomech-${saved.id}`, cases[key].rawDraft);
    const state = hydrateOrCreateProtoMech(saved.id, {
      tonnage: 5,
    }).getState();
    expect(state.chassisType).toBe(ProtoChassis.BIPED);
    expect(state.tonnage).toBe(saved.tonnage);
    expect(state.walkMP).toBe(saved.walkMP);
    expect(state.jumpMP).toBe(saved.jumpMP);
  });

  it.each(UNCHANGED)('%s opens with its motive unchanged', (key) => {
    const saved = stateOf(key);
    localStorage.setItem(`megamek-protomech-${saved.id}`, cases[key].rawDraft);
    const state = hydrateOrCreateProtoMech(saved.id, { tonnage: 5 }).getState();
    expect(state.chassisType).toBe(saved.chassisType);
    expect(state.tonnage).toBe(saved.tonnage);
  });

  it.each(ULTRAHEAVY)(
    '%s keeps its stored draft fingerprint after it is hydrated',
    (key) => {
      const saved = stateOf(key);
      localStorage.setItem(
        `megamek-protomech-${saved.id}`,
        cases[key].rawDraft,
      );
      const state = hydrateOrCreateProtoMech(saved.id, {
        tonnage: 5,
      }).getState();
      expect(getEditorDraftFingerprint({ store: 'protomech', state })).toBe(
        cases[key].draftFingerprint,
      );
      expect(getEditorLibraryFingerprint({ store: 'protomech', state })).toBe(
        cases[key].libraryFingerprint,
      );
    },
  );
});

describe('a saved library record written with the Ultraheavy chassis', () => {
  it.each(ULTRAHEAVY)('%s reopens as a Biped of the same tonnage', (key) => {
    const record = cases[key].libraryRecord;
    expect(record.smallUnitEditor.chassisType).toBe('Ultraheavy');
    const state = mapProtoMechDefinitionToState(
      JSON.parse(JSON.stringify(record)) as never,
    );
    expect(state.chassisType).toBe(ProtoChassis.BIPED);
    expect(state.tonnage).toBe(record.smallUnitEditor.tonnage);
  });

  it.each(ULTRAHEAVY)(
    '%s keeps its stored library fingerprint after it reopens',
    (key) => {
      const state = mapProtoMechDefinitionToState(
        JSON.parse(JSON.stringify(cases[key].libraryRecord)) as never,
      );
      expect(getEditorLibraryFingerprint({ store: 'protomech', state })).toBe(
        cases[key].libraryFingerprint,
      );
    },
  );
});

describe('the fingerprint shim', () => {
  it.each(ULTRAHEAVY)(
    '%s: a Biped above 9 t fingerprints as the legacy Ultraheavy did',
    (key) => {
      const state = { ...stateOf(key), chassisType: ProtoChassis.BIPED };
      const editor = { store: 'protomech', state } as const;
      expect(getEditorDraftFingerprint(editor)).toBe(
        cases[key].draftFingerprint,
      );
      expect(getEditorLibraryFingerprint(editor)).toBe(
        cases[key].libraryFingerprint,
      );
    },
  );

  it.each(UNCHANGED)(
    '%s: a quad or glider above 9 t keeps its fingerprints',
    (key) => {
      const editor = { store: 'protomech', state: stateOf(key) } as const;
      expect(getEditorDraftFingerprint(editor)).toBe(
        cases[key].draftFingerprint,
      );
      expect(getEditorLibraryFingerprint(editor)).toBe(
        cases[key].libraryFingerprint,
      );
    },
  );

  it.each(ULTRAHEAVY)(
    '%s: a legacy receipt reads clean, matched, and a real edit is detected',
    (key) => {
      const receipt = createUnitLibrarySaveReceipt(
        { id: 'legacy-ultraheavy', version: 1 },
        {
          draft: cases[key].draftFingerprint,
          library: cases[key].libraryFingerprint,
        },
      );
      const state = {
        ...stateOf(key),
        chassisType: ProtoChassis.BIPED,
        isModified: false,
        librarySave: receipt,
      };
      const clean = getEditorSaveState({ store: 'protomech', state });
      expect(clean.library.state).toBe('matched');

      const edited = getEditorSaveState({
        store: 'protomech',
        state: { ...state, walkMP: state.walkMP + 1 },
      });
      expect(edited.library.state).toBe('changed');
      expect(
        getEditorDraftFingerprint({
          store: 'protomech',
          state: { ...state, walkMP: state.walkMP + 1 },
        }),
      ).not.toBe(cases[key].draftFingerprint);
    },
  );

  it('does not relabel a Biped of 9 t or less', () => {
    const state = {
      ...stateOf('ultraheavy-biped-12t'),
      chassisType: ProtoChassis.BIPED,
      tonnage: 9,
    };
    expect(getEditorDraftFingerprint({ store: 'protomech', state })).toContain(
      '"chassisType":"Biped"',
    );
  });
});
