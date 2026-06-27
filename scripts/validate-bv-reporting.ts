import * as fs from 'fs';
import * as path from 'path';

import type { ValidationResult } from './validate-bv-types';

export interface ExcludedValidationUnit {
  unit: string;
  reason: string;
}

interface ParetoCategory {
  name: string;
  count: number;
  units: string[];
  avgAbsPercentDiff: number;
}

interface ParetoAnalysis {
  generatedAt: string;
  totalFailures: number;
  categories: ParetoCategory[];
}

interface ValidationReport {
  generatedAt: string;
  summary: {
    totalUnits: number;
    excludedAllowlist: number;
    validatedUnits: number;
    calculated: number;
    failedToCalculate: number;
    exactMatch: number;
    within1Percent: number;
    within2Percent: number;
    within3Percent: number;
    over3Percent: number;
    within1PercentPct: number;
    within2PercentPct: number;
    within3PercentPct: number;
  };
  accuracyGates: {
    within1Percent: { target: number; actual: number; passed: boolean };
    within2Percent: { target: number; actual: number; passed: boolean };
    within3Percent: { target: number; actual: number; passed: boolean };
  };
  topDiscrepancies: ValidationResult[];
  allResults: ValidationResult[];
}

export interface ValidationReportOutcome {
  calculated: number;
  coverageFloor: number;
  coverageFloorPassed: boolean;
  accuracyGatesPassed: boolean;
}

export interface WriteValidationReportOptions {
  totalUnits: number;
  excluded: ExcludedValidationUnit[];
  results: ValidationResult[];
  outputPath: string;
  coverageFloor: number;
}

function buildPareto(results: ValidationResult[]): ParetoAnalysis {
  const fails = results.filter(
    (r) =>
      r.status !== 'exact' &&
      r.status !== 'within1' &&
      r.status !== 'within2' &&
      r.status !== 'error',
  );
  const cats: Record<string, { units: string[]; diffs: number[] }> = {};
  for (const r of fails) {
    const c = r.rootCause || 'unknown';
    if (!cats[c]) cats[c] = { units: [], diffs: [] };
    cats[c].units.push(`${r.chassis} ${r.model}`);
    cats[c].diffs.push(Math.abs(r.percentDiff || 0));
  }
  return {
    generatedAt: new Date().toISOString(),
    totalFailures: fails.length,
    categories: Object.entries(cats)
      .map(([n, d]) => ({
        name: n,
        count: d.units.length,
        units: d.units.slice(0, 10),
        avgAbsPercentDiff: d.diffs.reduce((a, b) => a + b, 0) / d.diffs.length,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

function writeJson(
  outputPath: string,
  fileName: string,
  value: unknown,
  pretty = false,
): void {
  fs.writeFileSync(
    path.join(outputPath, fileName),
    JSON.stringify(value, null, pretty ? 2 : undefined),
  );
}

export function writeValidationReportArtifacts({
  totalUnits,
  excluded,
  results,
  outputPath,
  coverageFloor,
}: WriteValidationReportOptions): ValidationReportOutcome {
  const calc = results.filter((r) => r.status !== 'error').length;
  const fail = results.filter((r) => r.status === 'error').length;
  const exact = results.filter((r) => r.status === 'exact').length;
  const w1 = results.filter(
    (r) => r.status === 'exact' || r.status === 'within1',
  ).length;
  const w2 = results.filter((r) =>
    ['exact', 'within1', 'within2'].includes(r.status),
  ).length;
  const w3 = results.filter((r) =>
    ['exact', 'within1', 'within2', 'within3'].includes(r.status),
  ).length;
  const o3 = results.filter((r) => r.status === 'over3').length;
  const w1p = calc > 0 ? (w1 / calc) * 100 : 0;
  const w2p = calc > 0 ? (w2 / calc) * 100 : 0;
  const w3p = calc > 0 ? (w3 / calc) * 100 : 0;
  const g1 = w1p >= 95.0;
  const g2 = w2p >= 99.0;
  const g3 = w3p >= 99.5;
  const coverageFloorPassed = calc >= coverageFloor;

  console.log(
    `\n=== SUMMARY ===\nTotal: ${totalUnits}  Excluded: ${excluded.length}  Validated: ${calc + fail}  Calculated: ${calc}  Failed: ${fail}`,
  );
  console.log(
    `\nExact: ${exact} (${((exact / calc) * 100).toFixed(1)}%)\nWithin 1%: ${w1} (${w1p.toFixed(1)}%)\nWithin 2%: ${w2} (${w2p.toFixed(1)}%)\nWithin 3%: ${w3} (${w3p.toFixed(1)}%)\nOver 3%: ${o3} (${((o3 / calc) * 100).toFixed(1)}%)`,
  );
  console.log(
    `\n=== ACCURACY GATES ===\nWithin 1%:  ${w1p.toFixed(1)}% (target: 95.0%) ${g1 ? '✅ PASS' : '❌ FAIL'}\nWithin 2%:  ${w2p.toFixed(1)}% (target: 99.0%) ${g2 ? '✅ PASS' : '❌ FAIL'}\nWithin 3%:  ${w3p.toFixed(1)}% (target: 99.5%) ${g3 ? '✅ PASS' : '❌ FAIL'}`,
  );
  console.log(
    `\nCoverage floor: ${calc}/${coverageFloor} ${coverageFloorPassed ? '✅ PASS' : '❌ FAIL'}`,
  );

  if (excluded.length > 0) {
    console.log(`\n=== EXCLUDED (${excluded.length}) ===`);
    const byReason: Record<string, number> = {};
    for (const e of excluded) {
      const k = e.reason.replace(/\s*\(\d+t\)/, '');
      byReason[k] = (byReason[k] || 0) + 1;
    }
    for (const [r, c] of Object.entries(byReason).sort((a, b) => b[1] - a[1]))
      console.log(`  ${r}: ${c}`);
  }

  const top = results
    .filter((r) => r.status !== 'error' && r.percentDiff !== null)
    .sort((a, b) => Math.abs(b.percentDiff!) - Math.abs(a.percentDiff!))
    .slice(0, 20);
  console.log('\n=== TOP 20 DISCREPANCIES ===\n' + '-'.repeat(102));
  for (const d of top)
    console.log(
      `${`${d.chassis} ${d.model}`.padEnd(40).slice(0, 40)}${String(d.indexBV).padStart(8)}${String(d.calculatedBV).padStart(9)}${((d.difference! >= 0 ? '+' : '') + d.difference!).padStart(8)}${((d.percentDiff! >= 0 ? '+' : '') + d.percentDiff!.toFixed(1) + '%').padStart(8)}  ${d.rootCause || 'unknown'}`,
    );

  const pareto = buildPareto(results);
  console.log('\n=== PARETO ANALYSIS ===');
  for (const c of pareto.categories)
    console.log(
      `  ${c.name}: ${c.count} units (avg ${c.avgAbsPercentDiff.toFixed(1)}% off)`,
    );

  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
  const report: ValidationReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUnits,
      excludedAllowlist: excluded.length,
      validatedUnits: calc + fail,
      calculated: calc,
      failedToCalculate: fail,
      exactMatch: exact,
      within1Percent: w1,
      within2Percent: w2,
      within3Percent: w3,
      over3Percent: o3,
      within1PercentPct: Math.round(w1p * 10) / 10,
      within2PercentPct: Math.round(w2p * 10) / 10,
      within3PercentPct: Math.round(w3p * 10) / 10,
    },
    accuracyGates: {
      within1Percent: {
        target: 95.0,
        actual: Math.round(w1p * 10) / 10,
        passed: g1,
      },
      within2Percent: {
        target: 99.0,
        actual: Math.round(w2p * 10) / 10,
        passed: g2,
      },
      within3Percent: {
        target: 99.5,
        actual: Math.round(w3p * 10) / 10,
        passed: g3,
      },
    },
    topDiscrepancies: top,
    allResults: results,
  };
  writeJson(outputPath, 'bv-validation-report.json', report, true);

  // Compact results omit full breakdowns so follow-up analysis stays lightweight.
  const compactResults = results.map((r) => ({
    id: r.unitId,
    name: `${r.chassis} ${r.model}`,
    ton: r.tonnage,
    ref: r.indexBV,
    calc: r.calculatedBV,
    diff: r.difference,
    pct: r.percentDiff != null ? Math.round(r.percentDiff * 10) / 10 : null,
    status: r.status,
    cause: r.rootCause || null,
    defBV: r.breakdown?.defensiveBV,
    offBV: r.breakdown?.offensiveBV,
    weapBV: r.breakdown?.weaponBV,
    ammoBV: r.breakdown?.ammoBV,
    sf: r.breakdown?.speedFactor,
    explPen: r.breakdown?.explosivePenalty,
    defEqBV: r.breakdown?.defensiveEquipBV,
    physBV: r.breakdown?.physicalWeaponBV,
    weight: r.breakdown?.weightBonus,
    armorBV: r.breakdown?.armorBV,
    isBV: r.breakdown?.structureBV,
    gyroBV: r.breakdown?.gyroBV,
    defFactor: r.breakdown?.defensiveFactor,
  }));
  writeJson(outputPath, 'bv-all-results.json', compactResults);
  writeJson(outputPath, 'bv-pareto-analysis.json', pareto, true);

  console.log(`\nReports: ${outputPath}/`);
  return {
    calculated: calc,
    coverageFloor,
    coverageFloorPassed,
    accuracyGatesPassed: g1 && g2 && g3,
  };
}
