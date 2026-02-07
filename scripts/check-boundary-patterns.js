const r = require('../validation-output/bv-validation-report.json');
const fs = require('fs');
const path = require('path');

const unitIdx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const unitMap = {};
for (const u of unitIdx.units) unitMap[u.id] = u;

const boundary = r.allResults.filter(x => x.status === 'within5');

// Check for movement anomalies
console.log('=== MOVEMENT ANOMALIES ===');
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd) continue;
  const expectedRun = Math.ceil(bd.walkMP * 1.5);
  if (bd.runMP && bd.runMP !== expectedRun) {
    const unit = unitMap[b.unitId];
    const sign = b.difference > 0 ? '+' : '';
    console.log(`  ${b.unitId.padEnd(40)} walk=${bd.walkMP} run=${bd.runMP} (expected ${expectedRun}) ${sign}${b.percentDiff.toFixed(2)}%`);
    if (unit) {
      console.log(`    Engine: ${unit.engineType || '?'}  MASC: ${unit.hasMASC || false}  SC: ${unit.hasSupercharger || false}  Triple-Strength: ${unit.myomerType || 'Standard'}`);
    }
  }
}

// Check for issues in boundary units
console.log('\n=== ISSUES IN BOUNDARY UNITS ===');
const issueCounts = {};
for (const b of boundary) {
  if (b.issues) {
    for (const issue of b.issues) {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }
  }
}
const sortedIssues = Object.entries(issueCounts).sort((a,b) => b[1] - a[1]);
for (const [issue, count] of sortedIssues) {
  console.log(`  ${count}x: ${issue}`);
}

// Check for unresolved weapons
console.log('\n=== UNRESOLVED WEAPON PATTERNS ===');
const unresolvedCounts = {};
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd) continue;
  if (bd.unresolvedWeapons) {
    for (const w of bd.unresolvedWeapons) {
      unresolvedCounts[w] = (unresolvedCounts[w] || 0) + 1;
    }
  }
}
if (Object.keys(unresolvedCounts).length === 0) {
  console.log('  No unresolved weapons tracked in breakdown');
} else {
  const sortedUnresolved = Object.entries(unresolvedCounts).sort((a,b) => b[1] - a[1]);
  for (const [w, count] of sortedUnresolved) {
    console.log(`  ${count}x: ${w}`);
  }
}

// Check defensive equipment BV patterns
console.log('\n=== DEFENSIVE EQUIPMENT BV ===');
let withDefEquip = 0, withoutDefEquip = 0;
let underWithDef = 0, overWithDef = 0;
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd) continue;
  if (bd.defEquipBV || bd.defensiveEquipBV) {
    withDefEquip++;
    if (b.difference < 0) underWithDef++;
    else overWithDef++;
  } else {
    withoutDefEquip++;
  }
}
console.log(`  With defensive equip BV: ${withDefEquip} (${underWithDef} under, ${overWithDef} over)`);
console.log(`  Without: ${withoutDefEquip}`);

// Check armored components
console.log('\n=== ARMORED COMPONENTS ===');
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd || !bd.armoredComponentBV) continue;
  const sign = b.difference > 0 ? '+' : '';
  console.log(`  ${b.unitId.padEnd(40)} armoredBV=${bd.armoredComponentBV}  ${sign}${b.percentDiff.toFixed(2)}%`);
}

// Check heat efficiency patterns
console.log('\n=== HEAT EFFICIENCY PATTERNS ===');
let heatAnomalies = 0;
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd) continue;
  const expectedHeatEff = 6 + (bd.heatDissipation || 0) - (bd.moveHeat || 0);
  if (bd.heatEfficiency && Math.abs(bd.heatEfficiency - expectedHeatEff) > 0.1) {
    const sign = b.difference > 0 ? '+' : '';
    console.log(`  ${b.unitId.padEnd(40)} heatEff=${bd.heatEfficiency} expected=${expectedHeatEff} dissipation=${bd.heatDissipation} moveHeat=${bd.moveHeat} ${sign}${b.percentDiff.toFixed(2)}%`);
    heatAnomalies++;
  }
}
if (heatAnomalies === 0) console.log('  No heat efficiency anomalies found');

// Check explosive penalty patterns
console.log('\n=== EXPLOSIVE PENALTY DISTRIBUTION ===');
let underWithExp = 0, overWithExp = 0;
let underExpTotal = 0, overExpTotal = 0;
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd || !bd.explosivePenalty) continue;
  if (b.difference < 0) {
    underWithExp++;
    underExpTotal += bd.explosivePenalty;
  } else {
    overWithExp++;
    overExpTotal += bd.explosivePenalty;
  }
}
console.log(`  Under with explosive penalty: ${underWithExp} (avg penalty: ${underWithExp ? (underExpTotal/underWithExp).toFixed(0) : 'n/a'})`);
console.log(`  Over with explosive penalty: ${overWithExp} (avg penalty: ${overWithExp ? (overExpTotal/overWithExp).toFixed(0) : 'n/a'})`);

// Speed factor distribution
console.log('\n=== SPEED FACTOR DISTRIBUTION ===');
const sfBuckets = { under: {}, over: {} };
for (const b of boundary) {
  const bd = b.breakdown;
  if (!bd || !bd.speedFactor) continue;
  const side = b.difference < 0 ? 'under' : 'over';
  const sf = bd.speedFactor.toFixed(2);
  sfBuckets[side][sf] = (sfBuckets[side][sf] || 0) + 1;
}
console.log('  Speed Factor  Under  Over');
const allSFs = new Set([...Object.keys(sfBuckets.under), ...Object.keys(sfBuckets.over)]);
for (const sf of [...allSFs].sort()) {
  const u = sfBuckets.under[sf] || 0;
  const o = sfBuckets.over[sf] || 0;
  console.log(`  ${sf.padEnd(14)} ${String(u).padStart(5)} ${String(o).padStart(5)}`);
}
