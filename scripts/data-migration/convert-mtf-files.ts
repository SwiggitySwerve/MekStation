#!/usr/bin/env npx ts-node
/**
 * MTF File Conversion CLI
 * 
 * Orchestrates the conversion of MTF files to JSON format compatible with
 * the megamek-web application. Wraps the Python converter with TypeScript
 * post-processing for validation and equipment resolution.
 * 
 * Usage:
 *   npm run convert:mtf -- --source /path/to/mekfiles --output public/data/units
 *   
 *   Options:
 *     --source, -s    Source directory containing MTF files (required)
 *     --output, -o    Output directory for JSON files (required)
 *     --era, -e       Filter by era folder name
 *     --validate, -v  Validate converted files
 *     --dry-run       Show what would be converted without writing files
 *     --generate-index Generate index.json after conversion
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

interface ConversionArgs {
  source: string;
  output: string;
  era?: string;
  validate: boolean;
  dryRun: boolean;
  generateIndex: boolean;
}

interface ConversionResult {
  success: boolean;
  filesConverted: number;
  filesFailed: number;
  validationErrors: string[];
}

/**
 * Parse command line arguments
 */
function parseArgs(): ConversionArgs {
  const args = process.argv.slice(2);
  const result: ConversionArgs = {
    source: '',
    output: '',
    validate: false,
    dryRun: false,
    generateIndex: true,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    if (arg === '--source' || arg === '-s') {
      result.source = nextArg;
      i++;
    } else if (arg === '--output' || arg === '-o') {
      result.output = nextArg;
      i++;
    } else if (arg === '--era' || arg === '-e') {
      result.era = nextArg;
      i++;
    } else if (arg === '--validate' || arg === '-v') {
      result.validate = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--generate-index' || arg === '-i') {
      result.generateIndex = true;
    } else if (arg === '--no-index') {
      result.generateIndex = false;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  
  // Validate required arguments
  if (!result.source || !result.output) {
    console.error('Error: --source and --output are required');
    printUsage();
    process.exit(1);
  }
  
  return result;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
MTF File Conversion CLI

Usage:
  npm run convert:mtf -- --source <path> --output <path> [options]

Required:
  --source, -s <path>    Source directory containing MTF files
  --output, -o <path>    Output directory for JSON files

Options:
  --era, -e <name>       Filter by era folder name (e.g., "3039u")
  --validate, -v         Validate converted files using TypeScript validation
  --dry-run              Show what would be converted without writing files
  --generate-index, -i   Generate index.json after conversion (default: true)
  --no-index             Skip index generation
  --help, -h             Show this help message

Examples:
  # Convert all 3039 era mechs
  npm run convert:mtf -- -s /path/to/mekfiles/meks -o public/data/units/battlemechs -e 3039u

  # Validate existing conversions
  npm run convert:mtf -- -s /path/to/mekfiles -o public/data/units --validate

  # Dry run to see what would be converted
  npm run convert:mtf -- -s /path/to/mekfiles -o public/data/units --dry-run
`);
}

/**
 * Run the Python converter
 */
async function runPythonConverter(args: ConversionArgs): Promise<ConversionResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../megameklab-conversion/mtf_converter.py');
    
    const pythonArgs = [
      scriptPath,
      '--source', args.source,
      '--output', args.output,
    ];
    
    if (args.era) {
      pythonArgs.push('--era', args.era);
    }
    
    if (args.generateIndex) {
      pythonArgs.push('--generate-index');
    }
    
    console.log(`\nRunning MTF converter...`);
    console.log(`  Source: ${args.source}`);
    console.log(`  Output: ${args.output}`);
    if (args.era) console.log(`  Era filter: ${args.era}`);
    console.log('');
    
    if (args.dryRun) {
      console.log('[Dry run mode - no files will be written]');
      resolve({
        success: true,
        filesConverted: 0,
        filesFailed: 0,
        validationErrors: [],
      });
      return;
    }
    
    const python = spawn('python', pythonArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    
    python.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    
    python.on('close', (code: number) => {
      // Parse output for success/failure counts
      const successMatch = stdout.match(/Successful:\s*(\d+)/);
      const failedMatch = stdout.match(/Failed:\s*(\d+)/);
      
      resolve({
        success: code === 0,
        filesConverted: successMatch ? parseInt(successMatch[1], 10) : 0,
        filesFailed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
        validationErrors: [],
      });
    });
    
    python.on('error', (error: Error) => {
      console.error('Failed to run Python converter:', error);
      resolve({
        success: false,
        filesConverted: 0,
        filesFailed: 1,
        validationErrors: [`Python error: ${error.message}`],
      });
    });
  });
}

/**
 * Validate converted files using TypeScript validation
 */
async function validateConvertedFiles(outputDir: string): Promise<string[]> {
  const errors: string[] = [];
  
  console.log('\nValidating converted files...');
  
  const walkDir = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (entry.name.endsWith('.json') && entry.name !== 'index.json') {
        files.push(fullPath);
      }
    }
    
    return files;
  };
  
  const jsonFiles = walkDir(outputDir);
  console.log(`Found ${jsonFiles.length} JSON files to validate`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const file of jsonFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(content);
      
      // Basic validation
      const requiredFields = ['id', 'chassis', 'model', 'tonnage', 'engine', 'armor'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        errors.push(`${path.basename(file)}: Missing fields: ${missingFields.join(', ')}`);
        invalidCount++;
      } else {
        validCount++;
      }
    } catch (e) {
      errors.push(`${path.basename(file)}: Parse error: ${e}`);
      invalidCount++;
    }
  }
  
  console.log(`  Valid: ${validCount}`);
  console.log(`  Invalid: ${invalidCount}`);
  
  return errors;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('MTF to JSON Conversion Tool');
  console.log('='.repeat(60));
  
  const args = parseArgs();
  
  // Verify source directory exists
  if (!fs.existsSync(args.source)) {
    console.error(`Error: Source directory not found: ${args.source}`);
    process.exit(1);
  }
  
  // Run Python converter
  const result = await runPythonConverter(args);
  
  if (!result.success) {
    console.error('\nConversion failed!');
    process.exit(1);
  }
  
  // Validate if requested
  if (args.validate && !args.dryRun) {
    const validationErrors = await validateConvertedFiles(args.output);
    result.validationErrors = validationErrors;
    
    if (validationErrors.length > 0) {
      console.log('\nValidation errors:');
      validationErrors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
      if (validationErrors.length > 10) {
        console.log(`  ... and ${validationErrors.length - 10} more errors`);
      }
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Conversion Summary');
  console.log('='.repeat(60));
  console.log(`  Files converted: ${result.filesConverted}`);
  console.log(`  Files failed: ${result.filesFailed}`);
  if (result.validationErrors.length > 0) {
    console.log(`  Validation errors: ${result.validationErrors.length}`);
  }
  console.log('');
  
  if (result.filesFailed > 0 || result.validationErrors.length > 0) {
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

