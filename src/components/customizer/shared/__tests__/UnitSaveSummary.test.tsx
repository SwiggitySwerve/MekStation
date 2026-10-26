import { act, render, screen } from '@testing-library/react';

import { createLibrarySaveReceipt } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { TechBase } from '@/types/enums/TechBase';

import { BrowserDraftStatus } from '../BrowserDraftStatus';
import { SAVE_STATE_EXPLANATION, UnitSaveSummary } from '../UnitSaveSummary';

jest.mock('@/stores/unitStoreRegistry', () => ({
  getUnitStore: jest.fn(),
}));

const mockGetUnitStore = getUnitStore as jest.MockedFunction<
  typeof getUnitStore
>;

const visibleText = (element: HTMLElement): string =>
  Array.from(element.querySelectorAll('[aria-hidden="true"]'))
    .map((node) => node.textContent)
    .join(' ');

describe('UnitSaveSummary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('pairs draft and library state in one short line with full wording for assistive tech', () => {
    mockGetUnitStore.mockReturnValue(undefined);
    render(<UnitSaveSummary unitId="summary-a" />);
    const line = screen.getByTestId('unit-save-summary');
    expect(visibleText(line)).toBe('Browser draft \u00b7 not in library');
    expect(line).toHaveAttribute('title', SAVE_STATE_EXPLANATION);
    expect(SAVE_STATE_EXPLANATION).toMatch(
      /^Your changes are kept in this browser\. Use Save to add the unit to your library/,
    );
    // The line's tooltip explains both parts; the parts do not override it.
    for (const part of line.querySelectorAll('[role="status"]'))
      expect(part).not.toHaveAttribute('title');
    expect(screen.getByText('Browser draft, no changes yet')).toHaveClass(
      'sr-only',
    );
    expect(screen.getByText('Not saved to library')).toHaveClass('sr-only');
    act(() => clientSafeStorage.setItem('megamek-unit-summary-a', '{}'));
    expect(visibleText(line)).toBe(
      'Draft saved in browser \u00b7 not in library',
    );
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
    render(<UnitSaveSummary unitId={store.getState().id} />);
    const line = screen.getByTestId('unit-save-summary');
    expect(visibleText(line)).toContain('in library v3');
    act(() => {
      store.setState({ model: 'AS7-D-X' });
    });
    expect(visibleText(line)).toContain('changed since library v3');
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
