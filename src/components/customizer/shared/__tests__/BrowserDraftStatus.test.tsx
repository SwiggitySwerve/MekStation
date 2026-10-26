import { act, render, screen } from '@testing-library/react';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';

import { BrowserDraftStatus } from '../BrowserDraftStatus';

describe('BrowserDraftStatus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('reports only successful writes for the active draft', () => {
    const { rerender } = render(<BrowserDraftStatus unitId="visible-first" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No browser draft yet',
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'off');
    act(() => clientSafeStorage.setItem('megamek-unit-other', '{}'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'No browser draft yet',
    );
    act(() => clientSafeStorage.setItem('megamek-unit-visible-first', '{}'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in this browser',
    );
    rerender(<BrowserDraftStatus unitId="visible-second" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No browser draft yet',
    );
    rerender(<BrowserDraftStatus unitId="visible-first" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in this browser',
    );
  });

  it('retains the failed state until the draft is successfully written', () => {
    render(<BrowserDraftStatus unitId="visible-failed" />);
    const storage = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('full');
      });
    act(() => {
      expect(() =>
        clientSafeStorage.setItem('megamek-unit-visible-failed', '{}'),
      ).toThrow('full');
    });
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft save failed in this browser',
    );
    storage.mockRestore();
    act(() => clientSafeStorage.setItem('megamek-unit-visible-failed', '{}'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in this browser',
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'off');
  });
});
