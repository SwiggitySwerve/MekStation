import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type {
  IVaultFolder,
  IFolderItem,
  IPermissionGrant,
  IContact,
  ShareableContentType,
  PermissionLevel,
} from '@/types/vault';

import {
  FolderList,
  FolderCreateDialog,
  FolderEditDialog,
  FolderSharePanel,
  FolderItemsPanel,
} from '../FolderManager';

// =============================================================================
// Fixtures
// =============================================================================

function makeFolder(overrides: Partial<IVaultFolder> = {}): IVaultFolder {
  return {
    id: 'folder-1',
    name: 'My Units',
    description: 'Collection of mechs',
    parentId: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    itemCount: 5,
    isShared: false,
    ...overrides,
  };
}

function makePermissionGrant(
  overrides: Partial<IPermissionGrant> = {},
): IPermissionGrant {
  return {
    id: 'grant-1',
    granteeId: 'ABC-DEF-GHI',
    scopeType: 'folder' as IPermissionGrant['scopeType'],
    scopeId: 'folder-1',
    scopeCategory: null,
    level: 'read' as PermissionLevel,
    expiresAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    granteeName: 'Alice',
    ...overrides,
  };
}

function makeContact(overrides: Partial<IContact> = {}): IContact {
  return {
    id: 'contact-1',
    friendCode: 'XYZ-123-ABC',
    publicKey: 'pk_test',
    nickname: null,
    displayName: 'Bob',
    avatar: null,
    addedAt: '2025-01-01T00:00:00Z',
    lastSeenAt: null,
    isTrusted: true,
    notes: null,
    ...overrides,
  };
}

function makeFolderItem(overrides: Partial<IFolderItem> = {}): IFolderItem {
  return {
    folderId: 'folder-1',
    itemId: 'unit-atlas',
    itemType: 'unit' as ShareableContentType,
    assignedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

// =============================================================================
// FolderList Tests
// =============================================================================

describe('FolderList', () => {
  const folders = [
    makeFolder({ id: 'folder-1', name: 'Units', itemCount: 3 }),
    makeFolder({
      id: 'folder-2',
      name: 'Pilots',
      itemCount: 7,
      parentId: null,
    }),
    makeFolder({
      id: 'folder-3',
      name: 'Shared Stuff',
      isShared: true,
      itemCount: 2,
    }),
  ];

  it('should render folder names', () => {
    render(<FolderList folders={folders} />);
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Pilots')).toBeInTheDocument();
    expect(screen.getByText('Shared Stuff')).toBeInTheDocument();
  });

  it('should display item counts', () => {
    render(<FolderList folders={folders} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<FolderList folders={[]} isLoading={true} />);
    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(<FolderList folders={[]} error="Connection failed" />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('should render empty state when no folders', () => {
    render(<FolderList folders={[]} />);
    expect(screen.getByText('No folders yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create a folder to organize your vault'),
    ).toBeInTheDocument();
  });

  it('should call onSelectFolder when folder is clicked', () => {
    const onSelectFolder = jest.fn();
    render(<FolderList folders={folders} onSelectFolder={onSelectFolder} />);

    fireEvent.click(screen.getByText('Units'));
    expect(onSelectFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'folder-1', name: 'Units' }),
    );
  });

  it('should highlight selected folder', () => {
    render(<FolderList folders={folders} selectedFolderId="folder-2" />);
    // The selected folder should have gradient styling
    const pilotsFolderText = screen.getByText('Pilots');
    const folderItem = pilotsFolderText.closest('[class*="cursor-pointer"]');
    expect(folderItem?.className).toContain('cyan');
  });

  it('should display folder description when available', () => {
    render(
      <FolderList folders={[makeFolder({ description: 'My best mechs' })]} />,
    );
    expect(screen.getByText('My best mechs')).toBeInTheDocument();
  });
});

// =============================================================================
// FolderCreateDialog Tests
// =============================================================================

describe('FolderCreateDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <FolderCreateDialog {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render New Folder header when open', () => {
    render(<FolderCreateDialog {...defaultProps} />);
    expect(screen.getByText('New Folder')).toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<FolderCreateDialog {...defaultProps} />);
    expect(screen.getByText('Folder Name')).toBeInTheDocument();
    expect(screen.getByText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByText('Parent Folder')).toBeInTheDocument();
  });

  it('should render Cancel and Create Folder buttons', () => {
    render(<FolderCreateDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Folder')).toBeInTheDocument();
  });

  it('should disable Create Folder when name is empty', () => {
    render(<FolderCreateDialog {...defaultProps} />);
    const createButton = screen.getByText('Create Folder').closest('button');
    expect(createButton).toBeDisabled();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<FolderCreateDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should render parent folder options when provided', () => {
    const parentFolders = [
      makeFolder({ id: 'p1', name: 'Parent A' }),
      makeFolder({ id: 'p2', name: 'Parent B' }),
    ];

    render(
      <FolderCreateDialog {...defaultProps} parentFolders={parentFolders} />,
    );

    // Default option + parent folders
    expect(screen.getByText('No parent (root folder)')).toBeInTheDocument();
  });
});

// =============================================================================
// FolderEditDialog Tests
// =============================================================================

describe('FolderEditDialog', () => {
  const folder = makeFolder({
    name: 'My Forces',
    description: 'Battle groups',
  });
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    folder,
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <FolderEditDialog {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should not render when folder is null', () => {
    const { container } = render(
      <FolderEditDialog {...defaultProps} folder={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render Edit Folder header', () => {
    render(<FolderEditDialog {...defaultProps} />);
    expect(screen.getByText('Edit Folder')).toBeInTheDocument();
  });

  it('should pre-populate form with folder data', () => {
    render(<FolderEditDialog {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('My Forces');
    expect(nameInput).toBeInTheDocument();
  });

  it('should render Save Changes and Cancel buttons', () => {
    render(<FolderEditDialog {...defaultProps} />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should render Delete this folder link', () => {
    render(<FolderEditDialog {...defaultProps} />);
    expect(screen.getByText('Delete this folder')).toBeInTheDocument();
  });

  it('should show delete confirmation when Delete is clicked', () => {
    render(<FolderEditDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete this folder'));

    expect(
      screen.getByText(/Are you sure you want to delete this folder/),
    ).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<FolderEditDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// FolderSharePanel Tests
// =============================================================================

describe('FolderSharePanel', () => {
  it('should show placeholder when no folder selected', () => {
    render(<FolderSharePanel folder={null} />);
    expect(
      screen.getByText('Select a folder to manage sharing'),
    ).toBeInTheDocument();
  });

  it('should render Sharing header with folder name', () => {
    const folder = makeFolder({ name: 'Shared Units' });
    render(<FolderSharePanel folder={folder} />);
    expect(screen.getByText('Sharing')).toBeInTheDocument();
    expect(screen.getByText('Shared Units')).toBeInTheDocument();
  });

  it('should show empty shares state', () => {
    const folder = makeFolder();
    render(<FolderSharePanel folder={folder} shares={[]} />);
    expect(screen.getByText('Not shared with anyone')).toBeInTheDocument();
  });

  it('should display share entries', () => {
    const folder = makeFolder();
    const shares = [
      makePermissionGrant({ id: 'g1', granteeName: 'Alice', level: 'read' }),
      makePermissionGrant({
        id: 'g2',
        granteeId: 'DEF-GHI-JKL',
        granteeName: 'Bob',
        level: 'write',
      }),
    ];

    render(<FolderSharePanel folder={folder} shares={shares} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<FolderSharePanel folder={makeFolder()} isLoading={true} />);
    expect(screen.getByText('Loading shares...')).toBeInTheDocument();
  });

  it('should render Add Contact section when contacts available', () => {
    const folder = makeFolder();
    const contacts = [
      makeContact({ friendCode: 'NEW-CONTACT', displayName: 'Charlie' }),
    ];

    render(
      <FolderSharePanel folder={folder} shares={[]} contacts={contacts} />,
    );
    expect(screen.getByText('Add Contact')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });
});

// =============================================================================
// FolderItemsPanel Tests
// =============================================================================

describe('FolderItemsPanel', () => {
  it('should show placeholder when no folder selected', () => {
    render(<FolderItemsPanel folder={null} />);
    expect(
      screen.getByText('Select a folder to view contents'),
    ).toBeInTheDocument();
  });

  it('should render Contents header with item count', () => {
    const folder = makeFolder({ name: 'Battle Group Alpha' });
    const items = [
      makeFolderItem({ itemId: 'unit-1', itemType: 'unit' }),
      makeFolderItem({ itemId: 'pilot-1', itemType: 'pilot' }),
    ];

    render(<FolderItemsPanel folder={folder} items={items} />);
    expect(screen.getByText('Contents')).toBeInTheDocument();
    expect(screen.getByText(/Battle Group Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
  });

  it('should render empty state when folder has no items', () => {
    render(<FolderItemsPanel folder={makeFolder()} items={[]} />);
    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
  });

  it('should display item entries with type', () => {
    const items = [
      makeFolderItem({ itemId: 'atlas-as7d', itemType: 'unit' }),
      makeFolderItem({ itemId: 'pilot-kerensky', itemType: 'pilot' }),
    ];

    render(<FolderItemsPanel folder={makeFolder()} items={items} />);
    expect(screen.getByText('atlas-as7d')).toBeInTheDocument();
    expect(screen.getByText('pilot-kerensky')).toBeInTheDocument();
  });

  it('should render Add Item button when callback provided', () => {
    const onAddItem = jest.fn();
    render(<FolderItemsPanel folder={makeFolder()} onAddItem={onAddItem} />);
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('should call onAddItem when Add Item is clicked', () => {
    const onAddItem = jest.fn();
    render(<FolderItemsPanel folder={makeFolder()} onAddItem={onAddItem} />);

    fireEvent.click(screen.getByText('Add Item'));
    expect(onAddItem).toHaveBeenCalled();
  });

  it('should render loading state', () => {
    render(<FolderItemsPanel folder={makeFolder()} isLoading={true} />);
    expect(screen.getByText('Loading items...')).toBeInTheDocument();
  });
});
