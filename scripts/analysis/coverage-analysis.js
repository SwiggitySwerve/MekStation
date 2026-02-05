#!/usr/bin/env node

/**
 * Coverage Analysis Script
 *
 * Parses Jest coverage JSON and generates a detailed markdown report
 * identifying gaps, patterns, and recommendations for improvement.
 *
 * Usage: node scripts/analysis/coverage-analysis.js
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(
  __dirname,
  '../../coverage/coverage-final.json',
);
const OUTPUT_FILE = path.join(
  __dirname,
  '../../docs/development/coverage-analysis.md',
);

// Coverage thresholds
const THRESHOLDS = {
  excellent: 90,
  good: 80,
  fair: 50,
  poor: 0,
};

/**
 * Calculate coverage percentage from statements object
 */
function calculateCoverage(coverageData) {
  const covered = Object.values(coverageData).filter(
    (count) => count > 0,
  ).length;
  const total = Object.keys(coverageData).length;
  return total > 0 ? (covered / total) * 100 : 100;
}

/**
 * Calculate coverage statistics for a file
 */
function getFileCoverage(fileData) {
  return {
    statements: calculateCoverage(fileData.s),
    branches: calculateCoverage(
      fileData.b
        ? Object.fromEntries(
            Object.entries(fileData.b).flatMap(([key, counts]) =>
              counts.map((c, i) => [`${key}_${i}`, c]),
            ),
          )
        : {},
    ),
    functions: calculateCoverage(fileData.f),
    lines: calculateCoverage(
      fileData.statementMap
        ? Object.fromEntries(
            Object.entries(fileData.s).map(([key, val]) => [key, val]),
          )
        : {},
    ),
  };
}

/**
 * Get category from file path
 */
function getCategory(filePath) {
  const relativePath = filePath.replace(/\\/g, '/');

  if (relativePath.includes('src/components/customizer'))
    return 'components/customizer';
  if (relativePath.includes('src/components/common'))
    return 'components/common';
  if (relativePath.includes('src/components/ui')) return 'components/ui';
  if (relativePath.includes('src/components')) return 'components/other';
  if (relativePath.includes('src/services/construction'))
    return 'services/construction';
  if (relativePath.includes('src/services/conversion'))
    return 'services/conversion';
  if (relativePath.includes('src/services/equipment'))
    return 'services/equipment';
  if (relativePath.includes('src/services/persistence'))
    return 'services/persistence';
  if (relativePath.includes('src/services/units')) return 'services/units';
  if (relativePath.includes('src/services')) return 'services/other';
  if (relativePath.includes('src/utils/construction'))
    return 'utils/construction';
  if (relativePath.includes('src/utils/validation')) return 'utils/validation';
  if (relativePath.includes('src/utils/serialization'))
    return 'utils/serialization';
  if (relativePath.includes('src/utils/temporal')) return 'utils/temporal';
  if (relativePath.includes('src/utils/physical')) return 'utils/physical';
  if (relativePath.includes('src/utils/colors')) return 'utils/colors';
  if (relativePath.includes('src/utils')) return 'utils/other';
  if (relativePath.includes('src/pages/api/units')) return 'pages/api/units';
  if (relativePath.includes('src/pages/api')) return 'pages/api';
  return 'other';
}

/**
 * Get coverage rating
 */
function getRating(percentage) {
  if (percentage >= THRESHOLDS.excellent) return '🟢 Excellent';
  if (percentage >= THRESHOLDS.good) return '🟡 Good';
  if (percentage >= THRESHOLDS.fair) return '🟠 Fair';
  return '🔴 Poor';
}

/**
 * Generate the coverage report
 */
function generateReport(coverageData) {
  const files = [];
  const categories = {};

  // Process each file
  for (const [filePath, fileData] of Object.entries(coverageData)) {
    const coverage = getFileCoverage(fileData);
    const category = getCategory(filePath);
    const fileName = path.basename(filePath);
    const relativePath = filePath
      .replace(/.*src[\\\/]/, 'src/')
      .replace(/\\/g, '/');

    const fileInfo = {
      path: relativePath,
      name: fileName,
      category,
      ...coverage,
      avgCoverage:
        (coverage.statements +
          coverage.branches +
          coverage.functions +
          coverage.lines) /
        4,
    };

    files.push(fileInfo);

    // Aggregate by category
    if (!categories[category]) {
      categories[category] = {
        files: [],
        totalStatements: 0,
        totalBranches: 0,
        totalFunctions: 0,
        totalLines: 0,
        count: 0,
      };
    }
    categories[category].files.push(fileInfo);
    categories[category].totalStatements += coverage.statements;
    categories[category].totalBranches += coverage.branches;
    categories[category].totalFunctions += coverage.functions;
    categories[category].totalLines += coverage.lines;
    categories[category].count++;
  }

  // Calculate category averages
  for (const cat of Object.values(categories)) {
    cat.avgStatements = cat.totalStatements / cat.count;
    cat.avgBranches = cat.totalBranches / cat.count;
    cat.avgFunctions = cat.totalFunctions / cat.count;
    cat.avgLines = cat.totalLines / cat.count;
    cat.avgCoverage =
      (cat.avgStatements + cat.avgBranches + cat.avgFunctions + cat.avgLines) /
      4;
  }

  // Sort files by coverage (lowest first)
  files.sort((a, b) => a.avgCoverage - b.avgCoverage);

  // Calculate overall stats
  const overall = {
    statements: files.reduce((sum, f) => sum + f.statements, 0) / files.length,
    branches: files.reduce((sum, f) => sum + f.branches, 0) / files.length,
    functions: files.reduce((sum, f) => sum + f.functions, 0) / files.length,
    lines: files.reduce((sum, f) => sum + f.lines, 0) / files.length,
  };
  overall.avgCoverage =
    (overall.statements +
      overall.branches +
      overall.functions +
      overall.lines) /
    4;

  // Generate markdown
  const now = new Date().toISOString().split('T')[0];

  let markdown = `# Code Coverage Analysis Report

**Generated**: ${now}
**Test Framework**: Jest
**Total Files Analyzed**: ${files.length}

## Executive Summary

| Metric | Coverage | Rating |
|--------|----------|--------|
| Statements | ${overall.statements.toFixed(2)}% | ${getRating(overall.statements)} |
| Branches | ${overall.branches.toFixed(2)}% | ${getRating(overall.branches)} |
| Functions | ${overall.functions.toFixed(2)}% | ${getRating(overall.functions)} |
| Lines | ${overall.lines.toFixed(2)}% | ${getRating(overall.lines)} |
| **Overall Average** | **${overall.avgCoverage.toFixed(2)}%** | ${getRating(overall.avgCoverage)} |

---

## Coverage by Category

| Category | Statements | Branches | Functions | Lines | Files |
|----------|------------|----------|-----------|-------|-------|
`;

  // Sort categories by coverage
  const sortedCategories = Object.entries(categories).sort(
    (a, b) => a[1].avgCoverage - b[1].avgCoverage,
  );

  for (const [name, cat] of sortedCategories) {
    markdown += `| ${name} | ${cat.avgStatements.toFixed(1)}% | ${cat.avgBranches.toFixed(1)}% | ${cat.avgFunctions.toFixed(1)}% | ${cat.avgLines.toFixed(1)}% | ${cat.count} |\n`;
  }

  markdown += `
---

## Critical Gaps (0% Coverage)

The following files have **zero test coverage** and should be prioritized:

`;

  const zeroCoverageFiles = files.filter((f) => f.statements === 0);
  if (zeroCoverageFiles.length > 0) {
    markdown += `| File | Category |\n|------|----------|\n`;
    for (const file of zeroCoverageFiles.slice(0, 30)) {
      markdown += `| \`${file.path}\` | ${file.category} |\n`;
    }
    if (zeroCoverageFiles.length > 30) {
      markdown += `\n*...and ${zeroCoverageFiles.length - 30} more files with 0% coverage*\n`;
    }
  } else {
    markdown += `*No files with 0% coverage - great job!*\n`;
  }

  markdown += `
---

## Low Coverage Files (<50%)

Files that exist but have insufficient test coverage:

| File | Statements | Functions | Category |
|------|------------|-----------|----------|
`;

  const lowCoverageFiles = files.filter(
    (f) => f.statements > 0 && f.statements < 50,
  );
  for (const file of lowCoverageFiles.slice(0, 20)) {
    markdown += `| \`${file.name}\` | ${file.statements.toFixed(1)}% | ${file.functions.toFixed(1)}% | ${file.category} |\n`;
  }

  markdown += `
---

## Well-Tested Files (>90% Coverage)

Files with excellent test coverage:

| File | Statements | Branches | Category |
|------|------------|----------|----------|
`;

  const excellentFiles = files.filter((f) => f.statements >= 90);
  for (const file of excellentFiles.slice(0, 15)) {
    markdown += `| \`${file.name}\` | ${file.statements.toFixed(1)}% | ${file.branches.toFixed(1)}% | ${file.category} |\n`;
  }

  markdown += `
---

## Recommendations

### Priority 1: Critical Business Logic (Immediate)

The following areas contain critical BattleTech construction rules and should have comprehensive tests:

1. **services/units/** - Unit management services at ${categories['services/units']?.avgStatements?.toFixed(1) || 0}% coverage
   - Focus on: UnitLoaderService, UnitNameValidator, CustomUnitApiService
   
2. **services/persistence/** - Data persistence at ${categories['services/persistence']?.avgStatements?.toFixed(1) || 0}% coverage
   - Focus on: FileService, MigrationService, IndexedDBService

3. **utils/construction/** - Construction calculations at ${categories['utils/construction']?.avgStatements?.toFixed(1) || 0}% coverage
   - Generally well-tested, but verify movementCalculations.ts

### Priority 2: User Interface (Short-term)

4. **components/customizer/** - Main editor UI at 0% coverage
   - These are React components but critical for the user experience
   - Add integration tests for key user flows

5. **utils/colors/** - Color utilities at 0% coverage
   - Simple utilities, easy wins for coverage

### Priority 3: API Endpoints (Medium-term)

6. **pages/api/units/** - Unit API at ${categories['pages/api/units']?.avgStatements?.toFixed(1) || 0}% coverage
   - Custom unit CRUD operations need testing

---

## Coverage Targets

Based on the current state, recommended coverage thresholds:

\`\`\`javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 50,
    branches: 40,
    functions: 45,
    lines: 50
  },
  './src/services/construction/': {
    statements: 80,
    branches: 60,
    functions: 90
  },
  './src/utils/construction/': {
    statements: 90,
    branches: 70,
    functions: 95
  },
  './src/utils/validation/': {
    statements: 95,
    branches: 85,
    functions: 100
  }
}
\`\`\`

---

## Test File Mapping

Current test files exist in \`src/__tests__/\` with the following structure:
- \`api/\` - API endpoint tests
- \`components/\` - React component tests
- \`hooks/\` - Custom hook tests
- \`integration/\` - Integration tests
- \`service/\` - Service layer tests
- \`stores/\` - Zustand store tests
- \`unit/\` - Unit tests for utilities

---

## Next Steps

1. Run \`npm run test:coverage\` to generate fresh coverage data
2. Open \`coverage/lcov-report/index.html\` in browser for detailed view
3. Focus on Priority 1 items first
4. Add coverage thresholds to prevent regression
5. Set up CI to track coverage trends

---

*This report is auto-generated by \`scripts/analysis/coverage-analysis.js\`*
`;

  return markdown;
}

/**
 * Main function
 */
function main() {
  console.log('📊 Coverage Analysis Script');
  console.log('===========================\n');

  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found at:', COVERAGE_FILE);
    console.error(
      '   Run "npm run test:coverage" first to generate coverage data.\n',
    );
    process.exit(1);
  }

  console.log('📂 Reading coverage data from:', COVERAGE_FILE);

  try {
    const coverageJson = fs.readFileSync(COVERAGE_FILE, 'utf8');
    const coverageData = JSON.parse(coverageJson);

    console.log(
      `📁 Found ${Object.keys(coverageData).length} files in coverage data\n`,
    );

    // Generate report
    const report = generateReport(coverageData);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
    console.log('✅ Report written to:', OUTPUT_FILE);

    // Print summary to console
    console.log('\n📊 Quick Summary:');
    console.log('─────────────────');

    const files = Object.entries(coverageData);
    let zeroCoverage = 0;
    let lowCoverage = 0;
    let goodCoverage = 0;
    let excellentCoverage = 0;

    for (const [, fileData] of files) {
      const stmtCoverage = calculateCoverage(fileData.s);
      if (stmtCoverage === 0) zeroCoverage++;
      else if (stmtCoverage < 50) lowCoverage++;
      else if (stmtCoverage < 90) goodCoverage++;
      else excellentCoverage++;
    }

    console.log(`🔴 Zero coverage:     ${zeroCoverage} files`);
    console.log(`🟠 Low coverage:      ${lowCoverage} files`);
    console.log(`🟡 Good coverage:     ${goodCoverage} files`);
    console.log(`🟢 Excellent coverage: ${excellentCoverage} files`);
    console.log(`📁 Total files:       ${files.length}`);
  } catch (error) {
    console.error('❌ Error processing coverage data:', error.message);
    process.exit(1);
  }
}

main();
