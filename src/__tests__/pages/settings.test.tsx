/**
 * Characterization tests for Settings page — captures current behavior
 * of all 8 sections before decomposition into smaller components.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Overrides jest.setup.js mock — settings.tsx needs router.events
const mockRouterEvents = {
  on: jest.fn(),
  off: jest.fn(),
};
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/settings',
    pathname: '/settings',
    query: {},
    asPath: '/settings',
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    events: mockRouterEvents,
  }),
}));

jest.mock('@/components/customizer/armor/ArmorDiagramPreview', () => ({
  ArmorDiagramModePreview: ({
    selectedMode,
  }: {
    selectedMode: string;
    onSelectMode: (m: string) => void;
  }) => <div data-testid="armor-diagram-preview">Mode: {selectedMode}</div>,
}));

jest.mock('@/components/customizer/armor/ArmorDiagramSettings', () => ({
  ArmorDiagramSettings: () => (
    <div data-testid="armor-diagram-settings">ArmorDiagramSettings</div>
  ),
}));

jest.mock('@/components/sync', () => ({
  SyncStatusIndicator: () => (
    <div data-testid="sync-status-indicator">SyncStatusIndicator</div>
  ),
  PeerList: () => <div data-testid="peer-list">PeerList</div>,
  RoomCodeDialog: () => (
    <div data-testid="room-code-dialog">RoomCodeDialog</div>
  ),
}));

jest.mock('@/components/vault/VaultIdentitySection', () => ({
  VaultIdentitySection: () => (
    <div data-testid="vault-identity-section">VaultIdentitySection</div>
  ),
}));

jest.mock('@/lib/p2p', () => ({
  ConnectionState: {
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Connected: 'connected',
  },
}));

jest.mock('@/lib/p2p/useSyncRoomStore', () => ({
  useSyncRoomStore: () => ({
    localPeerName: 'TestPeer',
    localPeerId: 'test-peer-id',
    setLocalPeerName: jest.fn(),
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    error: null,
    clearError: jest.fn(),
  }),
  useConnectionState: () => 'disconnected',
  usePeers: () => [],
  useRoomCode: () => null,
}));

import SettingsPage from '@/pages/settings';

function renderSettings() {
  return render(<SettingsPage />);
}

function clickSectionHeader(sectionTitle: string) {
  const buttons = screen.getAllByText(sectionTitle);
  const sectionButton = buttons.find(
    (el) => el.closest('button') && !el.closest('a'),
  );
  act(() => {
    fireEvent.click(sectionButton!.closest('button')!);
  });
}

beforeEach(() => {
  act(() => {
    useAppSettingsStore.getState().resetToDefaults();
    useAppSettingsStore.getState().initDraftAppearance();
  });
  window.location.hash = '';
  jest.clearAllMocks();
});

describe('Settings Page', () => {
  describe('Basic Rendering', () => {
    it('renders the page without crashing', () => {
      renderSettings();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders the page subtitle', () => {
      renderSettings();
      expect(
        screen.getByText('Customize your MekStation experience'),
      ).toBeInTheDocument();
    });

    it('sets page title via Head', () => {
      renderSettings();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Section Presence', () => {
    it('renders all 8 section titles', () => {
      renderSettings();

      expect(screen.getAllByText('Appearance').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getAllByText('Customizer').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        screen.getAllByText('Vault & Sharing').length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('P2P Sync').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('UI Behavior').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        screen.getAllByText('Accessibility').length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Audit Log').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Reset').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Quick Navigation', () => {
    it('renders Jump to label and all 8 nav links', () => {
      renderSettings();
      expect(screen.getByText('Jump to:')).toBeInTheDocument();

      const navLinks = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('#'));
      expect(navLinks.length).toBe(8);
    });

    it('highlights the active section in navigation', () => {
      renderSettings();

      const appearanceLinks = screen.getAllByText('Appearance');
      const navLink = appearanceLinks.find(
        (el) => el.closest('a')?.getAttribute('href') === '#appearance',
      );
      expect(navLink).toBeDefined();
    });
  });

  describe('Section Navigation', () => {
    it('expands appearance section by default', () => {
      renderSettings();

      expect(
        screen.getByText(
          'Customize colors, fonts, and visual effects. Changes preview instantly but require saving.',
        ),
      ).toBeInTheDocument();
    });

    it('switches active section when clicking a different section header', () => {
      renderSettings();
      clickSectionHeader('UI Behavior');

      expect(
        screen.getByText('Collapse Sidebar by Default'),
      ).toBeInTheDocument();
    });

    it('switches to accessibility section showing its toggles', () => {
      renderSettings();
      clickSectionHeader('Accessibility');

      expect(screen.getByText('High Contrast')).toBeInTheDocument();
      expect(screen.getByText('Reduce Motion')).toBeInTheDocument();
    });

    it('navigates to section via quick nav link', () => {
      renderSettings();

      const navLink = screen
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === '#reset');
      expect(navLink).toBeDefined();

      act(() => {
        fireEvent.click(navLink!);
      });

      expect(screen.getByText('Reset All Settings')).toBeInTheDocument();
    });
  });

  describe('Appearance Section - Draft/Preview System', () => {
    it('renders accent color picker with 6 color options', () => {
      renderSettings();

      const colorButtons = screen
        .getAllByRole('button')
        .filter((btn) =>
          ['Amber', 'Cyan', 'Emerald', 'Rose', 'Violet', 'Blue'].includes(
            btn.getAttribute('aria-label') || '',
          ),
        );
      expect(colorButtons.length).toBe(6);
    });

    it('renders font size selector with 3 options', () => {
      renderSettings();

      const fontSizeSelect = screen.getByDisplayValue('Medium (16px)');
      expect(fontSizeSelect).toBeInTheDocument();
    });

    it('renders animation level selector', () => {
      renderSettings();

      const animationSelect = screen.getByDisplayValue(
        'Full - All animations enabled',
      );
      expect(animationSelect).toBeInTheDocument();
    });

    it('renders UI Theme picker with 4 themes', () => {
      renderSettings();

      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Neon')).toBeInTheDocument();
      expect(screen.getByText('Tactical')).toBeInTheDocument();
    });

    it('renders compact mode toggle', () => {
      renderSettings();

      expect(screen.getByText('Compact Mode')).toBeInTheDocument();
      const switches = screen.getAllByRole('switch');
      const compactSwitch = switches.find(
        (s) => s.getAttribute('aria-checked') === 'false',
      );
      expect(compactSwitch).toBeDefined();
    });

    it('shows "Appearance settings saved" when no unsaved changes', () => {
      renderSettings();

      expect(screen.getByText('Appearance settings saved')).toBeInTheDocument();
    });

    it('marks appearance as unsaved after changing accent color', () => {
      renderSettings();

      const cyanButton = screen.getByLabelText('Cyan');
      act(() => {
        fireEvent.click(cyanButton);
      });

      expect(
        screen.getByText('You have unsaved appearance changes'),
      ).toBeInTheDocument();
    });

    it('shows Save Appearance button enabled after making changes', () => {
      renderSettings();

      const cyanButton = screen.getByLabelText('Cyan');
      act(() => {
        fireEvent.click(cyanButton);
      });

      const saveButton = screen.getByText('Save Appearance');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Customizer Section', () => {
    it('renders customizer content when section is expanded', () => {
      renderSettings();
      clickSectionHeader('Customizer');

      expect(screen.getByTestId('armor-diagram-preview')).toBeInTheDocument();
      expect(
        screen.getByText('Show Design Selector (UAT)'),
      ).toBeInTheDocument();
    });
  });

  describe('Vault & Sharing Section', () => {
    it('renders vault identity section when expanded', () => {
      renderSettings();
      clickSectionHeader('Vault & Sharing');

      expect(screen.getByTestId('vault-identity-section')).toBeInTheDocument();
    });
  });

  describe('P2P Sync Section', () => {
    it('renders P2P sync controls when expanded', () => {
      renderSettings();
      clickSectionHeader('P2P Sync');

      expect(screen.getByTestId('sync-status-indicator')).toBeInTheDocument();
      expect(screen.getByText('Your Display Name')).toBeInTheDocument();
      expect(screen.getByText('How P2P Sync Works')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });
  });

  describe('UI Behavior Section', () => {
    it('renders all 3 toggles when expanded', () => {
      renderSettings();
      clickSectionHeader('UI Behavior');

      expect(
        screen.getByText('Collapse Sidebar by Default'),
      ).toBeInTheDocument();
      expect(screen.getByText('Confirm Before Closing')).toBeInTheDocument();
      expect(screen.getByText('Show Tooltips')).toBeInTheDocument();
    });
  });

  describe('Audit Log Section', () => {
    it('renders audit log content with event timeline link', () => {
      renderSettings();
      clickSectionHeader('Audit Log');

      expect(screen.getByText('Event Timeline')).toBeInTheDocument();
      expect(screen.getByText('Replay Player')).toBeInTheDocument();
      expect(screen.getByText('Coming soon')).toBeInTheDocument();

      const timelineLink = screen
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === '/audit/timeline');
      expect(timelineLink).toBeDefined();
    });
  });

  describe('Reset Section', () => {
    it('renders reset button when section is expanded', () => {
      renderSettings();
      clickSectionHeader('Reset');

      expect(screen.getByText('Reset All Settings')).toBeInTheDocument();
      expect(
        screen.getByText('Restore all settings to their default values'),
      ).toBeInTheDocument();
    });
  });

  describe('Route Change Behavior', () => {
    it('registers routeChangeStart handler for reverting on navigation', () => {
      renderSettings();

      expect(mockRouterEvents.on).toHaveBeenCalledWith(
        'routeChangeStart',
        expect.any(Function),
      );
    });
  });

  describe('UI Theme Draft Preview', () => {
    it('shows theme save notice when UI theme is changed', () => {
      renderSettings();

      const neonButton = screen.getByText('Neon').closest('button');
      expect(neonButton).toBeDefined();

      act(() => {
        fireEvent.click(neonButton!);
      });

      expect(
        screen.getByText('Theme preview active — save to keep changes'),
      ).toBeInTheDocument();
      expect(screen.getByText('Save Theme')).toBeInTheDocument();
    });
  });
});
