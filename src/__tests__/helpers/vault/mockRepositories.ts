/**
 * Mock Repositories for Vault Tests
 *
 * Provides in-memory implementations of vault repositories
 * for unit testing without database dependencies.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultFolder,
  IFolderItem,
  IVersionSnapshot,
  IVersionHistorySummary,
  IQueuedMessage,
  IPeerQueueSummary,
  IQueueStats,
  ShareableContentType,
  QueuedMessageStatus,
  P2PMessageType,
} from '@/types/vault';

// =============================================================================
// Mock Folder Repository
// =============================================================================

export class MockVaultFolderRepository {
  private folders: Map<string, IVaultFolder> = new Map();
  private folderItems: Map<string, IFolderItem[]> = new Map();
  private idCounter = 0;

  async createFolder(
    name: string,
    options?: { description?: string; parentId?: string; isShared?: boolean }
  ): Promise<IVaultFolder> {
    const id = `folder-mock-${++this.idCounter}`;
    const now = new Date().toISOString();
    const folder: IVaultFolder = {
      id,
      name,
      description: options?.description ?? null,
      parentId: options?.parentId ?? null,
      createdAt: now,
      updatedAt: now,
      itemCount: 0,
      isShared: options?.isShared ?? false,
    };
    this.folders.set(id, folder);
    this.folderItems.set(id, []);
    return folder;
  }

  async getFolderById(id: string): Promise<IVaultFolder | null> {
    return this.folders.get(id) ?? null;
  }

  async getRootFolders(): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values()).filter((f) => f.parentId === null);
  }

  async getChildFolders(parentId: string): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values()).filter(
      (f) => f.parentId === parentId
    );
  }

  async getAllFolders(): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values());
  }

  async getSharedFolders(): Promise<IVaultFolder[]> {
    return Array.from(this.folders.values()).filter((f) => f.isShared);
  }

  async updateFolderName(id: string, name: string): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.name = name;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async updateFolderDescription(
    id: string,
    description: string | null
  ): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.description = description;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async moveFolder(id: string, newParentId: string | null): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.parentId = newParentId;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async setFolderShared(id: string, isShared: boolean): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.isShared = isShared;
    folder.updatedAt = new Date().toISOString();
    return true;
  }

  async deleteFolder(id: string): Promise<boolean> {
    this.folderItems.delete(id);
    return this.folders.delete(id);
  }

  async addItemToFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    const items = this.folderItems.get(folderId) ?? [];
    const exists = items.some(
      (i) => i.itemId === itemId && i.itemType === itemType
    );
    if (!exists) {
      items.push({
        folderId,
        itemId,
        itemType,
        assignedAt: new Date().toISOString(),
      });
      this.folderItems.set(folderId, items);
      const folder = this.folders.get(folderId);
      if (folder) folder.itemCount = items.length;
    }
    return true;
  }

  async removeItemFromFolder(
    folderId: string,
    itemId: string,
    itemType: ShareableContentType
  ): Promise<boolean> {
    const items = this.folderItems.get(folderId) ?? [];
    const newItems = items.filter(
      (i) => !(i.itemId === itemId && i.itemType === itemType)
    );
    this.folderItems.set(folderId, newItems);
    const folder = this.folders.get(folderId);
    if (folder) folder.itemCount = newItems.length;
    return items.length !== newItems.length;
  }

  async getFolderItems(folderId: string): Promise<IFolderItem[]> {
    return this.folderItems.get(folderId) ?? [];
  }

  async getItemFolders(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<IVaultFolder[]> {
    const result: IVaultFolder[] = [];
    this.folderItems.forEach((items, folderId) => {
      if (items.some((i) => i.itemId === itemId && i.itemType === itemType)) {
        const folder = this.folders.get(folderId);
        if (folder) result.push(folder);
      }
    });
    return result;
  }

  async moveItem(
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string
  ): Promise<boolean> {
    await this.removeItemFromFolder(fromFolderId, itemId, itemType);
    return this.addItemToFolder(toFolderId, itemId, itemType);
  }

  async removeItemFromAllFolders(
    itemId: string,
    itemType: ShareableContentType
  ): Promise<number> {
    let count = 0;
    this.folderItems.forEach((items, folderId) => {
      const newItems = items.filter(
        (i) => !(i.itemId === itemId && i.itemType === itemType)
      );
      if (newItems.length !== items.length) {
        this.folderItems.set(folderId, newItems);
        const folder = this.folders.get(folderId);
        if (folder) folder.itemCount = newItems.length;
        count++;
      }
    });
    return count;
  }

  // Test helpers
  clear(): void {
    this.folders.clear();
    this.folderItems.clear();
    this.idCounter = 0;
  }

  seedFolder(folder: IVaultFolder): void {
    this.folders.set(folder.id, { ...folder });
    if (!this.folderItems.has(folder.id)) {
      this.folderItems.set(folder.id, []);
    }
  }

  seedFolderItem(item: IFolderItem): void {
    const items = this.folderItems.get(item.folderId) ?? [];
    items.push({ ...item });
    this.folderItems.set(item.folderId, items);
    const folder = this.folders.get(item.folderId);
    if (folder) folder.itemCount = items.length;
  }
}

// =============================================================================
// Mock Version History Repository
// =============================================================================

export class MockVersionHistoryRepository {
  private versions: Map<string, IVersionSnapshot> = new Map();
  private versionCounter = 0;

  async saveVersion(
    contentType: ShareableContentType,
    itemId: string,
    content: string,
    contentHash: string,
    createdBy: string,
    message?: string
  ): Promise<IVersionSnapshot> {
    const existingVersions = await this.getVersions(itemId, contentType, 1000);
    const version = existingVersions.length + 1;
    const id = `version-${++this.versionCounter}`;

    const snapshot: IVersionSnapshot = {
      id,
      contentType,
      itemId,
      version,
      contentHash,
      content,
      createdAt: new Date().toISOString(),
      createdBy,
      message: message ?? null,
      sizeBytes: content.length,
    };

    this.versions.set(id, snapshot);
    return snapshot;
  }

  async getVersions(
    itemId: string,
    contentType: ShareableContentType,
    limit = 50
  ): Promise<IVersionSnapshot[]> {
    return Array.from(this.versions.values())
      .filter((v) => v.itemId === itemId && v.contentType === contentType)
      .sort((a, b) => b.version - a.version)
      .slice(0, limit);
  }

  async getVersion(
    itemId: string,
    contentType: ShareableContentType,
    version: number
  ): Promise<IVersionSnapshot | null> {
    return (
      Array.from(this.versions.values()).find(
        (v) =>
          v.itemId === itemId &&
          v.contentType === contentType &&
          v.version === version
      ) ?? null
    );
  }

  async getVersionById(id: string): Promise<IVersionSnapshot | null> {
    return this.versions.get(id) ?? null;
  }

  async getLatestVersion(
    itemId: string,
    contentType: ShareableContentType
  ): Promise<IVersionSnapshot | null> {
    const versions = await this.getVersions(itemId, contentType, 1);
    return versions[0] ?? null;
  }

  async deleteVersion(id: string): Promise<boolean> {
    return this.versions.delete(id);
  }

  async deleteAllVersions(
    itemId: string,
    contentType: ShareableContentType
  ): Promise<number> {
    let count = 0;
    const entries = Array.from(this.versions.entries());
    for (const [id, v] of entries) {
      if (v.itemId === itemId && v.contentType === contentType) {
        this.versions.delete(id);
        count++;
      }
    }
    return count;
  }

  async pruneOldVersions(
    itemId: string,
    contentType: ShareableContentType,
    keepCount: number
  ): Promise<number> {
    const versions = await this.getVersions(itemId, contentType, 1000);
    const toDelete = versions.slice(keepCount);
    for (const v of toDelete) {
      this.versions.delete(v.id);
    }
    return toDelete.length;
  }

  async getCurrentVersionNumber(
    itemId: string,
    contentType: ShareableContentType
  ): Promise<number> {
    const versions = await this.getVersions(itemId, contentType, 1);
    return versions[0]?.version ?? 0;
  }

  async getStorageUsed(
    itemId: string,
    contentType: ShareableContentType
  ): Promise<number> {
    const versions = await this.getVersions(itemId, contentType, 1000);
    return versions.reduce((sum, v) => sum + v.sizeBytes, 0);
  }

  async getHistorySummary(
    itemId: string,
    contentType: ShareableContentType
  ): Promise<IVersionHistorySummary | null> {
    const versions = await this.getVersions(itemId, contentType, 1000);
    if (versions.length === 0) return null;

    return {
      itemId,
      contentType,
      currentVersion: versions[0].version,
      totalVersions: versions.length,
      oldestVersion: versions[versions.length - 1].createdAt,
      newestVersion: versions[0].createdAt,
      totalSizeBytes: versions.reduce((sum, v) => sum + v.sizeBytes, 0),
    };
  }

  // Test helpers
  clear(): void {
    this.versions.clear();
    this.versionCounter = 0;
  }

  seedVersion(version: IVersionSnapshot): void {
    this.versions.set(version.id, { ...version });
  }
}

// =============================================================================
// Mock Offline Queue Repository
// =============================================================================

export class MockOfflineQueueRepository {
  private messages: Map<string, IQueuedMessage> = new Map();
  private messageCounter = 0;

  async enqueue(
    targetPeerId: string,
    messageType: P2PMessageType,
    payload: string,
    options?: { expiryMs?: number; priority?: number }
  ): Promise<IQueuedMessage> {
    const now = new Date();
    const expiryMs = options?.expiryMs ?? 7 * 24 * 60 * 60 * 1000;
    const id = `queue-${++this.messageCounter}`;

    const message: IQueuedMessage = {
      id,
      targetPeerId,
      messageType,
      payload,
      queuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + expiryMs).toISOString(),
      attempts: 0,
      lastAttemptAt: null,
      status: 'pending',
      priority: options?.priority ?? 0,
      sizeBytes: payload.length,
    };

    this.messages.set(id, message);
    return message;
  }

  async getById(id: string): Promise<IQueuedMessage | null> {
    return this.messages.get(id) ?? null;
  }

  async getPendingForPeer(
    peerId: string,
    limit = 50
  ): Promise<IQueuedMessage[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.targetPeerId === peerId && m.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.queuedAt.localeCompare(b.queuedAt))
      .slice(0, limit);
  }

  async getAllPending(limit = 100): Promise<IQueuedMessage[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.queuedAt.localeCompare(b.queuedAt))
      .slice(0, limit);
  }

  async updateStatus(
    id: string,
    status: QueuedMessageStatus
  ): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    message.status = status;
    return true;
  }

  async incrementAttempts(id: string): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    message.attempts++;
    message.lastAttemptAt = new Date().toISOString();
    return true;
  }

  async markSending(id: string): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    message.status = 'sending';
    message.attempts++;
    message.lastAttemptAt = new Date().toISOString();
    return true;
  }

  async markSent(id: string): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    message.status = 'sent';
    return true;
  }

  async markFailed(id: string): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    message.status = 'failed';
    message.attempts++;
    message.lastAttemptAt = new Date().toISOString();
    return true;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  async deleteExpired(): Promise<number> {
    let count = 0;
    const entries = Array.from(this.messages.entries());
    for (const [id, message] of entries) {
      if (message.status === 'expired') {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  async deleteSent(): Promise<number> {
    let count = 0;
    const entries = Array.from(this.messages.entries());
    for (const [id, message] of entries) {
      if (message.status === 'sent') {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  async deleteForPeer(peerId: string): Promise<number> {
    let count = 0;
    const entries = Array.from(this.messages.entries());
    for (const [id, message] of entries) {
      if (message.targetPeerId === peerId) {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  async deleteOlderThan(date: string): Promise<number> {
    let count = 0;
    const entries = Array.from(this.messages.entries());
    for (const [id, message] of entries) {
      if (message.queuedAt < date) {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  async markExpired(): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    const allMessages = Array.from(this.messages.values());
    for (const message of allMessages) {
      if (message.status === 'pending' && message.expiresAt < now) {
        message.status = 'expired';
        count++;
      }
    }
    return count;
  }

  async getPeerSummary(peerId: string): Promise<IPeerQueueSummary> {
    const peerMessages = Array.from(this.messages.values()).filter(
      (m) => m.targetPeerId === peerId
    );
    const pending = peerMessages.filter((m) => m.status === 'pending');
    const failed = peerMessages.filter((m) => m.status === 'failed');
    const sent = peerMessages.filter((m) => m.status === 'sent');

    return {
      peerId,
      pendingCount: pending.length,
      pendingSizeBytes: pending.reduce((sum, m) => sum + m.sizeBytes, 0),
      oldestPending: pending.length > 0
        ? pending.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))[0].queuedAt
        : null,
      failedCount: failed.length,
      lastSuccessAt: sent.length > 0
        ? sent.sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))[0].queuedAt
        : null,
    };
  }

  async getStats(): Promise<IQueueStats> {
    const all = Array.from(this.messages.values());
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const byStatus: Record<QueuedMessageStatus, number> = {
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      expired: 0,
    };

    for (const m of all) {
      byStatus[m.status]++;
    }

    const targetPeers = new Set(all.map((m) => m.targetPeerId));
    const expiringSoon = all.filter(
      (m) =>
        m.status === 'pending' &&
        new Date(m.expiresAt) <= oneHourFromNow
    ).length;

    return {
      totalMessages: all.length,
      byStatus,
      totalSizeBytes: all.reduce((sum, m) => sum + m.sizeBytes, 0),
      targetPeerCount: targetPeers.size,
      expiringSoon,
    };
  }

  // Test helpers
  clear(): void {
    this.messages.clear();
    this.messageCounter = 0;
  }

  seedMessage(message: IQueuedMessage): void {
    this.messages.set(message.id, { ...message });
  }
}

// =============================================================================
// Mock Permission Service
// =============================================================================

export class MockPermissionService {
  private permissions: Map<string, { level: string; granteeId: string; scopeType: string; scopeId: string | null }> = new Map();
  private idCounter = 0;

  async grant(
    granteeId: string,
    scopeType: string,
    scopeId: string | null,
    level: string
  ): Promise<{ success: boolean; id: string }> {
    const id = `perm-mock-${++this.idCounter}`;
    this.permissions.set(id, { level, granteeId, scopeType, scopeId });
    return { success: true, id };
  }

  async revoke(id: string): Promise<{ success: boolean }> {
    return { success: this.permissions.delete(id) };
  }

  async check(
    granteeId: string,
    scopeType: string,
    scopeId: string | null
  ): Promise<{ hasAccess: boolean; level: string | null }> {
    const allPerms = Array.from(this.permissions.values());
    for (const perm of allPerms) {
      if (
        perm.granteeId === granteeId &&
        perm.scopeType === scopeType &&
        perm.scopeId === scopeId
      ) {
        return { hasAccess: true, level: perm.level };
      }
    }
    return { hasAccess: false, level: null };
  }

  async getGrantsForGrantee(granteeId: string): Promise<unknown[]> {
    return Array.from(this.permissions.entries())
      .filter(([_, p]) => p.granteeId === granteeId)
      .map(([id, p]) => ({ id, ...p }));
  }

  async getGrantsForItem(scopeType: string, scopeId: string): Promise<unknown[]> {
    return Array.from(this.permissions.entries())
      .filter(([_, p]) => p.scopeType === scopeType && p.scopeId === scopeId)
      .map(([id, p]) => ({ id, ...p }));
  }

  async revokeAllForItem(scopeType: string, scopeId: string): Promise<number> {
    let count = 0;
    const entries = Array.from(this.permissions.entries());
    for (const [id, perm] of entries) {
      if (perm.scopeType === scopeType && perm.scopeId === scopeId) {
        this.permissions.delete(id);
        count++;
      }
    }
    return count;
  }

  // Test helpers
  clear(): void {
    this.permissions.clear();
    this.idCounter = 0;
  }
}

// =============================================================================
// Mock P2P Transport
// =============================================================================

export class MockP2PTransport {
  private connected: Set<string> = new Set();
  private messageHandler: ((peerId: string, message: unknown) => void) | null = null;
  sentMessages: Array<{ peerId: string; message: unknown }> = [];

  async connect(peerId: string): Promise<boolean> {
    this.connected.add(peerId);
    return true;
  }

  async disconnect(peerId: string): Promise<void> {
    this.connected.delete(peerId);
  }

  async send(peerId: string, message: unknown): Promise<boolean> {
    this.sentMessages.push({ peerId, message });
    return this.connected.has(peerId);
  }

  isConnected(peerId: string): boolean {
    return this.connected.has(peerId);
  }

  onMessage(handler: (peerId: string, message: unknown) => void): void {
    this.messageHandler = handler;
  }

  // Test helper: simulate receiving a message
  simulateMessage(peerId: string, message: unknown): void {
    if (this.messageHandler) {
      this.messageHandler(peerId, message);
    }
  }

  // Test helpers
  clear(): void {
    this.connected.clear();
    this.sentMessages = [];
  }

  getConnectedPeers(): string[] {
    return Array.from(this.connected);
  }
}
