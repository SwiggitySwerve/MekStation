#!/usr/bin/env npx tsx
/**
 * Find truly unresolved weapons: what does the validation report as unresolved?
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('./validation-output/bv-validation-report.json', 'utf-8'));

// Check detailed results for unresolved weapons
const results: any[] = JSON.parse(fs.readFileSync('./validation-output/bv-all-results.json', 'utf-8'));

// Check if the main results file has issues tracked
// Actually, let's search the report for unresolved weapon mentions
const unresolvedUnits = results.filter(r => r.cause === 'unresolved-weapon');
console.log(`Units with unresolved-weapon cause: ${unresolvedUnits.length}`);

// Better: look at the compact results for units with high undercalculation
// and check if they have unresolved weapons by looking at negative BV gap patterns

// Let's look at what the validation report says about individual units
if (report.topDiscrepancies) {
  const withIssues = report.topDiscrepancies.filter((r: any) => r.issues && r.issues.length > 0);
  console.log(`\nUnits with issues in top discrepancies: ${withIssues.length}`);
  for (const r of withIssues.slice(0, 20)) {
    console.log(`  ${r.chassis} ${r.model}: ${r.issues.join('; ')}`);
  }
}

// Read the detailed results to find issue patterns
// The bv-all-results.json might not have issues. Let's check the validation report.
console.log('\nPareto analysis:');
if (report.pareto) {
  for (const cat of report.pareto.categories) {
    console.log(`  ${cat.name}: ${cat.count} units (avg ${cat.avgAbsPercentDiff.toFixed(1)}%)`);
    for (const u of cat.units) {
      console.log(`    ${u}`);
    }
  }
}
