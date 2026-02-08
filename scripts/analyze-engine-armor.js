const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

// Group by engine type
const byEngine = {};
for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const eng = data.engine?.type || 'UNKNOWN';
  byEngine[eng] = byEngine[eng] || { total: 0, outside1: 0, sumDiff: 0, under: 0, over: 0 };
  byEngine[eng].total++;
  byEngine[eng].sumDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) > 1) {
    byEngine[eng].outside1++;
    if (u.percentDiff < 0) byEngine[eng].under++;
    else byEngine[eng].over++;
  }
}
console.log('=== Accuracy by engine type ===');
for (const [eng, d] of Object.entries(byEngine).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${eng}: ${d.total} units, ${d.outside1} outside 1% (${(d.outside1/d.total*100).toFixed(1)}%), avg ${(d.sumDiff/d.total).toFixed(3)}% (${d.under} under, ${d.over} over)`);
}

// Group by armor type
const byArmor = {};
for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const arm = data.armor?.type || 'UNKNOWN';
  byArmor[arm] = byArmor[arm] || { total: 0, outside1: 0, sumDiff: 0, under: 0, over: 0 };
  byArmor[arm].total++;
  byArmor[arm].sumDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) > 1) {
    byArmor[arm].outside1++;
    if (u.percentDiff < 0) byArmor[arm].under++;
    else byArmor[arm].over++;
  }
}
console.log('\n=== Accuracy by armor type ===');
for (const [arm, d] of Object.entries(byArmor).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${arm}: ${d.total} units, ${d.outside1} outside 1% (${(d.outside1/d.total*100).toFixed(1)}%), avg ${(d.sumDiff/d.total).toFixed(3)}% (${d.under} under, ${d.over} over)`);
}

// Group by structure type
const byStruct = {};
for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const st = data.structure?.type || 'UNKNOWN';
  byStruct[st] = byStruct[st] || { total: 0, outside1: 0, sumDiff: 0, under: 0, over: 0 };
  byStruct[st].total++;
  byStruct[st].sumDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) > 1) {
    byStruct[st].outside1++;
    if (u.percentDiff < 0) byStruct[st].under++;
    else byStruct[st].over++;
  }
}
console.log('\n=== Accuracy by structure type ===');
for (const [st, d] of Object.entries(byStruct).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${st}: ${d.total} units, ${d.outside1} outside 1% (${(d.outside1/d.total*100).toFixed(1)}%), avg ${(d.sumDiff/d.total).toFixed(3)}% (${d.under} under, ${d.over} over)`);
}

// Group by gyro type
const byGyro = {};
for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const gy = data.gyro?.type || 'UNKNOWN';
  byGyro[gy] = byGyro[gy] || { total: 0, outside1: 0, sumDiff: 0, under: 0, over: 0 };
  byGyro[gy].total++;
  byGyro[gy].sumDiff += u.percentDiff;
  if (Math.abs(u.percentDiff) > 1) {
    byGyro[gy].outside1++;
    if (u.percentDiff < 0) byGyro[gy].under++;
    else byGyro[gy].over++;
  }
}
console.log('\n=== Accuracy by gyro type ===');
for (const [gy, d] of Object.entries(byGyro).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${gy}: ${d.total} units, ${d.outside1} outside 1% (${(d.outside1/d.total*100).toFixed(1)}%), avg ${(d.sumDiff/d.total).toFixed(3)}% (${d.under} under, ${d.over} over)`);
}
