/**
 * Pip Distribution Visual Comparison Script
 *
 * Extracts pip positions from MegaMekLab pre-made SVG files and compares
 * them against our Poisson disk sampling algorithm at various densities.
 *
 * Usage: npx ts-node scripts/compare-pip-distributions.ts
 *
 * Output:
 * - Comparison SVGs showing legacy vs Poisson side-by-side
 * - Metrics report (uniformity, spacing, bounds)
 * - Quality assessment summary
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface Point2D {
  x: number;
  y: number;
}

interface PipExtractionResult {
  count: number;
  positions: Point2D[];
  radius: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

interface ComparisonMetrics {
  location: string;
  pipCount: number;
  legacy: {
    uniformity: number;
    avgSpacing: number;
    minSpacing: number;
  };
  poisson: {
    uniformity: number;
    avgSpacing: number;
    minSpacing: number;
  };
}

// ============================================================================
// MegaMekLab SVG Pip Extraction
// ============================================================================

/**
 * Extract pip center positions from a MegaMekLab pip SVG file.
 *
 * MegaMekLab draws pips as circles using bezier curves. The path format is:
 * M<x>,<y>c... where (x, y) is on the right edge of the circle.
 *
 * The circle has radius ~2.415 based on the path construction.
 */
function extractPipsFromSVG(svgContent: string): PipExtractionResult {
  const positions: Point2D[] = [];

  // Match all path 'd' attributes that represent circles
  // Format: M<x>,<y>c<bezier curve data>
  const pathRegex = /d="\s*M\s*([\d.]+)\s*,\s*([\d.]+)\s*c[^"]+"/g;
  let match;

  // Estimate radius from the path data (MegaMekLab uses ~2.415)
  const estimatedRadius = 2.415;

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const rightEdgeX = parseFloat(match[1]);
    const centerY = parseFloat(match[2]);
    // The M coordinate is at the right edge of the circle
    // So center.x = rightEdgeX - radius
    const centerX = rightEdgeX - estimatedRadius;

    positions.push({ x: centerX, y: centerY });
  }

  // Calculate bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    count: positions.length,
    positions,
    radius: estimatedRadius,
    bounds:
      positions.length > 0
        ? { minX, minY, maxX, maxY }
        : { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };
}

// ============================================================================
// Poisson Distribution (simplified version for script)
// ============================================================================

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function poissonDiskSampling(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  targetCount: number,
  seed: number,
): Point2D[] {
  const random = seededRandom(seed);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const area = width * height;

  // Estimate optimal spacing
  const spacing = Math.sqrt(area / targetCount) * 0.85;
  const cellSize = spacing / Math.sqrt(2);

  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  const grid: (Point2D | null)[][] = Array(gridWidth)
    .fill(null)
    .map(() => Array(gridHeight).fill(null));

  const points: Point2D[] = [];
  const activeList: Point2D[] = [];

  // Start with a random point
  const startX = bounds.minX + random() * width;
  const startY = bounds.minY + random() * height;
  const startPoint: Point2D = { x: startX, y: startY };

  points.push(startPoint);
  activeList.push(startPoint);

  const gridX = Math.floor((startX - bounds.minX) / cellSize);
  const gridY = Math.floor((startY - bounds.minY) / cellSize);
  if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
    grid[gridX][gridY] = startPoint;
  }

  const maxSamples = 30;

  while (activeList.length > 0 && points.length < targetCount * 2) {
    const activeIdx = Math.floor(random() * activeList.length);
    const activePoint = activeList[activeIdx];
    let found = false;

    for (let i = 0; i < maxSamples; i++) {
      const angle = random() * 2 * Math.PI;
      const dist = spacing + random() * spacing;
      const newX = activePoint.x + Math.cos(angle) * dist;
      const newY = activePoint.y + Math.sin(angle) * dist;

      if (
        newX < bounds.minX ||
        newX > bounds.maxX ||
        newY < bounds.minY ||
        newY > bounds.maxY
      ) {
        continue;
      }

      const newGridX = Math.floor((newX - bounds.minX) / cellSize);
      const newGridY = Math.floor((newY - bounds.minY) / cellSize);

      // Check neighbors
      let tooClose = false;
      for (let dx = -2; dx <= 2 && !tooClose; dx++) {
        for (let dy = -2; dy <= 2 && !tooClose; dy++) {
          const nx = newGridX + dx;
          const ny = newGridY + dy;
          if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            const neighbor = grid[nx][ny];
            if (neighbor) {
              const distSq =
                (newX - neighbor.x) ** 2 + (newY - neighbor.y) ** 2;
              if (distSq < spacing * spacing) {
                tooClose = true;
              }
            }
          }
        }
      }

      if (!tooClose) {
        const newPoint: Point2D = { x: newX, y: newY };
        points.push(newPoint);
        activeList.push(newPoint);
        if (
          newGridX >= 0 &&
          newGridX < gridWidth &&
          newGridY >= 0 &&
          newGridY < gridHeight
        ) {
          grid[newGridX][newGridY] = newPoint;
        }
        found = true;
        break;
      }
    }

    if (!found) {
      activeList.splice(activeIdx, 1);
    }
  }

  // Adjust to exact count
  if (points.length > targetCount) {
    // Remove points furthest from centroid
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    points.sort((a, b) => {
      const da = (a.x - cx) ** 2 + (a.y - cy) ** 2;
      const db = (b.x - cx) ** 2 + (b.y - cy) ** 2;
      return da - db;
    });
    return points.slice(0, targetCount);
  } else if (points.length < targetCount) {
    // Add random points
    while (points.length < targetCount) {
      const x = bounds.minX + random() * width;
      const y = bounds.minY + random() * height;
      points.push({ x, y });
    }
  }

  return points;
}

// ============================================================================
// Metrics Calculation
// ============================================================================

function calculateMetrics(positions: Point2D[]): {
  uniformity: number;
  avgSpacing: number;
  minSpacing: number;
} {
  if (positions.length <= 1) {
    return { uniformity: 0, avgSpacing: 0, minSpacing: 0 };
  }

  // Calculate nearest-neighbor distances
  const nnDistances: number[] = [];

  for (let i = 0; i < positions.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
    if (minDist < Infinity) {
      nnDistances.push(minDist);
    }
  }

  const avgSpacing =
    nnDistances.reduce((a, b) => a + b, 0) / nnDistances.length;
  const minSpacing = Math.min(...nnDistances);

  // Uniformity = coefficient of variation (std dev / mean)
  const variance =
    nnDistances.reduce((sum, d) => sum + (d - avgSpacing) ** 2, 0) /
    nnDistances.length;
  const stdDev = Math.sqrt(variance);
  const uniformity = avgSpacing > 0 ? stdDev / avgSpacing : 0;

  return { uniformity, avgSpacing, minSpacing };
}

// ============================================================================
// SVG Generation for Comparison
// ============================================================================

function generateComparisonSVG(
  location: string,
  pipCount: number,
  legacyPips: Point2D[],
  poissonPips: Point2D[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  radius: number,
): string {
  const padding = 20;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;
  const totalWidth = width * 2 + 40; // Side by side with gap

  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  const legacyCircles = legacyPips
    .map(
      (p) =>
        `<circle cx="${p.x + offsetX}" cy="${p.y + offsetY}" r="${radius}" fill="none" stroke="#000" stroke-width="0.5"/>`,
    )
    .join('\n    ');

  const poissonCircles = poissonPips
    .map(
      (p) =>
        `<circle cx="${p.x + offsetX + width + 20}" cy="${p.y + offsetY}" r="${radius}" fill="none" stroke="#0066cc" stroke-width="0.5"/>`,
    )
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height + 40}" viewBox="0 0 ${totalWidth} ${height + 40}">
  <style>
    .title { font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; }
    .subtitle { font-family: Arial, sans-serif; font-size: 10px; fill: #666; }
  </style>
  
  <!-- Title -->
  <text x="${totalWidth / 2}" y="15" class="title" text-anchor="middle">${location} - ${pipCount} pips</text>
  
  <!-- Legacy (MegaMekLab) -->
  <g transform="translate(0, 25)">
    <text x="${width / 2}" y="12" class="subtitle" text-anchor="middle">Legacy (MegaMekLab)</text>
    <rect x="0" y="18" width="${width}" height="${height}" fill="none" stroke="#ccc" stroke-dasharray="2,2"/>
    ${legacyCircles}
  </g>
  
  <!-- Poisson -->
  <g transform="translate(${width + 20}, 25)">
    <text x="${width / 2}" y="12" class="subtitle" text-anchor="middle">Poisson Disk Sampling</text>
    <rect x="0" y="18" width="${width}" height="${height}" fill="none" stroke="#ccc" stroke-dasharray="2,2"/>
    ${poissonCircles}
  </g>
</svg>`;
}

// ============================================================================
// Main Script
// ============================================================================

async function main(): Promise<void> {
  const pipsDir = path.join(
    __dirname,
    '..',
    'public',
    'record-sheets',
    'biped_pips',
  );
  const outputDir = path.join(__dirname, '..', 'pip-comparison-output');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Test cases: location (MegaMekLab file naming), pip counts to compare
  // MegaMekLab uses: CT, LT, RT, LArm, RArm, LLeg, RLeg, Head, CT_R, LT_R, RT_R
  const testCases = [
    { location: 'CT', counts: [12, 25, 47] }, // Center Torso: low, medium, high
    { location: 'LT', counts: [8, 16, 32] }, // Left Torso
    { location: 'RT', counts: [8, 16, 32] }, // Right Torso
    { location: 'LArm', counts: [8, 17, 34] }, // Left Arm
    { location: 'RArm', counts: [8, 17, 34] }, // Right Arm
    { location: 'LLeg', counts: [10, 21, 42] }, // Left Leg
    { location: 'RLeg', counts: [10, 21, 42] }, // Right Leg
    { location: 'Head', counts: [3, 6, 9] }, // Head
    { location: 'CT_R', counts: [5, 10, 15] }, // Center Torso Rear
    { location: 'LT_R', counts: [3, 6, 10] }, // Left Torso Rear
    { location: 'RT_R', counts: [3, 6, 10] }, // Right Torso Rear
  ];

  const allMetrics: ComparisonMetrics[] = [];

  console.log('='.repeat(70));
  console.log(
    'Pip Distribution Comparison: MegaMekLab vs Poisson Disk Sampling',
  );
  console.log('='.repeat(70));
  console.log('');

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.location} ---`);

    for (const pipCount of testCase.counts) {
      const fileName = `Armor_${testCase.location}_${pipCount}_Humanoid.svg`;
      const filePath = path.join(pipsDir, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`  [SKIP] ${fileName} not found`);
        continue;
      }

      // Extract legacy pips
      const svgContent = fs.readFileSync(filePath, 'utf-8');
      const legacyResult = extractPipsFromSVG(svgContent);

      if (legacyResult.count === 0) {
        console.log(`  [SKIP] ${fileName} - no pips extracted`);
        continue;
      }

      // Generate Poisson pips using same bounds
      const poissonPips = poissonDiskSampling(
        legacyResult.bounds,
        pipCount,
        42,
      );

      // Calculate metrics
      const legacyMetrics = calculateMetrics(legacyResult.positions);
      const poissonMetrics = calculateMetrics(poissonPips);

      const comparison: ComparisonMetrics = {
        location: testCase.location,
        pipCount,
        legacy: legacyMetrics,
        poisson: poissonMetrics,
      };
      allMetrics.push(comparison);

      // Generate comparison SVG
      const comparisonSVG = generateComparisonSVG(
        testCase.location,
        pipCount,
        legacyResult.positions,
        poissonPips,
        legacyResult.bounds,
        legacyResult.radius,
      );

      const outputFileName = `comparison_${testCase.location}_${pipCount}.svg`;
      fs.writeFileSync(path.join(outputDir, outputFileName), comparisonSVG);

      // Log metrics
      const uniformityDiff =
        poissonMetrics.uniformity - legacyMetrics.uniformity;
      const uniformityStatus =
        uniformityDiff <= 0.1 ? '✓' : uniformityDiff <= 0.2 ? '~' : '✗';

      console.log(
        `  ${pipCount} pips: Legacy uniformity=${legacyMetrics.uniformity.toFixed(3)}, ` +
          `Poisson=${poissonMetrics.uniformity.toFixed(3)} ${uniformityStatus}`,
      );
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY REPORT');
  console.log('='.repeat(70));

  const avgLegacyUniformity =
    allMetrics.reduce((s, m) => s + m.legacy.uniformity, 0) / allMetrics.length;
  const avgPoissonUniformity =
    allMetrics.reduce((s, m) => s + m.poisson.uniformity, 0) /
    allMetrics.length;

  console.log(`\nAverage Uniformity (lower is better):`);
  console.log(`  Legacy (MegaMekLab): ${avgLegacyUniformity.toFixed(4)}`);
  console.log(`  Poisson:             ${avgPoissonUniformity.toFixed(4)}`);

  const improvement = avgLegacyUniformity - avgPoissonUniformity;
  if (improvement > 0) {
    console.log(
      `  → Poisson is ${(improvement * 100).toFixed(1)}% more uniform`,
    );
  } else {
    console.log(
      `  → Legacy is ${(-improvement * 100).toFixed(1)}% more uniform`,
    );
  }

  // Write JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      avgLegacyUniformity,
      avgPoissonUniformity,
      improvement,
    },
    comparisons: allMetrics,
  };

  fs.writeFileSync(
    path.join(outputDir, 'comparison-report.json'),
    JSON.stringify(report, null, 2),
  );

  console.log(`\nOutput files written to: ${outputDir}`);
  console.log(`  - comparison_*.svg: Visual comparison SVGs`);
  console.log(`  - comparison-report.json: Full metrics report`);
}

main().catch(console.error);
