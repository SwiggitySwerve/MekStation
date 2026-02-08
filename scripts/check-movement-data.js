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

// Check for suspicious movement data in outside-1% units
const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
console.log('=== Movement data checks for outside-1% units ===\n');

for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const b = u.breakdown || {};

  // Check: walk MP consistency with engine rating and tonnage
  const expectedWalk = Math.floor(data.engine?.rating / data.tonnage);
  const actualWalk = data.movement?.walk || 0;

  if (expectedWalk !== actualWalk && expectedWalk > 0) {
    console.log(`WALK MISMATCH: ${u.chassis} ${u.model} (${u.percentDiff.toFixed(2)}%): data.walk=${actualWalk} expected=${expectedWalk} (rating=${data.engine?.rating} tonnage=${data.tonnage})`);
  }

  // Check: suspicious jump values (jump > walk * 2 or jump = 0 but has JJ in crits)
  const jump = data.movement?.jump || 0;
  const crits = data.criticalSlots || {};
  const allCrits = Object.values(crits).flat().filter(Boolean);
  const hasJJ = allCrits.some(s => {
    const lo = s.toLowerCase();
    return lo.includes('jump jet') || lo.includes('jumpjet');
  });

  if (jump > 0 && jump > actualWalk * 2) {
    console.log(`HIGH JUMP: ${u.chassis} ${u.model} (${u.percentDiff.toFixed(2)}%): jump=${jump} walk=${actualWalk}`);
  }
  if (hasJJ && jump === 0) {
    console.log(`JJ BUT NO JUMP: ${u.chassis} ${u.model} (${u.percentDiff.toFixed(2)}%)`);
  }
}

// Check: tonnage consistency with gyro BV
console.log('\n=== Gyro BV checks ===');
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const b = u.breakdown || {};
  const gyroType = data.gyro?.type || 'STANDARD';
  const expectedGyro = gyroType === 'HEAVY_DUTY' ? data.tonnage * 1.0
    : gyroType === 'NONE' ? 0
    : data.tonnage * 0.5;
  const actualGyro = b.gyroBV || 0;

  if (Math.abs(actualGyro - expectedGyro) > 0.1) {
    console.log(`GYRO MISMATCH: ${u.chassis} ${u.model} (${u.percentDiff.toFixed(2)}%): gyroBV=${actualGyro} expected=${expectedGyro} gyroType=${gyroType} tonnage=${data.tonnage}`);
  }
}

// Check heat sink count consistency
console.log('\n=== Heat sink count anomalies ===');
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const b = u.breakdown || {};
  const isDHS = data.heatSinks?.type?.toUpperCase().includes('DOUBLE');
  const hsCount = data.heatSinks?.count || 10;
  const expectedDiss = hsCount * (isDHS ? 2 : 1);
  const actualDiss = b.heatDissipation || 0;

  // Large discrepancy between expected and actual
  if (actualDiss > 0 && Math.abs(actualDiss - expectedDiss) > 3) {
    console.log(`HS MISMATCH: ${u.chassis} ${u.model} (${u.percentDiff.toFixed(2)}%): diss=${actualDiss} expected=${expectedDiss} count=${hsCount} type=${data.heatSinks?.type}`);
  }
}
