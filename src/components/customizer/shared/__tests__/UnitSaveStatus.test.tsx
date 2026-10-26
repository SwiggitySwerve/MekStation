import { act, render, screen } from '@testing-library/react';

import { createLibrarySaveReceipt } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

import { UnitSaveStatus } from '../UnitSaveStatus';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not invent a library identity when none has been recorded', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    render(<UnitSaveStatus unitId="missing" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Not saved to library',
    );
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
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved to library · v2',
    );

    act(() => {
      store.setState({ name: 'Temporary editor label', isModified: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved to library · v2',
    );
    act(() => {
      store.setState({ model: 'AS7-D-X', isModified: true });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes since library save v2',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(/latest/i);
  });
});
