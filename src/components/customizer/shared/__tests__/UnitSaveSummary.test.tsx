import { act, render, screen } from '@testing-library/react';

import { createLibrarySaveReceipt } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { TechBase } from '@/types/enums/TechBase';

import { BrowserDraftStatus } from '../BrowserDraftStatus';
import {
  SAVE_STATE_EXPLANATION,
  UnitSaveAction,
  UnitSaveDetails,
  UnitSaveLabel,
  UnitSaveSummary,
  unitSaveLine,
  unitSaveLines,
} from '../UnitSaveSummary';

jest.mock('@/stores/unitStoreRegistry', () => ({
  getUnitStore: jest.fn(),
}));

const mockGetUnitStore = getUnitStore as jest.MockedFunction<
  typeof getUnitStore
>;

describe('UnitSaveSummary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows the save state on phones in the same words as desktop', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    render(<UnitSaveSummary unitId="summary-a" showOnDesktop />);
    const line = screen.getByTestId('unit-save-summary');
    expect(line).toHaveTextContent(/^Not in library$/);
    expect(line.getAttribute('title')).toContain(SAVE_STATE_EXPLANATION);
    expect(SAVE_STATE_EXPLANATION).toMatch(
      /^Your changes are kept in this browser\. Use Save to add the unit to your library/,
    );
    // A browser write adds the draft part; the library wording stays.
    act(() => clientSafeStorage.setItem('megamek-unit-summary-a', '{}'));
    expect(line).toHaveTextContent(/^Not in library · draft saved$/);
  });

  it('reads the save state as one line, library words first', () => {
    expect(unitSaveLine(unitSaveLines('pending', { state: 'none' }))).toBe(
      'Not in library',
    );
    expect(unitSaveLine(unitSaveLines('saved', { state: 'none' }))).toBe(
      'Not in library · draft saved',
    );
    expect(
      unitSaveLine(unitSaveLines('saved', { state: 'changed', version: 3 })),
    ).toBe('Changed since v3 · draft saved');
    expect(
      unitSaveLine(unitSaveLines('saved', { state: 'matched', version: 3 })),
    ).toBe('In library v3');
  });

  it('words the save state in two parts until the library copy matches', () => {
    expect(unitSaveLines('pending', { state: 'none' })).toEqual({
      first: 'Not in library',
      second: null,
      settled: false,
    });
    expect(unitSaveLines('saved', { state: 'none' })).toEqual({
      first: 'Draft saved in browser',
      second: 'Not in library',
      settled: true,
    });
    expect(unitSaveLines('saved', { state: 'changed', version: 3 })).toEqual({
      first: 'Draft saved in browser',
      second: 'Changed since v3',
      settled: true,
    });
    expect(unitSaveLines('saved', { state: 'matched', version: 3 })).toEqual({
      first: 'In library v3',
      second: null,
      settled: true,
    });
  });

  it('reports the library version and later edits', () => {
    const store = createNewUnitStore({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Atlas AS7-D',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
    });
    store.setState({
      librarySave: createLibrarySaveReceipt(store.getState(), {
        id: 'library-atlas',
        version: 3,
      }),
    });
    mockGetUnitStore.mockReturnValue(store);
    render(<UnitSaveSummary unitId={store.getState().id} showOnDesktop />);
    const line = screen.getByTestId('unit-save-summary');
    expect(line).toHaveTextContent(/^In library v3$/);
    act(() => {
      store.setState({ model: 'AS7-D-X' });
    });
    expect(line).toHaveTextContent(/^Changed since v3 · draft saved$/);
  });

  it('labels the desktop Save button with the save state, or a loud failure with Retry', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    const { container } = render(
      <>
        <UnitSaveLabel unitId="summary-desk" />
        <UnitSaveSummary unitId="summary-desk" />
      </>,
    );
    // Desktop shows one label beside Save; the phone line stays empty.
    expect(screen.queryByTestId('unit-save-summary')).toBeNull();
    const label = screen.getByTestId('unit-save-label');
    expect(label).toHaveTextContent(/^Not in library$/);
    expect(label).toHaveAttribute('aria-hidden', 'true');
    expect(label).toHaveAttribute('data-state', 'none');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full');
    });
    act(() => {
      expect(() =>
        clientSafeStorage.setItem('megamek-unit-summary-desk', '{}'),
      ).toThrow('full');
    });
    expect(screen.queryByTestId('unit-save-label')).toBeNull();
    const status = screen.getByRole('status');
    expect(status).toHaveClass('text-red-400', 'font-semibold');
    expect(status).toHaveTextContent(/^Browser draft not saved/);
    expect(container).not.toHaveTextContent('Not in library');
  });

  it('makes Save the primary action only while the unit is not in the library or changed', () => {
    const store = createNewUnitStore({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Atlas AS7-D',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
    });
    mockGetUnitStore.mockReturnValue(store);
    const unitId = store.getState().id;
    const { container } = render(
      <UnitSaveAction
        unitId={unitId}
        disabledReason={null}
        onSave={jest.fn()}
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Save active unit to library',
    });
    expect(button).toHaveAccessibleDescription(/^Not in library\s*\.$/);
    expect(button).toHaveAttribute('data-save-emphasis', 'primary');
    expect(button).toHaveTextContent('Save to library');
    // No standalone dot: the words name the state.
    expect(container.querySelector('[data-save-dot]')).toBeNull();
    expect(screen.getByTestId('unit-save-label')).toHaveTextContent(
      /^Not in library$/,
    );
    expect(container.querySelector('[data-toolbar-hint]')).toHaveTextContent(
      SAVE_STATE_EXPLANATION,
    );
    act(() => {
      store.setState({
        librarySave: createLibrarySaveReceipt(store.getState(), {
          id: 'library-atlas',
          version: 4,
        }),
      });
    });
    expect(button).toHaveAccessibleDescription(
      /^In library v4\s*\.\s*Draft saved in this browser\s*\.$/,
    );
    expect(button).toHaveAttribute('data-save-emphasis', 'quiet');
    expect(screen.getByTestId('unit-save-label')).toHaveTextContent(
      /^In library v4$/,
    );
    act(() => {
      store.setState({ model: 'AS7-D-X' });
    });
    expect(button).toHaveAccessibleDescription(/^Changed since v4\s*\./);
    expect(button).toHaveAttribute('data-save-emphasis', 'primary');
    expect(screen.getByTestId('unit-save-label')).toHaveTextContent(
      /^Changed since v4 · draft saved$/,
    );
  });
  it('repeats the header words in the panel and leaves out an unwritten draft', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    render(<UnitSaveDetails unitId="summary-panel" />);
    expect(screen.getByText('Not in library')).toBeInTheDocument();
    expect(screen.queryByText(/no changes yet|No browser draft/)).toBeNull();
    act(() => clientSafeStorage.setItem('megamek-unit-summary-panel', '{}'));
    expect(screen.getByText('Draft saved in browser')).toBeInTheDocument();
    expect(screen.getByText('Not in library')).toBeInTheDocument();
    expect(screen.getByTestId('unit-save-details')).toHaveTextContent(
      SAVE_STATE_EXPLANATION,
    );
  });

  it('can stay hidden until a draft write fails', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    const { container } = render(
      <BrowserDraftStatus unitId="summary-failed" compact onlyWhenFailed />,
    );
    expect(container).toBeEmptyDOMElement();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full');
    });
    act(() => {
      expect(() =>
        clientSafeStorage.setItem('megamek-unit-summary-failed', '{}'),
      ).toThrow('full');
    });
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Draft save failed in this browser')).toHaveClass(
      'sr-only',
    );
  });
});
