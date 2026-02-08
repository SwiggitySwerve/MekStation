const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Units with diff=1 (just 1 BV off from exact)
const diff1 = r.allResults.filter(u => Math.abs(u.difference) === 1 && u.difference !== 0);
console.log('Units off by exactly 1 BV:', diff1.length);
console.log('  Overcalculated (our BV +1):', diff1.filter(u => u.difference > 0).length);
console.log('  Undercalculated (our BV -1):', diff1.filter(u => u.difference < 0).length);

// Units with diff=2
const diff2 = r.allResults.filter(u => Math.abs(u.difference) === 2 && u.difference !== 0);
console.log('\nUnits off by exactly 2 BV:', diff2.length);

// Units with diff=3-5
const diff3to5 = r.allResults.filter(u => Math.abs(u.difference) >= 3 && Math.abs(u.difference) <= 5);
console.log('Units off by 3-5 BV:', diff3to5.length);

// Distribution of small diffs
for (let d = 1; d <= 10; d++) {
  const count = r.allResults.filter(u => Math.abs(u.difference) === d).length;
  if (count > 0) console.log(`  diff=${d}: ${count} units`);
}

// Check rounding pattern: are we consistently +1 or -1?
const small = r.allResults.filter(u => Math.abs(u.difference) >= 1 && Math.abs(u.difference) <= 3);
const overSmall = small.filter(u => u.difference > 0);
const underSmall = small.filter(u => u.difference < 0);
console.log('\nRounding analysis (diff 1-3 BV):');
console.log('  Overcalculated:', overSmall.length);
console.log('  Undercalculated:', underSmall.length);
console.log('  Ratio:', (overSmall.length / (overSmall.length + underSmall.length) * 100).toFixed(1) + '% over');
