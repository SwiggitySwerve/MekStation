import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mockRouterEvents = { on: jest.fn(), off: jest.fn() };
let mockPathname = '/';

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: mockPathname,
    route: mockPathname,
    query: {},
    asPath: mockPathname,
    push: jest.fn(),
    replace: jest.fn(),
    events: mockRouterEvents,
  }),
}));

import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import TopBar from '@/components/common/TopBar';

describe('Gameplay navigation multiplayer entry', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockRouterEvents.on.mockClear();
    mockRouterEvents.off.mockClear();
  });

  it('exposes Multiplayer from the desktop Gameplay menu', () => {
    render(<TopBar />);

    fireEvent.click(screen.getAllByRole('button', { name: /gameplay/i })[0]);

    const multiplayerItems = screen.getAllByRole('menuitem', {
      name: /multiplayer/i,
    });

    expect(
      multiplayerItems.some(
        (item) => item.getAttribute('href') === '/multiplayer',
      ),
    ).toBe(true);
  });

  it('exposes Multiplayer from mobile bottom navigation', () => {
    render(<MobileBottomNav />);

    expect(screen.getByRole('link', { name: /multiplayer/i })).toHaveAttribute(
      'href',
      '/multiplayer',
    );
  });

  it('gives Multiplayer its own bottom-nav icon, not the Gameplay one', () => {
    render(<MobileBottomNav />);

    const icon = (name: RegExp) =>
      screen.getByRole('link', { name }).querySelector('svg')?.innerHTML;
    expect(icon(/multiplayer/i)).toBeTruthy();
    expect(icon(/multiplayer/i)).not.toBe(icon(/gameplay/i));
  });

  it.each(['/customizer', '/customizer?sort=name', '/gameplay'])(
    'keeps phone navigation available at %s',
    (path) => {
      mockPathname = path;
      render(<MobileBottomNav />);
      expect(
        screen.getByRole('navigation', { name: 'Mobile navigation' }),
      ).not.toHaveClass('max-sm:hidden');
    },
  );

  it.each(['/customizer/unit-1', '/customizer/unit-1/armor?refit=1'])(
    'hides navigation only below the small breakpoint for %s',
    (path) => {
      mockPathname = path;
      render(<MobileBottomNav />);
      expect(
        screen.getByRole('navigation', { name: 'Mobile navigation' }),
      ).toHaveClass('max-sm:hidden');
    },
  );
});
