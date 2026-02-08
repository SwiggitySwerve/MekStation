/**
 * Analyze units >2% off to find fixable patterns.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const band2 = valid.filter((x: any) => Math.abs(x.percentDiff) > 2);

// Check issues in 2%+ band
const issueMap = new Map<string, number>();
for (const u of band2) {
  const issues = u.breakdown?.issues || [];
  if (issues.length === 0) { issueMap.set('(no issues)', (issueMap.get('(no issues)') || 0) + 1); continue; }
  for (const iss of issues) {
    // Categorize: "Unresolved weapons: X" → "unresolved-weapons"
    // "Unresolved ammo" → "unresolved-ammo"
    let key: string;
    if (iss.includes('Unresolved weapons')) key = 'unresolved-weapons';
    else if (iss.includes('Unresolved ammo')) key = 'unresolved-ammo';
    else if (iss.includes('ammoBV=0')) key = 'ammoBV-zero';
    else key = iss.substring(0, 50);
    issueMap.set(key, (issueMap.get(key) || 0) + 1);
  }
}

console.log(`=== >2% BAND: ${band2.length} units ===\n`);
console.log('Issue distribution:');
for (const [k, c] of [...issueMap.entries()].sort((a,b) => b[1]-a[1])) {
  console.log(`  ${String(c).padStart(4)}x ${k}`);
}

// For no-issue >2% units, look at defensive equipment patterns
const noIssue = band2.filter((x: any) => !x.breakdown?.issues?.length);
const over = noIssue.filter((x: any) => x.percentDiff > 0);
const under = noIssue.filter((x: any) => x.percentDiff < 0);

console.log(`\nNo-issue >2%: ${noIssue.length} (over: ${over.length}, under: ${under.length})`);

// Check defensive equipment BV distribution for overcalculated
console.log('\n--- OVERCALCULATED >2% no-issue ---');
for (const u of over.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 20)) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  const cockpit = unit?.cockpit || 'STANDARD';
  console.log(`${u.unitId.padEnd(45)} ref=${String(u.indexBV).padStart(5)} calc=${String(u.calculatedBV).padStart(5)} diff=${String(u.difference).padStart(5)} (${u.percentDiff.toFixed(1).padStart(5)}%) DEF=${b?.defensiveBV?.toFixed(0)?.padStart(5)} OFF=${b?.offensiveBV?.toFixed(0)?.padStart(5)} HE=${String(b?.heatEfficiency).padStart(3)} cockpit=${cockpit} defEq=${b?.defEquipBV?.toFixed(0)} expPen=${b?.explosivePenalty?.toFixed(0)}`);
}

console.log('\n--- UNDERCALCULATED >2% no-issue ---');
for (const u of under.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 20)) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  const cockpit = unit?.cockpit || 'STANDARD';
  console.log(`${u.unitId.padEnd(45)} ref=${String(u.indexBV).padStart(5)} calc=${String(u.calculatedBV).padStart(5)} diff=${String(u.difference).padStart(5)} (${u.percentDiff.toFixed(1).padStart(5)}%) DEF=${b?.defensiveBV?.toFixed(0)?.padStart(5)} OFF=${b?.offensiveBV?.toFixed(0)?.padStart(5)} HE=${String(b?.heatEfficiency).padStart(3)} cockpit=${cockpit} defEq=${b?.defEquipBV?.toFixed(0)} expPen=${b?.explosivePenalty?.toFixed(0)}`);
}

// Check what specific unresolved weapons remain
const unresolvedMap = new Map<string, number>();
for (const u of band2) {
  for (const iss of u.breakdown?.issues || []) {
    const m = iss.match(/Unresolved weapons.*?: (.+)/);
    if (m) {
      for (const w of m[1].split(', ')) {
        unresolvedMap.set(w, (unresolvedMap.get(w) || 0) + 1);
      }
    }
  }
}
if (unresolvedMap.size > 0) {
  console.log('\n--- UNRESOLVED WEAPONS IN >2% ---');
  for (const [w, c] of [...unresolvedMap.entries()].sort((a,b) => b[1]-a[1]).slice(0, 20)) {
    console.log(`  ${String(c).padStart(3)}x ${w}`);
  }
}
