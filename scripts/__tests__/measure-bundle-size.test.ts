import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type ChunkAnalysis = {
  chunks: Record<string, { size: number; category: string; path: string }>;
  totalSize: number;
  categories: Record<string, number>;
};

type BundleSizeTestables = {
  analyzeChunks: (
    buildDir: string,
    logger?: Pick<Console, 'log'>,
  ) => ChunkAnalysis;
  calculateImprovements: (analysis: ChunkAnalysis) => {
    totalSizeReduction: number;
    totalSizeReductionPercent: number;
    categoryImprovements: Record<
      string,
      {
        before: number;
        after: number;
        reduction: number;
        reductionPercent: number;
      }
    >;
  };
  createAnalysis: () => ChunkAnalysis;
  createDetailedReport: (
    buildMetrics: { buildTime: number; timestamp: string },
    chunkAnalysis: ChunkAnalysis,
    improvements: ReturnType<BundleSizeTestables['calculateImprovements']>,
  ) => {
    summary: {
      recommendedActions: string[];
      equipmentTreeShakingEfficiency: number;
      totalSizeReductionPercent: number;
    };
  };
  categorizeChunk: (
    filename: string,
    size: number,
    categories: Record<string, number>,
  ) => void;
  formatBytes: (bytes: number) => string;
  resolveChunkCategory: (filename: string) => string;
};

const measurementModule = require('../performance/measure-bundle-size.js') as {
  __testables: BundleSizeTestables;
};

const {
  analyzeChunks,
  calculateImprovements,
  categorizeChunk,
  createAnalysis,
  createDetailedReport,
  formatBytes,
  resolveChunkCategory,
} = measurementModule.__testables;

function makeTempBuild(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-bundle-size-'));
}

function writeChunk(
  buildDir: string,
  relativePath: string,
  bytes: number,
): void {
  const chunkPath = path.join(buildDir, 'static', 'chunks', relativePath);
  fs.mkdirSync(path.dirname(chunkPath), { recursive: true });
  fs.writeFileSync(chunkPath, 'x'.repeat(bytes));
}

describe('bundle size measurement helpers', () => {
  let tempDir: string;
  const quietLogger = { log: jest.fn() };

  beforeEach(() => {
    tempDir = makeTempBuild();
    quietLogger.log.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('categorizes known chunk families into stable totals', () => {
    const analysis = createAnalysis();

    categorizeChunk('weapon-catalog.js', 100, analysis.categories);
    categorizeChunk('local-service.js', 200, analysis.categories);
    categorizeChunk('campaign-component.js', 300, analysis.categories);
    categorizeChunk('math-util.js', 400, analysis.categories);
    categorizeChunk('vendor-node_modules.js', 500, analysis.categories);
    categorizeChunk('main-app.js', 600, analysis.categories);

    expect(resolveChunkCategory('weapon-catalog.js')).toBe('equipment');
    expect(analysis.categories).toEqual({
      equipment: 100,
      services: 200,
      components: 300,
      utils: 400,
      vendor: 500,
      main: 600,
    });
  });

  it('discovers top-level and nested js chunks without counting non-js files', () => {
    writeChunk(tempDir, 'main-app.js', 1024);
    writeChunk(tempDir, 'app/weapon-panel.js', 2048);
    writeChunk(tempDir, 'pages/service-worker.js', 512);
    fs.writeFileSync(
      path.join(tempDir, 'static', 'chunks', 'ignored.css'),
      'body{}',
    );

    const analysis = analyzeChunks(tempDir, quietLogger);

    expect(Object.keys(analysis.chunks).sort()).toEqual([
      'main-app.js',
      'service-worker.js',
      'weapon-panel.js',
    ]);
    expect(analysis.totalSize).toBe(3584);
    expect(analysis.categories.equipment).toBe(2048);
    expect(analysis.categories.services).toBe(512);
    expect(analysis.categories.main).toBe(1024);
  });

  it('builds the same simulated improvement and recommendation summary', () => {
    const analysis = createAnalysis();
    analysis.totalSize = 260 * 1024;
    analysis.categories.vendor = 150 * 1024;
    analysis.categories.main = 210 * 1024;
    analysis.chunks = {
      'main-app.js': {
        size: 210 * 1024,
        category: 'static',
        path: 'main-app.js',
      },
      'vendor.js': {
        size: 150 * 1024,
        category: 'static',
        path: 'vendor.js',
      },
    };

    const improvements = calculateImprovements(analysis);
    const report = createDetailedReport(
      { buildTime: 123, timestamp: '2026-06-27T00:00:00.000Z' },
      analysis,
      improvements,
    );

    expect(improvements.totalSizeReductionPercent).toBeCloseTo(28.57, 2);
    expect(report.summary.recommendedActions).toEqual(
      expect.arrayContaining([
        'Consider vendor chunk splitting for better caching',
        'Main chunk could be further optimized',
        'Equipment data could benefit from further splitting',
        'Consider more aggressive code splitting',
      ]),
    );
    expect(report.summary.equipmentTreeShakingEfficiency).toBe(100);
  });

  it('formats byte counts for console reports', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });
});
