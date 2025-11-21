/**
 * Local Storage Service for BattleTech Editor Desktop App
 * 
 * Provides local file storage with compression, encryption, and caching
 * for the self-hosted BattleTech Editor application.
 * 
 * Features:
 * - JSON data storage with type safety
 * - Optional compression for large files
 * - Optional encryption for sensitive data
 * - Atomic writes for data integrity
 * - Intelligent caching with TTL
 * - Automatic cleanup and optimization
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

// Service interfaces
import { IService } from '../../../src/services/core/types/BaseTypes';
import { Result } from '../../../src/services/core/types/BaseTypes';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Configuration for local storage service
 */
interface ILocalStorageConfig {
  readonly dataPath: string;
  readonly enableCompression: boolean;
  readonly enableEncryption: boolean;
  readonly maxFileSize: number;
  readonly cacheTtl: number;
  readonly cleanupInterval: number;
  readonly encryptionKey?: string;
}

/**
 * Storage metadata for files
 */
interface IStorageMetadata {
  readonly key: string;
  readonly size: number;
  readonly compressed: boolean;
  readonly encrypted: boolean;
  readonly checksum: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly accessedAt: Date;
}

/**
 * Cached storage entry
 */
interface ICachedEntry<T = any> {
  readonly data: T;
  readonly metadata: IStorageMetadata;
  readonly cachedAt: Date;
  readonly ttl: number;
}

/**
 * Local storage service implementation
 */
export class LocalStorageService implements IService {
  private readonly config: ILocalStorageConfig;
  private readonly cache = new Map<string, ICachedEntry>();
  private readonly metadataCache = new Map<string, IStorageMetadata>();
  private initialized = false;
  private cleanupTimer: NodeJS.Timer | null = null;

  constructor(config: Partial<ILocalStorageConfig>) {
    this.config = {
      dataPath: config.dataPath || './data',
      enableCompression: config.enableCompression ?? true,
      enableEncryption: config.enableEncryption ?? false,
      maxFileSize: config.maxFileSize || 5 * 1024 * 1024, // 5MB
      cacheTtl: config.cacheTtl || 300000, // 5 minutes
      cleanupInterval: config.cleanupInterval || 600000, // 10 minutes
      encryptionKey: config.encryptionKey || this.generateEncryptionKey()
    };
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing LocalStorageService...');

      // Create data directory if it doesn't exist
      await fs.mkdir(this.config.dataPath, { recursive: true });

      // Create metadata directory
      const metadataPath = path.join(this.config.dataPath, '.metadata');
      await fs.mkdir(metadataPath, { recursive: true });

      // Load existing metadata
      await this.loadMetadata();

      // Start cleanup timer
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch(console.error);
      }, this.config.cleanupInterval);

      this.initialized = true;
      console.log('✅ LocalStorageService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LocalStorageService:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear expired cache entries
    this.clearExpiredCache();

    // Save metadata
    await this.saveMetadata();

    console.log('🧹 LocalStorageService cleanup completed');
  }

  /**
   * Store data with a key
   */
  async set<T>(key: string, data: T): Promise<Result<void, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      // Serialize data
      const serialized = JSON.stringify(data);
      const buffer = Buffer.from(serialized, 'utf8');

      // Check file size
      if (buffer.length > this.config.maxFileSize) {
        return Result.error(`Data too large: ${buffer.length} bytes (max: ${this.config.maxFileSize})`);
      }

      // Process data (compress/encrypt)
      const processedData = await this.processData(buffer, true);

      // Generate file path
      const filePath = this.getFilePath(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write data atomically
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, processedData);
      await fs.rename(tempPath, filePath);

      // Update metadata
      const metadata: IStorageMetadata = {
        key,
        size: buffer.length,
        compressed: this.config.enableCompression,
        encrypted: this.config.enableEncryption,
        checksum: this.calculateChecksum(buffer),
        createdAt: new Date(),
        updatedAt: new Date(),
        accessedAt: new Date()
      };

      this.metadataCache.set(key, metadata);

      // Update cache
      this.cache.set(key, {
        data,
        metadata,
        cachedAt: new Date(),
        ttl: this.config.cacheTtl
      });

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to store data: ${message}`);
    }
  }

  /**
   * Retrieve data by key
   */
  async get<T>(key: string): Promise<Result<T | null, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      // Check cache first
      const cached = this.cache.get(key);
      if (cached && !this.isCacheExpired(cached)) {
        // Update access time
        const metadata = this.metadataCache.get(key);
        if (metadata) {
          this.metadataCache.set(key, {
            ...metadata,
            accessedAt: new Date()
          });
        }
        return Result.success(cached.data);
      }

      // Load from file
      const filePath = this.getFilePath(key);
      
      try {
        const processedData = await fs.readFile(filePath);
        const buffer = await this.processData(processedData, false);
        
        // Deserialize data
        const serialized = buffer.toString('utf8');
        const data = JSON.parse(serialized);

        // Update metadata access time
        const metadata = this.metadataCache.get(key);
        if (metadata) {
          this.metadataCache.set(key, {
            ...metadata,
            accessedAt: new Date()
          });
        }

        // Update cache
        if (metadata) {
          this.cache.set(key, {
            data,
            metadata,
            cachedAt: new Date(),
            ttl: this.config.cacheTtl
          });
        }

        return Result.success(data);
      } catch (fileError) {
        // Type-safe error handling
        if (this.isFileNotFoundError(fileError)) {
          return Result.success(null);
        }
        throw fileError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to retrieve data: ${message}`);
    }
  }

  /**
   * Delete data by key
   */
  async delete(key: string): Promise<Result<boolean, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      const filePath = this.getFilePath(key);
      
      try {
        await fs.unlink(filePath);
        
        // Remove from caches
        this.cache.delete(key);
        this.metadataCache.delete(key);
        
        return Result.success(true);
      } catch (error) {
        if (this.isFileNotFoundError(error)) {
          return Result.success(false);
        }
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to delete data: ${message}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<Result<boolean, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      // Check cache first
      if (this.cache.has(key)) {
        return Result.success(true);
      }

      // Check file system
      const filePath = this.getFilePath(key);
      try {
        await fs.access(filePath);
        return Result.success(true);
      } catch {
        return Result.success(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to check existence: ${message}`);
    }
  }

  /**
   * List all keys
   */
  async keys(): Promise<Result<string[], string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      const keys = Array.from(this.metadataCache.keys());
      return Result.success(keys);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to list keys: ${message}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<Result<IStorageStats, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      const entries = Array.from(this.metadataCache.values());
      const totalSize = entries.reduce((sum, meta) => sum + meta.size, 0);
      const compressedEntries = entries.filter(meta => meta.compressed).length;
      const encryptedEntries = entries.filter(meta => meta.encrypted).length;

      const stats: IStorageStats = {
        totalEntries: entries.length,
        totalSize,
        compressedEntries,
        encryptedEntries,
        cacheSize: this.cache.size,
        dataPath: this.config.dataPath
      };

      return Result.success(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to get stats: ${message}`);
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<Result<void, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      // Clear all files
      const entries = await fs.readdir(this.config.dataPath);
      for (const entry of entries) {
        if (entry !== '.metadata') {
          const entryPath = path.join(this.config.dataPath, entry);
          const stat = await fs.stat(entryPath);
          if (stat.isDirectory()) {
            await fs.rmdir(entryPath, { recursive: true });
          } else {
            await fs.unlink(entryPath);
          }
        }
      }

      // Clear caches
      this.cache.clear();
      this.metadataCache.clear();

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to clear data: ${message}`);
    }
  }

  /**
   * Process data (compress/decompress, encrypt/decrypt)
   */
  private async processData(buffer: Buffer, isStoring: boolean): Promise<Buffer> {
    let result = buffer;

    if (isStoring) {
      // Compress if enabled
      if (this.config.enableCompression) {
        result = await gzip(result);
      }

      // Encrypt if enabled
      if (this.config.enableEncryption && this.config.encryptionKey) {
        result = this.encrypt(result);
      }
    } else {
      // Decrypt if enabled
      if (this.config.enableEncryption && this.config.encryptionKey) {
        result = this.decrypt(result);
      }

      // Decompress if enabled
      if (this.config.enableCompression) {
        result = await gunzip(result);
      }
    }

    return result;
  }

  /**
   * Encrypt data
   */
  private encrypt(buffer: Buffer): Buffer {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt data
   */
  private decrypt(buffer: Buffer): Buffer {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const iv = buffer.slice(0, 16);
    const encrypted = buffer.slice(16);
    const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get file path for key
   */
  private getFilePath(key: string): string {
    // Create safe filename from key
    const safeKey = key.replace(/[^a-zA-Z0-9.-]/g, '_');
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.config.dataPath, `${safeKey}-${hash}.json`);
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: ICachedEntry): boolean {
    return Date.now() - entry.cachedAt.getTime() > entry.ttl;
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.cachedAt.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Load metadata from disk
   */
  private async loadMetadata(): Promise<void> {
    try {
      const metadataPath = path.join(this.config.dataPath, '.metadata', 'index.json');
      const data = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(data);
      
      for (const [key, meta] of Object.entries(metadata)) {
        this.metadataCache.set(key, meta as IStorageMetadata);
      }
    } catch (error) {
      // Metadata file doesn't exist or is corrupted, start fresh
      console.log('No existing metadata found, starting fresh');
    }
  }

  /**
   * Save metadata to disk
   */
  private async saveMetadata(): Promise<void> {
    try {
      const metadataPath = path.join(this.config.dataPath, '.metadata', 'index.json');
      const metadata = Object.fromEntries(this.metadataCache);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to save metadata:', error);
    }
  }

  /**
   * Type-safe error checking for file operations
   */
  private isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error && 
           'code' in error && 
           (error as NodeJS.ErrnoException).code === 'ENOENT';
  }
}

/**
 * Storage statistics interface
 */
interface IStorageStats {
  readonly totalEntries: number;
  readonly totalSize: number;
  readonly compressedEntries: number;
  readonly encryptedEntries: number;
  readonly cacheSize: number;
  readonly dataPath: string;
}

export type { ILocalStorageConfig, IStorageMetadata, IStorageStats };