/**
 * Batch Migration Service
 * Handles large-scale migration of unit JSON files with parallel processing,
 * progress tracking, and comprehensive reporting
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnitJSONMigrationService, MigrationResult } from './UnitJSONMigrationService';

export interface BatchMigrationConfig {
  inputDirectory: string;
  outputDirectory: string;
  concurrency: number;
  filePattern: string;
  generateReports: boolean;
  validateResults: boolean;
  skipExisting: boolean;
  maxErrors: number;
}

export interface BatchMigrationProgress {
  totalFiles: number;
  processedFiles: number;
  successfulMigrations: number;
  failedMigrations: number;
  skippedFiles: number;
  startTime: Date;
  estimatedCompletion?: Date;
  currentFile?: string;
  errorRate: number;
}

export interface BatchMigrationResult {
  config: BatchMigrationConfig;
  progress: BatchMigrationProgress;
  results: IndividualMigrationResult[];
  summary: BatchMigrationSummary;
  reports: BatchMigrationReports;
  duration: number;
  success: boolean;
}

export interface IndividualMigrationResult {
  fileName: string;
  filePath: string;
  success: boolean;
  migrationResult?: MigrationResult;
  error?: string;
  processingTime: number;
  outputPath?: string;
  fileSize: number;
  unitType?: string;
  chassis?: string;
  model?: string;
}

export interface BatchMigrationSummary {
  totalFiles: number;
  successfulMigrations: number;
  failedMigrations: number;
  skippedFiles: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  equipmentMigrationStats: {
    totalEquipment: number;
    successfullyMapped: number;
    mappingIssues: number;
    coverageRate: number;
  };
  armorMigrationStats: {
    totalUnits: number;
    perfectAccuracy: number;
    accuracyRate: number;
  };
  criticalSlotStats: {
    totalSlots: number;
    systemComponents: number;
    equipmentPlacements: number;
    unknownSlots: number;
  };
  errorBreakdown: {
    [errorType: string]: number;
  };
  performanceMetrics: {
    filesPerSecond: number;
    avgMemoryUsage: number;
    peakMemoryUsage: number;
  };
}

export interface BatchMigrationReports {
  summary: string;
  detailedResults: string;
  errorReport: string;
  equipmentCoverage: string;
  armorValidation: string;
  criticalSlotAnalysis: string;
  performanceReport: string;
  qualityAssurance: string;
}

export class BatchMigrationService {
  private migrationService: UnitJSONMigrationService;
  private progressCallbacks: Array<(progress: BatchMigrationProgress) => void> = [];

  constructor() {
    this.migrationService = new UnitJSONMigrationService();
  }

  /**
   * Add a progress callback to track migration progress
   */
  onProgress(callback: (progress: BatchMigrationProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Process a directory of unit files with batch migration
   */
  async processDirectory(config: BatchMigrationConfig): Promise<BatchMigrationResult> {
    const startTime = new Date();
    
    // Validate configuration
    await this.validateConfig(config);
    
    // Discover files to process
    const filesToProcess = await this.discoverFiles(config);
    
    // Initialize progress tracking
    const progress: BatchMigrationProgress = {
      totalFiles: filesToProcess.length,
      processedFiles: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedFiles: 0,
      startTime,
      errorRate: 0
    };

    // Process files in parallel batches
    const results = await this.processFilesInBatches(filesToProcess, config, progress);

    // Generate comprehensive summary
    const summary = this.generateSummary(results, startTime);
    
    // Generate reports if requested
    const reports = config.generateReports 
      ? await this.generateReports(results, summary, config)
      : this.createEmptyReports();

    const duration = Date.now() - startTime.getTime();

    return {
      config,
      progress,
      results,
      summary,
      reports,
      duration,
      success: summary.failedMigrations === 0 || summary.failedMigrations < config.maxErrors
    };
  }

  /**
   * Process files in parallel batches for optimal performance
   */
  private async processFilesInBatches(
    files: string[],
    config: BatchMigrationConfig,
    progress: BatchMigrationProgress
  ): Promise<IndividualMigrationResult[]> {
    const results: IndividualMigrationResult[] = [];
    const concurrency = Math.min(config.concurrency, files.length);
    
    // Process files in concurrent batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (filePath) => {
        return this.processFile(filePath, config, progress);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          
          if (result.value.success) {
            progress.successfulMigrations++;
          } else {
            progress.failedMigrations++;
          }
        } else {
          // Handle promise rejection
          const fileName = path.basename(batch[index]);
          results.push({
            fileName,
            filePath: batch[index],
            success: false,
            error: `Promise rejected: ${result.reason}`,
            processingTime: 0,
            fileSize: 0
          });
          progress.failedMigrations++;
        }
        
        progress.processedFiles++;
        progress.errorRate = progress.failedMigrations / progress.processedFiles;
        
        // Update estimated completion
        if (progress.processedFiles > 0) {
          const elapsed = Date.now() - progress.startTime.getTime();
          const avgTimePerFile = elapsed / progress.processedFiles;
          const remainingFiles = progress.totalFiles - progress.processedFiles;
          progress.estimatedCompletion = new Date(Date.now() + (remainingFiles * avgTimePerFile));
        }

        // Notify progress callbacks
        this.notifyProgress(progress);
      });

      // Check if we should stop due to too many errors
      if (progress.failedMigrations >= config.maxErrors) {
        console.warn(`Stopping batch migration: Maximum errors (${config.maxErrors}) reached`);
        break;
      }
    }

    return results;
  }

  /**
   * Process a single file
   */
  private async processFile(
    filePath: string,
    config: BatchMigrationConfig,
    progress: BatchMigrationProgress
  ): Promise<IndividualMigrationResult> {
    const fileName = path.basename(filePath);
    const startTime = Date.now();
    
    progress.currentFile = fileName;

    try {
      // Check if output already exists and skip if configured
      const outputPath = this.getOutputPath(filePath, config);
      if (config.skipExisting && await this.fileExists(outputPath)) {
        progress.skippedFiles++;
        return {
          fileName,
          filePath,
          success: true,
          processingTime: Date.now() - startTime,
          fileSize: 0,
          outputPath
        };
      }

      // Read and parse input file
      const fileContent = await fs.readFile(filePath, 'utf8');
      const fileStats = await fs.stat(filePath);
      const jsonUnit = JSON.parse(fileContent);

      // Perform migration
      const migrationResult = this.migrationService.migrateUnit(jsonUnit);

      // Write output if migration successful
      if (migrationResult.success && config.outputDirectory) {
        await this.ensureDirectoryExists(path.dirname(outputPath));
        await fs.writeFile(outputPath, JSON.stringify(migrationResult, null, 2));
      }

      return {
        fileName,
        filePath,
        success: migrationResult.success,
        migrationResult,
        processingTime: Date.now() - startTime,
        outputPath: migrationResult.success ? outputPath : undefined,
        fileSize: fileStats.size,
        unitType: jsonUnit.config || 'Unknown',
        chassis: jsonUnit.chassis,
        model: jsonUnit.model
      };

    } catch (error) {
      return {
        fileName,
        filePath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        fileSize: 0
      };
    }
  }

  /**
   * Discover files to process based on configuration
   */
  private async discoverFiles(config: BatchMigrationConfig): Promise<string[]> {
    const files: string[] = [];
    
    const discoverRecursive = async (dir: string): Promise<void> => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await discoverRecursive(itemPath);
        } else if (stats.isFile() && this.matchesPattern(item, config.filePattern)) {
          files.push(itemPath);
        }
      }
    };

    await discoverRecursive(config.inputDirectory);
    return files.sort(); // Sort for consistent processing order
  }

  /**
   * Generate comprehensive migration summary
   */
  private generateSummary(
    results: IndividualMigrationResult[],
    startTime: Date
  ): BatchMigrationSummary {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const duration = Date.now() - startTime.getTime();

    // Equipment migration statistics
    let totalEquipment = 0;
    let successfullyMapped = 0;
    let mappingIssues = 0;

    // Armor migration statistics  
    let perfectAccuracy = 0;

    // Critical slot statistics
    let totalSlots = 0;
    let systemComponents = 0;
    let equipmentPlacements = 0;
    let unknownSlots = 0;

    // Error breakdown
    const errorBreakdown: { [errorType: string]: number } = {};

    successful.forEach(result => {
      if (result.migrationResult) {
        // Equipment stats
        const equipment = result.migrationResult.equipment || [];
        totalEquipment += equipment.length;
        successfullyMapped += equipment.length;
        mappingIssues += result.migrationResult.equipmentMappingIssues?.length || 0;

        // Armor stats
        if (result.migrationResult.armor && result.migrationResult.armorMappingIssues?.length === 0) {
          perfectAccuracy++;
        }

        // Critical slot stats
        const critSlots = result.migrationResult.criticalSlots;
        if (critSlots) {
          totalSlots += critSlots.criticalSlots.length;
          systemComponents += critSlots.systemComponents.length;
          equipmentPlacements += critSlots.equipmentPlacements.length;
          unknownSlots += result.migrationResult.criticalSlotMappingIssues?.length || 0;
        }
      }
    });

    // Categorize errors
    failed.forEach(result => {
      const errorType = this.categorizeError(result.error || 'Unknown error');
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    });

    return {
      totalFiles: results.length,
      successfulMigrations: successful.length,
      failedMigrations: failed.length,
      skippedFiles: results.filter(r => r.processingTime === 0).length,
      averageProcessingTime: totalProcessingTime / results.length,
      totalProcessingTime,
      equipmentMigrationStats: {
        totalEquipment,
        successfullyMapped,
        mappingIssues,
        coverageRate: totalEquipment > 0 ? successfullyMapped / totalEquipment : 0
      },
      armorMigrationStats: {
        totalUnits: successful.length,
        perfectAccuracy,
        accuracyRate: successful.length > 0 ? perfectAccuracy / successful.length : 0
      },
      criticalSlotStats: {
        totalSlots,
        systemComponents,
        equipmentPlacements,
        unknownSlots
      },
      errorBreakdown,
      performanceMetrics: {
        filesPerSecond: results.length / (duration / 1000),
        avgMemoryUsage: 0, // Could be implemented with process monitoring
        peakMemoryUsage: 0
      }
    };
  }

  /**
   * Utility methods
   */
  private async validateConfig(config: BatchMigrationConfig): Promise<void> {
    if (!await this.directoryExists(config.inputDirectory)) {
      throw new Error(`Input directory does not exist: ${config.inputDirectory}`);
    }
    
    if (config.outputDirectory && !await this.directoryExists(path.dirname(config.outputDirectory))) {
      await fs.mkdir(config.outputDirectory, { recursive: true });
    }
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(fileName);
  }

  private getOutputPath(inputPath: string, config: BatchMigrationConfig): string {
    const relativePath = path.relative(config.inputDirectory, inputPath);
    const outputFileName = path.basename(relativePath, '.json') + '.migrated.json';
    return path.join(config.outputDirectory, path.dirname(relativePath), outputFileName);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  }

  private categorizeError(error: string): string {
    if (error.includes('JSON')) return 'JSON Parse Error';
    if (error.includes('file')) return 'File System Error';
    if (error.includes('migration')) return 'Migration Error';
    if (error.includes('validation')) return 'Validation Error';
    return 'Unknown Error';
  }

  private notifyProgress(progress: BatchMigrationProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.warn('Progress callback error:', error);
      }
    });
  }

  private async generateReports(
    results: IndividualMigrationResult[],
    summary: BatchMigrationSummary,
    config: BatchMigrationConfig
  ): Promise<BatchMigrationReports> {
    // Implementation would generate detailed reports
    // For now, return placeholder structure
    return this.createEmptyReports();
  }

  private createEmptyReports(): BatchMigrationReports {
    return {
      summary: '',
      detailedResults: '',
      errorReport: '',
      equipmentCoverage: '',
      armorValidation: '',
      criticalSlotAnalysis: '',
      performanceReport: '',
      qualityAssurance: ''
    };
  }
}

export default BatchMigrationService;