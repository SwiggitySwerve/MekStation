import { act, render, screen } from '@testing-library/react';

import { createLibrarySaveReceipt } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

import {
  UnitSaveStatus,
  libraryNeedsSave,
  librarySaveExplanation,
  librarySaveLabel,
} from '../UnitSaveStatus';

jest.mock('@/stores/unitStoreRegistry', () => ({
  getUnitStore: jest.fn(),
}));

const mockGetUnitStore = getUnitStore as jest.MockedFunction<
  typeof getUnitStore
>;

function makeStore() {
  return createNewUnitStore({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Atlas AS7-D',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
}

describe('UnitSaveStatus', () => {
  it('pins the exact save-again wording for every older-writer surface', () => {
    const message =
      'Saved with an older version of MekStation. Save again to update the library copy.';
    expect(librarySaveLabel('saved-older-writer', 2)).toBe(message);
    expect(librarySaveExplanation('saved-older-writer', 2)).toBe(message);
    expect(libraryNeedsSave('saved-older-writer')).toBe(true);
    expect(librarySaveLabel('unknown', 2)).toBe('Library status unknown');
    expect(libraryNeedsSave('unknown')).toBe(true);
  });

  it('renders an unchanged older-writer receipt without calling it changed', () => {
    const store = makeStore();
    const receipt = createLibrarySaveReceipt(store.getState(), {
      id: 'old-writer-library',
      version: 2,
    });
    store.setState({
      librarySave: { ...receipt, fingerprint: 'old-writer-bytes' },
    });
    mockGetUnitStore.mockReturnValue(store);
    render(<UnitSaveStatus unitId={store.getState().id} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved with an older version of MekStation. Save again to update the library copy.',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('Changed Since');
    act(() => store.setState({ model: 'Edited model' }));
    expect(screen.getByRole('status')).toHaveTextContent('Changed Since v2');
  });

  it('renders a receipt without a draft baseline as unknown', () => {
    const store = makeStore();
    const { draftFingerprint: _missing, ...legacy } = createLibrarySaveReceipt(
      store.getState(),
      { id: 'old-library', version: 2 },
    );
    store.setState({ librarySave: legacy });
    mockGetUnitStore.mockReturnValue(store);
    render(<UnitSaveStatus unitId={store.getState().id} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Library status unknown',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('Changed Since');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not invent a library identity when none has been recorded', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    render(<UnitSaveStatus unitId="missing" />);
    expect(screen.getByRole('status')).toHaveTextContent('Not in Library');
    expect(screen.getByRole('status')).not.toHaveTextContent(/latest/i);
  });

  it('reports the recorded version and whether the draft still matches it', () => {
    const store = makeStore();
    store.setState({
      librarySave: createLibrarySaveReceipt(store.getState(), {
        id: 'library-atlas',
        version: 2,
      }),
      isModified: false,
    });
    mockGetUnitStore.mockReturnValue(store);
    render(<UnitSaveStatus unitId={store.getState().id} />);
    expect(screen.getByRole('status')).toHaveTextContent('In Library v2');

    act(() => {
      store.setState({ name: 'Temporary editor label', isModified: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent('In Library v2');
    act(() => {
      store.setState({ model: 'AS7-D-X', isModified: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Changed Since v2');
    expect(screen.getByRole('status')).not.toHaveTextContent(/latest/i);
  });
});
