import * as fs from 'fs';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));
const v = r.allResults.filter((x:any) => x.status !== 'error' && x.percentDiff !== null);
const w1 = v.filter((x:any) => Math.abs(x.percentDiff) <= 1).length;
console.log('Total valid:', v.length, 'Within 1%:', w1, 'Pct:', (w1/v.length*100).toFixed(1)+'%');
const near = v.filter((x:any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);
const under = near.filter((x:any) => x.percentDiff < -1);
const over = near.filter((x:any) => x.percentDiff > 1);
console.log('1-2% band:', near.length, '(under:', under.length, 'over:', over.length, ')');
const far = v.filter((x:any) => Math.abs(x.percentDiff) > 2);
console.log('>2% band:', far.length);

// Break down the 1-2% band by issues
const nearWithIssues = near.filter((x:any) => x.breakdown?.issues?.length > 0);
console.log('\n1-2% band with issues:', nearWithIssues.length);

// Group issues
const issueMap = new Map<string, number>();
for (const u of near) {
  const issues = u.breakdown?.issues || [];
  if (issues.length === 0) { issueMap.set('(no issues)', (issueMap.get('(no issues)') || 0) + 1); continue; }
  for (const iss of issues) {
    const key = iss.replace(/:.+/, '').trim();
    issueMap.set(key, (issueMap.get(key) || 0) + 1);
  }
}
console.log('\nIssue categories in 1-2% band:');
for (const [k, c] of [...issueMap.entries()].sort((a,b) => b[1]-a[1])) {
  console.log(`  ${String(c).padStart(4)}x ${k}`);
}

// For no-issue units in 1-2%, check BV diff in absolute terms
const noIssue = near.filter((x:any) => !x.breakdown?.issues?.length);
const noIssueUnder = noIssue.filter((x:any) => x.percentDiff < -1);
const noIssueOver = noIssue.filter((x:any) => x.percentDiff > 1);
console.log(`\nNo-issue 1-2% units: ${noIssue.length} (under:${noIssueUnder.length}, over:${noIssueOver.length})`);
const avgAbsDiff = noIssue.reduce((s:number,u:any) => s + Math.abs(u.difference), 0) / noIssue.length;
console.log(`  Avg abs BV diff: ${avgAbsDiff.toFixed(1)}`);

// Check if overcalculated no-issue units have specific patterns
console.log('\nSample overcalculated 1-2% no-issue:');
for (const u of noIssueOver.slice(0, 15)) {
  const b = u.breakdown;
  console.log(`  ${u.unitId.padEnd(40)} ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%) DF=${b?.defensiveFactor} SF=${b?.speedFactor} HE=${b?.heatEfficiency}`);
}
console.log('\nSample undercalculated 1-2% no-issue:');
for (const u of noIssueUnder.slice(0, 15)) {
  const b = u.breakdown;
  console.log(`  ${u.unitId.padEnd(40)} ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%) DF=${b?.defensiveFactor} SF=${b?.speedFactor} HE=${b?.heatEfficiency}`);
}
