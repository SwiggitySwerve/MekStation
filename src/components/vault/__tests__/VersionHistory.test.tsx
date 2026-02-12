/**
 * VersionHistory Characterization Tests
 *
 * Captures major UI sections and key interactions for:
 * - VersionHistoryPanel: version list, loading, error states
 * - VersionDiffView: diff comparison, view mode toggle
 * - VersionPreview: modal display, copy action
 * - VersionRollbackDialog: confirmation dialog
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { IVersionSnapshot, ShareableContentType } from '@/types/vault';

import {
  VersionHistoryPanel,
  VersionDiffView,
  VersionPreview,
  VersionRollbackDialog,
} from '../VersionHistory';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeVersion(
  overrides: Partial<IVersionSnapshot> = {},
): IVersionSnapshot {
  return {
    id: 'ver-1',
    contentType: 'unit' as ShareableContentType,
    itemId: 'item-1',
    version: 1,
    contentHash: 'abc123def456abc123def456abc123de',
    content: '{"name":"Atlas","tonnage":100}',
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: 'local',
    message: 'Initial version',
    sizeBytes: 1024,
    ...overrides,
  };
}

const mockVersions: IVersionSnapshot[] = [
  makeVersion({
    id: 'ver-3',
    version: 3,
    message: 'Added weapons',
    createdAt: '2025-01-03T00:00:00Z',
  }),
  makeVersion({
    id: 'ver-2',
    version: 2,
    message: 'Updated armor',
    createdAt: '2025-01-02T00:00:00Z',
  }),
  makeVersion({
    id: 'ver-1',
    version: 1,
    message: 'Initial version',
    createdAt: '2025-01-01T00:00:00Z',
  }),
];

const mockSummary = {
  itemId: 'item-1',
  contentType: 'unit' as ShareableContentType,
  currentVersion: 3,
  totalVersions: 3,
  oldestVersion: '2025-01-01T00:00:00Z',
  newestVersion: '2025-01-03T00:00:00Z',
  totalSizeBytes: 3072,
};

// =============================================================================
// Mock fetch
// =============================================================================

const originalFetch = global.fetch;

function mockFetch(
  response: unknown,
  options: { ok?: boolean; status?: number } = {},
) {
  const { ok = true, status = 200 } = options;
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
  });
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

// =============================================================================
// VersionHistoryPanel Tests
// =============================================================================

describe('VersionHistoryPanel', () => {
  const defaultProps = {
    itemId: 'item-1',
    contentType: 'unit' as ShareableContentType,
  };

  it('should render loading state initially', () => {
    // Never-resolving fetch to capture loading state
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<VersionHistoryPanel {...defaultProps} />);
    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('should render version history header after loading', async () => {
    mockFetch({ versions: mockVersions, summary: mockSummary });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Version History')).toBeInTheDocument();
    });
  });

  it('should display content type', async () => {
    mockFetch({ versions: mockVersions, summary: mockSummary });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('unit')).toBeInTheDocument();
    });
  });

  it('should display summary stats', async () => {
    mockFetch({ versions: mockVersions, summary: mockSummary });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getAllByText('Current').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });
  });

  it('should display version entries with messages', async () => {
    mockFetch({ versions: mockVersions, summary: mockSummary });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Added weapons')).toBeInTheDocument();
      expect(screen.getByText('Updated armor')).toBeInTheDocument();
      expect(screen.getByText('Initial version')).toBeInTheDocument();
    });
  });

  it('should mark first version as Current', async () => {
    mockFetch({ versions: mockVersions, summary: mockSummary });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      const currentElements = screen.getAllByText('Current');
      expect(currentElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should call onVersionSelect when a version is clicked', async () => {
    mockFetch({ versions: mockVersions, summary: mockSummary });
    const onVersionSelect = jest.fn();

    render(
      <VersionHistoryPanel
        {...defaultProps}
        onVersionSelect={onVersionSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Added weapons')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Added weapons'));
    expect(onVersionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ver-3', version: 3 }),
    );
  });

  it('should render error state on fetch failure', async () => {
    mockFetch({ error: 'Server error' }, { ok: false, status: 500 });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    });
  });

  it('should display empty state when no versions', async () => {
    mockFetch({ versions: [], summary: null });

    render(<VersionHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No version history')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// VersionDiffView Tests
// =============================================================================

describe('VersionDiffView', () => {
  const defaultProps = {
    itemId: 'item-1',
    contentType: 'unit' as ShareableContentType,
    versions: mockVersions,
  };

  it('should render Compare Versions header', () => {
    // Mock fetch for the diff request
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<VersionDiffView {...defaultProps} />);
    expect(screen.getByText('Compare Versions')).toBeInTheDocument();
    expect(
      screen.getByText('View changes between versions'),
    ).toBeInTheDocument();
  });

  it('should render version selectors', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<VersionDiffView {...defaultProps} />);
    expect(screen.getByText('From Version')).toBeInTheDocument();
    expect(screen.getByText('To Version')).toBeInTheDocument();
  });

  it('should render Unified and Side by Side view mode buttons', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<VersionDiffView {...defaultProps} />);
    expect(screen.getByText('Unified')).toBeInTheDocument();
    expect(screen.getByText('Side by Side')).toBeInTheDocument();
  });

  it('should toggle view mode on click', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<VersionDiffView {...defaultProps} />);

    const sideBySideButton = screen.getByText('Side by Side');
    fireEvent.click(sideBySideButton);

    // After click, the button should have the active style class
    expect(sideBySideButton.className).toContain('violet-300');
  });

  it('should show diff results when versions are loaded', async () => {
    const mockDiff = {
      fromVersion: 2,
      toVersion: 3,
      contentType: 'unit',
      itemId: 'item-1',
      changedFields: ['weapons', 'criticals'],
      additions: { weapons: 'PPC' },
      deletions: {},
      modifications: {},
    };

    mockFetch(mockDiff);

    render(<VersionDiffView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1 added')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// VersionPreview Tests
// =============================================================================

describe('VersionPreview', () => {
  const previewVersion = makeVersion({
    version: 2,
    message: 'Updated armor',
    content: '{"name":"Atlas","tonnage":100,"armor":304}',
    contentHash: 'abc123def456abc123def456abc123de',
  });

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    version: previewVersion,
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <VersionPreview {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should not render when version is null', () => {
    const { container } = render(
      <VersionPreview {...defaultProps} version={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render Version Preview header when open', () => {
    render(<VersionPreview {...defaultProps} />);
    expect(screen.getByText('Version Preview')).toBeInTheDocument();
  });

  it('should display version message', () => {
    render(<VersionPreview {...defaultProps} />);
    expect(screen.getByText(/Updated armor/)).toBeInTheDocument();
  });

  it('should display formatted JSON content', () => {
    render(<VersionPreview {...defaultProps} />);
    // The JSON should be formatted with indentation
    expect(screen.getByText(/"name": "Atlas"/)).toBeInTheDocument();
  });

  it('should render Copy JSON button', () => {
    render(<VersionPreview {...defaultProps} />);
    expect(screen.getByText('Copy JSON')).toBeInTheDocument();
  });

  it('should render Rollback to This button when onRollback provided', () => {
    const onRollback = jest.fn();
    render(<VersionPreview {...defaultProps} onRollback={onRollback} />);
    expect(screen.getByText('Rollback to This')).toBeInTheDocument();
  });

  it('should not render Rollback button without onRollback prop', () => {
    render(<VersionPreview {...defaultProps} />);
    expect(screen.queryByText('Rollback to This')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<VersionPreview {...defaultProps} onClose={onClose} />);

    // Find the X button (close button in header)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find((btn) =>
      btn.querySelector('svg path[d*="M6 18L18 6"]'),
    );
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onRollback when Rollback to This is clicked', () => {
    const onRollback = jest.fn();
    render(<VersionPreview {...defaultProps} onRollback={onRollback} />);

    fireEvent.click(screen.getByText('Rollback to This'));
    expect(onRollback).toHaveBeenCalledWith(previewVersion);
  });

  it('should display content hash', () => {
    render(<VersionPreview {...defaultProps} />);
    expect(screen.getByText(/Hash:/)).toBeInTheDocument();
  });
});

// =============================================================================
// VersionRollbackDialog Tests
// =============================================================================

describe('VersionRollbackDialog', () => {
  const rollbackVersion = makeVersion({
    version: 1,
    message: 'Initial version',
  });

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    version: rollbackVersion,
    currentVersion: 3,
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <VersionRollbackDialog {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should not render when version is null', () => {
    const { container } = render(
      <VersionRollbackDialog {...defaultProps} version={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render Confirm Rollback title when open', () => {
    render(<VersionRollbackDialog {...defaultProps} />);
    expect(screen.getByText('Confirm Rollback')).toBeInTheDocument();
  });

  it('should display current and target versions', () => {
    render(<VersionRollbackDialog {...defaultProps} />);
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('should display version message in dialog', () => {
    render(<VersionRollbackDialog {...defaultProps} />);
    expect(screen.getByText('Initial version')).toBeInTheDocument();
  });

  it('should display warning about creating new version', () => {
    render(<VersionRollbackDialog {...defaultProps} />);
    expect(
      screen.getByText(
        /This will create a new version \(v4\) with the content from v1/,
      ),
    ).toBeInTheDocument();
  });

  it('should render Cancel and Rollback buttons', () => {
    render(<VersionRollbackDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Rollback')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<VersionRollbackDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onConfirm when Rollback is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<VersionRollbackDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Rollback'));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(rollbackVersion);
    });
  });

  it('should display Important warning section', () => {
    render(<VersionRollbackDialog {...defaultProps} />);
    expect(screen.getByText('Important')).toBeInTheDocument();
  });
});
