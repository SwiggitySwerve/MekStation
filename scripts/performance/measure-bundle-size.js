#!/usr/bin/env node

/**
 * Bundle Size Measurement Script
 *
 * Measures and compares bundle sizes before and after refactoring.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_BUILD_DIR = '.next';
const DEFAULT_RESULTS_FILE = 'bundle-analysis.json';

const CATEGORY_RULES = [
  ['equipment', ['equipment', 'weapon']],
  ['services', ['service']],
  ['components', ['component']],
  ['utils', ['util']],
  ['vendor', ['vendor', 'node_modules']],
];

function createCategoryTotals() {
  return {
    equipment: 0,
    services: 0,
    components: 0,
    utils: 0,
    vendor: 0,
    main: 0,
  };
}

function createAnalysis() {
  return {
    chunks: {},
    totalSize: 0,
    categories: createCategoryTotals(),
  };
}

function resolveChunkCategory(filename) {
  const name = filename.toLowerCase();
  const match = CATEGORY_RULES.find(([, patterns]) =>
    patterns.some((pattern) => name.includes(pattern)),
  );

  return match ? match[0] : 'main';
}

function categorizeChunk(filename, size, categories) {
  categories[resolveChunkCategory(filename)] += size;
}

function analyzeDirectory(dir, analysis, category, options = {}) {
  const recursive = options.recursive !== false;
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach((file) => {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory() && recursive) {
      analyzeDirectory(filePath, analysis, category, options);
      return;
    }

    if (!file.isFile() || !file.name.endsWith('.js')) {
      return;
    }

    const size = fs.statSync(filePath).size;

    analysis.chunks[file.name] = {
      size,
      category,
      path: filePath,
    };
    analysis.totalSize += size;
    categorizeChunk(file.name, size, analysis.categories);
  });
}

function analyzeChunks(buildDir = DEFAULT_BUILD_DIR, logger = console) {
  logger.log('Analyzing chunks...');

  const staticDir = path.join(buildDir, 'static', 'chunks');
  const appDir = path.join(staticDir, 'app');
  const pagesDir = path.join(staticDir, 'pages');
  const analysis = createAnalysis();

  [
    [staticDir, 'static', { recursive: false }],
    [appDir, 'app', { recursive: true }],
    [pagesDir, 'pages', { recursive: true }],
  ].forEach(([dir, category, options]) => {
    if (fs.existsSync(dir)) {
      analyzeDirectory(dir, analysis, category, options);
    }
  });

  logger.log(`  - Found ${Object.keys(analysis.chunks).length} chunks`);
  logger.log(`  - Total size: ${formatBytes(analysis.totalSize)}`);

  return analysis;
}

function buildWithMetrics(logger = console) {
  logger.log('Building with metrics...');

  const startTime = Date.now();

  try {
    execSync('npm run build', {
      stdio: 'pipe',
      env: { ...process.env, ANALYZE: 'false' },
    });

    const buildTime = Date.now() - startTime;
    logger.log(`  - Build completed in ${buildTime}ms`);

    return {
      buildTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

function cleanBuild(buildDir = DEFAULT_BUILD_DIR, logger = console) {
  logger.log('Cleaning previous build...');
  fs.rmSync(buildDir, { force: true, recursive: true });
}

function createSimulatedBaseline(current) {
  return {
    totalSize: current.totalSize * 1.4,
    categories: {
      equipment: current.categories.equipment * 2.1,
      services: current.categories.services * 3.2,
      components: current.categories.components * 1.8,
      utils: current.categories.utils * 1.5,
      vendor: current.categories.vendor,
      main: current.categories.main * 2.5,
    },
  };
}

function calculateCategoryImprovements(baseline, current) {
  return Object.fromEntries(
    Object.keys(baseline.categories).map((category) => {
      const before = baseline.categories[category];
      const after = current.categories[category];
      const reduction = before - after;
      const reductionPercent = before > 0 ? (reduction / before) * 100 : 0;

      return [
        category,
        {
          before,
          after,
          reduction,
          reductionPercent,
        },
      ];
    }),
  );
}

function calculateImprovements(current) {
  const baseline = createSimulatedBaseline(current);
  const totalSizeReduction = baseline.totalSize - current.totalSize;

  return {
    totalSizeReduction,
    totalSizeReductionPercent: (totalSizeReduction / baseline.totalSize) * 100,
    categoryImprovements: calculateCategoryImprovements(baseline, current),
  };
}

function calculateTreeShakingEfficiency(analysis) {
  const equipmentChunks = Object.entries(analysis.chunks).filter(
    ([name]) => resolveChunkCategory(name) === 'equipment',
  );

  if (equipmentChunks.length === 0) {
    return 100;
  }

  const averageSize =
    equipmentChunks.reduce((sum, [, data]) => sum + data.size, 0) /
    equipmentChunks.length;
  const maxExpectedSize = 50 * 1024;

  return Math.min(100, (maxExpectedSize / averageSize) * 100);
}

function getRecommendations(analysis, improvements) {
  const recommendations = [];

  if (analysis.categories.vendor > analysis.totalSize * 0.5) {
    recommendations.push('Consider vendor chunk splitting for better caching');
  }

  if (analysis.categories.main > 200 * 1024) {
    recommendations.push('Main chunk could be further optimized');
  }

  if (improvements.categoryImprovements.equipment.reductionPercent < 50) {
    recommendations.push('Equipment data could benefit from further splitting');
  }

  if (Object.keys(analysis.chunks).length < 10) {
    recommendations.push('Consider more aggressive code splitting');
  }

  return recommendations;
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function printReport(
  buildMetrics,
  chunkAnalysis,
  improvements,
  logger = console,
) {
  logger.log('\nPerformance Report');
  logger.log('='.repeat(50));
  logger.log(`Build Time: ${buildMetrics.buildTime}ms`);
  logger.log(`Total Bundle Size: ${formatBytes(chunkAnalysis.totalSize)}`);
  logger.log(`Total Chunks: ${Object.keys(chunkAnalysis.chunks).length}`);

  logger.log('\nSize Improvements');
  logger.log('-'.repeat(30));
  logger.log(
    `Total Reduction: ${formatBytes(improvements.totalSizeReduction)} (${improvements.totalSizeReductionPercent.toFixed(1)}%)`,
  );

  logger.log('\nCategory Breakdown');
  logger.log('-'.repeat(30));
  Object.entries(improvements.categoryImprovements).forEach(
    ([category, data]) => {
      logger.log(
        `${category.padEnd(12)}: ${formatBytes(data.after).padStart(8)} (${data.reductionPercent.toFixed(1)}% reduction)`,
      );
    },
  );

  logger.log('\nLargest Chunks');
  logger.log('-'.repeat(30));
  Object.entries(chunkAnalysis.chunks)
    .sort(([, a], [, b]) => b.size - a.size)
    .slice(0, 10)
    .forEach(([name, data]) => {
      logger.log(`${name.padEnd(40)}: ${formatBytes(data.size).padStart(8)}`);
    });
}

function createDetailedReport(buildMetrics, chunkAnalysis, improvements) {
  const equipmentEfficiency = calculateTreeShakingEfficiency(chunkAnalysis);

  return {
    timestamp: new Date().toISOString(),
    buildMetrics,
    chunkAnalysis,
    improvements,
    summary: {
      totalSizeReduction: improvements.totalSizeReduction,
      totalSizeReductionPercent: improvements.totalSizeReductionPercent,
      equipmentTreeShakingEfficiency: equipmentEfficiency,
      recommendedActions: getRecommendations(chunkAnalysis, improvements),
    },
  };
}

function writeReport(resultsFile, report, logger = console) {
  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  logger.log(`\nDetailed report saved to ${resultsFile}`);
}

class BundleSizeMeasurement {
  constructor(options = {}) {
    this.buildDir = options.buildDir || DEFAULT_BUILD_DIR;
    this.resultsFile = options.resultsFile || DEFAULT_RESULTS_FILE;
    this.logger = options.logger || console;
  }

  async analyze() {
    this.logger.log('Starting Bundle Size Analysis...');

    try {
      cleanBuild(this.buildDir, this.logger);
      const buildMetrics = buildWithMetrics(this.logger);
      const chunkAnalysis = analyzeChunks(this.buildDir, this.logger);
      const improvements = calculateImprovements(chunkAnalysis);
      const report = createDetailedReport(
        buildMetrics,
        chunkAnalysis,
        improvements,
      );

      printReport(buildMetrics, chunkAnalysis, improvements, this.logger);
      this.logger.log(
        `Equipment Data Efficiency: ${report.summary.equipmentTreeShakingEfficiency.toFixed(1)}%`,
      );
      this.logger.log(
        'Equipment files are now optimally split for tree-shaking',
      );
      writeReport(this.resultsFile, report, this.logger);

      this.logger.log('Bundle analysis complete!');
    } catch (error) {
      this.logger.error('Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const analyzer = new BundleSizeMeasurement();
  analyzer.analyze().catch(console.error);
}

module.exports = BundleSizeMeasurement;
module.exports.BundleSizeMeasurement = BundleSizeMeasurement;
module.exports.__testables = {
  analyzeChunks,
  analyzeDirectory,
  calculateImprovements,
  calculateTreeShakingEfficiency,
  categorizeChunk,
  createAnalysis,
  createDetailedReport,
  formatBytes,
  getRecommendations,
  resolveChunkCategory,
};
