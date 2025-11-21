/**
 * Backup Service for BattleTech Editor Desktop App
 * 
 * Provides automatic backup and restoration capabilities
 * for the self-hosted BattleTech Editor application.
 * 
 * Features:
 * - Automatic scheduled backups
 * - Compressed backup archives
 * - Backup rotation and cleanup
 * - Incremental and full backups
 * - Data integrity verification
 * - Restoration with rollback support
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

// Service interfaces
import { IService } from '../../../src/services/core/types/BaseTypes';
import { Result } from '../../../src/services/core/types/BaseTypes';

/**
 * Configuration for backup service
 */
interface IBackupConfig {
  readonly dataPath: string;
  readonly backupPath: string;
  readonly maxBackups: number;
  readonly compressionLevel: number;
  readonly enableIncremental: boolean;
  readonly verifyIntegrity: boolean;
  readonly excludePatterns: string[];
}

/**
 * Backup metadata
 */
interface IBackupMetadata {
  readonly id: string;
  readonly type: 'full' | 'incremental';
  readonly createdAt: Date;
  readonly size: number;
  readonly checksum: string;
  readonly files: string[];
  readonly parent?: string; // For incremental backups
}

/**
 * Backup restoration result
 */
interface IRestoreResult {
  readonly success: boolean;
  readonly restoredFiles: string[];
  readonly errors: string[];
  readonly duration: number;
}

/**
 * Backup service implementation
 */
export class BackupService implements IService {
  private readonly config: IBackupConfig;
  private readonly metadataPath: string;
  private initialized = false;
  private backupInProgress = false;

  constructor(config: Partial<IBackupConfig>) {
    this.config = {
      dataPath: config.dataPath || './data',
      backupPath: config.backupPath || './backups',
      maxBackups: config.maxBackups || 10,
      compressionLevel: config.compressionLevel || 6,
      enableIncremental: config.enableIncremental ?? true,
      verifyIntegrity: config.verifyIntegrity ?? true,
      excludePatterns: config.excludePatterns || [
        '*.tmp',
        '*.temp',
        '*.log',
        '.DS_Store',
        'Thumbs.db'
      ]
    };

    this.metadataPath = path.join(this.config.backupPath, '.metadata');
  }

  /**
   * Initialize the backup service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing BackupService...');

      // Create backup directory if it doesn't exist
      await fs.mkdir(this.config.backupPath, { recursive: true });
      await fs.mkdir(this.metadataPath, { recursive: true });

      // Validate existing backups
      await this.validateExistingBackups();

      this.initialized = true;
      console.log('✅ BackupService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize BackupService:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 BackupService cleanup completed');
  }

  /**
   * Create a backup
   */
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<Result<string, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      if (this.backupInProgress) {
        return Result.error('Backup already in progress');
      }

      this.backupInProgress = true;
      console.log(`🔄 Creating ${type} backup...`);

      const startTime = Date.now();
      const backupId = this.generateBackupId();
      const backupFileName = `${backupId}.tar.gz`;
      const backupFilePath = path.join(this.config.backupPath, backupFileName);

      // Get files to backup
      const filesToBackup = await this.getFilesToBackup(type);
      
      if (filesToBackup.length === 0) {
        return Result.error('No files to backup');
      }

      // Create backup archive
      await this.createBackupArchive(backupFilePath, filesToBackup);

      // Calculate size and checksum
      const stats = await fs.stat(backupFilePath);
      const checksum = await this.calculateFileChecksum(backupFilePath);

      // Create metadata
      const metadata: IBackupMetadata = {
        id: backupId,
        type,
        createdAt: new Date(),
        size: stats.size,
        checksum,
        files: filesToBackup.map(f => path.relative(this.config.dataPath, f)),
        parent: type === 'incremental' ? await this.getLatestBackupId() : undefined
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      // Cleanup old backups
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
      console.log(`✅ Backup created successfully: ${backupFileName} (${this.formatFileSize(stats.size)}, ${duration}ms)`);

      return Result.success(backupFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to create backup: ${message}`);
    } finally {
      this.backupInProgress = false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupPath: string): Promise<Result<IRestoreResult, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      console.log(`🔄 Restoring backup: ${backupPath}`);
      const startTime = Date.now();

      // Verify backup integrity
      const metadata = await this.loadBackupMetadata(backupPath);
      if (!metadata) {
        return Result.error('Backup metadata not found');
      }

      if (this.config.verifyIntegrity) {
        const isValid = await this.verifyBackupIntegrity(backupPath, metadata);
        if (!isValid) {
          return Result.error('Backup integrity verification failed');
        }
      }

      // Create backup of current state before restoration
      const currentStateBackup = await this.createBackup('full');
      if (!currentStateBackup.success) {
        console.warn('Failed to create pre-restoration backup:', currentStateBackup.error);
      }

      // Extract backup
      const extractPath = path.join(this.config.backupPath, '.temp', metadata.id);
      await fs.mkdir(extractPath, { recursive: true });

      const result = await this.extractBackupArchive(backupPath, extractPath);
      if (!result.success) {
        return Result.error(result.error || 'Failed to extract backup');
      }

      // Restore files
      const restoredFiles: string[] = [];
      const errors: string[] = [];

      for (const relativePath of metadata.files) {
        try {
          const sourcePath = path.join(extractPath, relativePath);
          const targetPath = path.join(this.config.dataPath, relativePath);

          // Create target directory if needed
          await fs.mkdir(path.dirname(targetPath), { recursive: true });

          // Copy file
          await fs.copyFile(sourcePath, targetPath);
          restoredFiles.push(relativePath);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to restore ${relativePath}: ${message}`);
        }
      }

      // Cleanup temp directory
      await fs.rm(extractPath, { recursive: true, force: true });

      const duration = Date.now() - startTime;
      const restoreResult: IRestoreResult = {
        success: errors.length === 0,
        restoredFiles,
        errors,
        duration
      };

      console.log(`✅ Backup restored: ${restoredFiles.length} files, ${errors.length} errors, ${duration}ms`);
      return Result.success(restoreResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to restore backup: ${message}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Result<IBackupMetadata[], string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      const backups: IBackupMetadata[] = [];
      const backupFiles = await fs.readdir(this.config.backupPath);

      for (const file of backupFiles) {
        if (file.endsWith('.tar.gz')) {
          const backupPath = path.join(this.config.backupPath, file);
          const metadata = await this.loadBackupMetadata(backupPath);
          if (metadata) {
            backups.push(metadata);
          }
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return Result.success(backups);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to list backups: ${message}`);
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<Result<void, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      const backupFileName = `${backupId}.tar.gz`;
      const backupFilePath = path.join(this.config.backupPath, backupFileName);
      const metadataFilePath = path.join(this.metadataPath, `${backupId}.json`);

      // Delete backup file
      await fs.unlink(backupFilePath);

      // Delete metadata file
      await fs.unlink(metadataFilePath);

      console.log(`🗑️ Backup deleted: ${backupId}`);
      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to delete backup: ${message}`);
    }
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<Result<IBackupStats, string>> {
    try {
      if (!this.initialized) {
        return Result.error('Service not initialized');
      }

      const backupsResult = await this.listBackups();
      if (!backupsResult.success) {
        return Result.error(backupsResult.error);
      }

      const backups = backupsResult.data;
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const fullBackups = backups.filter(b => b.type === 'full').length;
      const incrementalBackups = backups.filter(b => b.type === 'incremental').length;

      const stats: IBackupStats = {
        totalBackups: backups.length,
        totalSize,
        fullBackups,
        incrementalBackups,
        latestBackup: backups[0]?.createdAt,
        backupPath: this.config.backupPath
      };

      return Result.success(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to get backup stats: ${message}`);
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `backup-${timestamp}-${random}`;
  }

  /**
   * Get files to backup based on type
   */
  private async getFilesToBackup(type: 'full' | 'incremental'): Promise<string[]> {
    const allFiles = await this.getAllFiles(this.config.dataPath);
    const filteredFiles = allFiles.filter(file => !this.shouldExcludeFile(file));

    if (type === 'full') {
      return filteredFiles;
    }

    // For incremental backups, only include files changed since last backup
    const lastBackupId = await this.getLatestBackupId();
    if (!lastBackupId) {
      return filteredFiles; // No previous backup, do full backup
    }

    const lastBackupMetadata = await this.loadBackupMetadata(
      path.join(this.config.backupPath, `${lastBackupId}.tar.gz`)
    );
    if (!lastBackupMetadata) {
      return filteredFiles; // Can't find last backup metadata, do full backup
    }

    const changedFiles: string[] = [];
    for (const file of filteredFiles) {
      const relativePath = path.relative(this.config.dataPath, file);
      if (!lastBackupMetadata.files.includes(relativePath)) {
        changedFiles.push(file);
      } else {
        // Check if file was modified since last backup
        const stats = await fs.stat(file);
        if (stats.mtime > lastBackupMetadata.createdAt) {
          changedFiles.push(file);
        }
      }
    }

    return changedFiles;
  }

  /**
   * Get all files recursively
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir);

    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      const stats = await fs.stat(entryPath);

      if (stats.isDirectory()) {
        const subFiles = await this.getAllFiles(entryPath);
        files.push(...subFiles);
      } else {
        files.push(entryPath);
      }
    }

    return files;
  }

  /**
   * Check if file should be excluded
   */
  private shouldExcludeFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return this.config.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(fileName);
    });
  }

  /**
   * Create backup archive
   */
  private async createBackupArchive(backupPath: string, files: string[]): Promise<void> {
    const writeStream = createWriteStream(backupPath);
    const gzipStream = createGzip({ level: this.config.compressionLevel });
    
    // Simple tar-like archive format for cross-platform compatibility
    const archiveData = JSON.stringify({
      version: '1.0',
      files: await Promise.all(files.map(async (file) => {
        const relativePath = path.relative(this.config.dataPath, file);
        const content = await fs.readFile(file);
        return {
          path: relativePath,
          content: content.toString('base64'),
          size: content.length
        };
      }))
    });

    await pipeline(
      async function* () {
        yield Buffer.from(archiveData);
      },
      gzipStream,
      writeStream
    );
  }

  /**
   * Extract backup archive
   */
  private async extractBackupArchive(backupPath: string, extractPath: string): Promise<Result<void, string>> {
    try {
      const readStream = createReadStream(backupPath);
      const gunzipStream = createGunzip();
      
      let data = '';
      gunzipStream.on('data', (chunk) => {
        data += chunk.toString();
      });

      await pipeline(readStream, gunzipStream);

      const archive = JSON.parse(data);
      
      for (const file of archive.files) {
        const filePath = path.join(extractPath, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const content = Buffer.from(file.content, 'base64');
        await fs.writeFile(filePath, content);
      }

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.error(`Failed to extract archive: ${message}`);
    }
  }

  /**
   * Calculate file checksum
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(backupPath: string, metadata: IBackupMetadata): Promise<boolean> {
    try {
      const checksum = await this.calculateFileChecksum(backupPath);
      return checksum === metadata.checksum;
    } catch (error) {
      console.error('Backup integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Save backup metadata
   */
  private async saveBackupMetadata(metadata: IBackupMetadata): Promise<void> {
    const metadataFilePath = path.join(this.metadataPath, `${metadata.id}.json`);
    await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Load backup metadata
   */
  private async loadBackupMetadata(backupPath: string): Promise<IBackupMetadata | null> {
    try {
      const backupId = path.basename(backupPath, '.tar.gz');
      const metadataFilePath = path.join(this.metadataPath, `${backupId}.json`);
      const data = await fs.readFile(metadataFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get latest backup ID
   */
  private async getLatestBackupId(): Promise<string | null> {
    try {
      const backupsResult = await this.listBackups();
      if (!backupsResult.success || backupsResult.data.length === 0) {
        return null;
      }
      return backupsResult.data[0].id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupsResult = await this.listBackups();
      if (!backupsResult.success) {
        return;
      }

      const backups = backupsResult.data;
      if (backups.length <= this.config.maxBackups) {
        return;
      }

      // Delete oldest backups
      const backupsToDelete = backups.slice(this.config.maxBackups);
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      console.log(`🧹 Cleaned up ${backupsToDelete.length} old backups`);
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Validate existing backups
   */
  private async validateExistingBackups(): Promise<void> {
    try {
      const backupsResult = await this.listBackups();
      if (!backupsResult.success) {
        return;
      }

      const backups = backupsResult.data;
      const corruptedBackups: string[] = [];

      for (const backup of backups) {
        const backupPath = path.join(this.config.backupPath, `${backup.id}.tar.gz`);
        const isValid = await this.verifyBackupIntegrity(backupPath, backup);
        if (!isValid) {
          corruptedBackups.push(backup.id);
        }
      }

      if (corruptedBackups.length > 0) {
        console.warn(`⚠️ Found ${corruptedBackups.length} corrupted backups: ${corruptedBackups.join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to validate existing backups:', error);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

/**
 * Backup statistics interface
 */
interface IBackupStats {
  readonly totalBackups: number;
  readonly totalSize: number;
  readonly fullBackups: number;
  readonly incrementalBackups: number;
  readonly latestBackup?: Date;
  readonly backupPath: string;
}

export type { IBackupConfig, IBackupMetadata, IRestoreResult, IBackupStats };