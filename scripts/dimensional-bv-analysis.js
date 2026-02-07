// Multi-dimensional BV gap analysis
// Dimensions: 1) Structure config  2) Special systems (MASC/TSM/TC/etc)  3) Offense/Defense
const fs = require('fs');
const path = require('path');
const report = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

const outliers = report.allResults.filter(x => x.status !== 'exact' && x.status !== 'within1');

function loadUnit(unitId) {
  const entry = idx.units.find(x => x.id === unitId);
  if (!entry) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', entry.path), 'utf8'));
  } catch(e) { return null; }
}

function detectSystems(unit) {
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(Boolean).map(s => typeof s === 'string' ? s : '') : [];
  return {
    hasMASC: crits.some(s => /masc/i.test(s)),
    hasSC: crits.some(s => /supercharger/i.test(s)),
    hasTC: crits.some(s => /targeting/i.test(s)),
    hasTSM: crits.some(s => /triple.*strength|tsm/i.test(s)),
    hasC3: crits.some(s => /c3/i.test(s)),
    hasECM: crits.some(s => /\becm\b/i.test(s)),
    hasStealth: crits.some(s => /stealth/i.test(s)),
    hasBAP: crits.some(s => /active\s*probe|beagle|bloodhound/i.test(s)),
    hasHarjel: crits.some(s => /harjel/i.test(s)),
  };
}

// Classify each outlier into dimensions
const records = [];
for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const sys = detectSystems(unit);
  const b = u.breakdown || {};

  // Dimension 1: Structural configuration
  const structConfig = [
    unit.techBase || 'unknown',
    unit.engine?.type || 'unknown',
    unit.structureType || 'standard',
    unit.armorType || 'standard',
    unit.configuration || 'Biped'
  ].join('/');

  // Dimension 2: Special systems (bitmask key)
  const systemFlags = [];
  if (sys.hasMASC) systemFlags.push('MASC');
  if (sys.hasSC) systemFlags.push('SC');
  if (sys.hasTSM) systemFlags.push('TSM');
  if (sys.hasTC) systemFlags.push('TC');
  if (sys.hasC3) systemFlags.push('C3');
  if (sys.hasECM) systemFlags.push('ECM');
  if (sys.hasStealth) systemFlags.push('Stealth');
  if (sys.hasBAP) systemFlags.push('BAP');
  const systemKey = systemFlags.length ? systemFlags.join('+') : 'none';

  records.push({
    id: u.unitId, name: (u.chassis + ' ' + u.model).trim(),
    diff: u.difference, pct: u.percentDiff,
    structConfig, systemKey, systems: sys,
    tech: unit.techBase, engine: unit.engine?.type,
    armorType: unit.armorType, structType: unit.structureType,
    defBV: b.defensiveBV || 0, offBV: b.offensiveBV || 0,
    weaponBV: b.weaponBV || 0, speedFactor: b.speedFactor || 1,
    defFactor: b.defensiveFactor || 1,
  });
}

// === DIMENSION 1: Structure Configuration ===
console.log('======================================================================');
console.log('DIMENSION 1: STRUCTURAL CONFIGURATION');
console.log('======================================================================');

// Group by engine type
const byEngine = {};
for (const r of records) {
  const key = r.engine || 'unknown';
  if (!byEngine[key]) byEngine[key] = { count: 0, totalGap: 0, over: 0, under: 0 };
  byEngine[key].count++;
  byEngine[key].totalGap += r.diff;
  if (r.diff > 0) byEngine[key].over++; else byEngine[key].under++;
}
console.log('\nBy Engine Type:');
for (const [k, v] of Object.entries(byEngine).sort((a,b) => b[1].count - a[1].count)) {
  const avg = (v.totalGap / v.count).toFixed(1);
  console.log(`  ${k.padEnd(15)} n=${String(v.count).padStart(3)} avg=${avg.padStart(7)} over=${v.over} under=${v.under}`);
}

// Group by tech base
const byTech = {};
for (const r of records) {
  const key = r.tech || 'unknown';
  if (!byTech[key]) byTech[key] = { count: 0, totalGap: 0, over: 0, under: 0 };
  byTech[key].count++;
  byTech[key].totalGap += r.diff;
  if (r.diff > 0) byTech[key].over++; else byTech[key].under++;
}
console.log('\nBy Tech Base:');
for (const [k, v] of Object.entries(byTech).sort((a,b) => b[1].count - a[1].count)) {
  const avg = (v.totalGap / v.count).toFixed(1);
  console.log(`  ${k.padEnd(15)} n=${String(v.count).padStart(3)} avg=${avg.padStart(7)} over=${v.over} under=${v.under}`);
}

// === DIMENSION 2: Special Systems ===
console.log('\n======================================================================');
console.log('DIMENSION 2: SPECIAL SYSTEMS');
console.log('======================================================================');

const bySystem = {};
for (const r of records) {
  const key = r.systemKey;
  if (!bySystem[key]) bySystem[key] = { count: 0, totalGap: 0, over: 0, under: 0, units: [] };
  bySystem[key].count++;
  bySystem[key].totalGap += r.diff;
  if (r.diff > 0) bySystem[key].over++; else bySystem[key].under++;
  bySystem[key].units.push(r.name);
}
console.log('\nBy System Combination (sorted by count):');
for (const [k, v] of Object.entries(bySystem).sort((a,b) => b[1].count - a[1].count)) {
  const avg = (v.totalGap / v.count).toFixed(1);
  const bias = v.over > v.under ? 'OVER-BIASED' : v.under > v.over ? 'UNDER-BIASED' : 'BALANCED';
  console.log(`  ${k.padEnd(25)} n=${String(v.count).padStart(3)} avg=${avg.padStart(7)} over=${v.over} under=${v.under} ${bias}`);
}

// Individual system impact
console.log('\nPer-System Impact (present vs absent):');
const systemNames = ['MASC', 'SC', 'TSM', 'TC', 'C3', 'ECM', 'Stealth', 'BAP'];
for (const sys of systemNames) {
  const withSys = records.filter(r => r.systemKey.includes(sys));
  const withoutSys = records.filter(r => !r.systemKey.includes(sys));
  if (withSys.length < 3) continue;
  const avgWith = withSys.reduce((s, r) => s + r.diff, 0) / withSys.length;
  const avgWithout = withoutSys.reduce((s, r) => s + r.diff, 0) / withoutSys.length;
  const overWith = withSys.filter(r => r.diff > 0).length;
  const underWith = withSys.filter(r => r.diff < 0).length;
  console.log(`  ${sys.padEnd(12)} with: n=${String(withSys.length).padStart(3)} avg=${avgWith.toFixed(1).padStart(7)} (${overWith}↑ ${underWith}↓)  without: n=${String(withoutSys.length).padStart(3)} avg=${avgWithout.toFixed(1).padStart(7)}`);
}

// === DIMENSION 3: Offense vs Defense balance ===
console.log('\n======================================================================');
console.log('DIMENSION 3: OFFENSE/DEFENSE BALANCE');
console.log('======================================================================');

// For each outlier, compute def/off ratio and correlate with gap
const defRatios = records.map(r => {
  const total = r.defBV + r.offBV;
  return { ...r, defRatio: total > 0 ? r.defBV / total : 0.5 };
});

// Group by def-heavy vs off-heavy
const defHeavy = defRatios.filter(r => r.defRatio > 0.6);
const balanced = defRatios.filter(r => r.defRatio >= 0.4 && r.defRatio <= 0.6);
const offHeavy = defRatios.filter(r => r.defRatio < 0.4);

function groupStats(g) {
  const avg = g.reduce((s, r) => s + r.diff, 0) / g.length;
  const over = g.filter(r => r.diff > 0).length;
  const under = g.filter(r => r.diff < 0).length;
  return { n: g.length, avg: avg.toFixed(1), over, under };
}

console.log('\nBy Def/Off Balance:');
const dh = groupStats(defHeavy);
console.log(`  Def-heavy (>60%): n=${dh.n} avg=${dh.avg} over=${dh.over} under=${dh.under}`);
const bl = groupStats(balanced);
console.log(`  Balanced (40-60%): n=${bl.n} avg=${bl.avg} over=${bl.over} under=${bl.under}`);
const oh = groupStats(offHeavy);
console.log(`  Off-heavy (<40%): n=${oh.n} avg=${oh.avg} over=${oh.over} under=${oh.under}`);

// === PRIORITY RANKING ===
console.log('\n======================================================================');
console.log('PRIORITY: HIGHEST-IMPACT FIX OPPORTUNITIES');
console.log('======================================================================');

// Find system/config combinations with strongest bias toward one direction
const allGroups = {};
for (const r of records) {
  // Combine engine + system
  const key = `${r.engine}/${r.systemKey}`;
  if (!allGroups[key]) allGroups[key] = { count: 0, totalGap: 0, over: 0, under: 0 };
  allGroups[key].count++;
  allGroups[key].totalGap += r.diff;
  if (r.diff > 0) allGroups[key].over++; else allGroups[key].under++;
}

// Sort by potential impact (count × |avgGap|, but only strongly biased groups)
const ranked = Object.entries(allGroups)
  .filter(([_, v]) => v.count >= 3)
  .map(([k, v]) => {
    const avg = v.totalGap / v.count;
    const biasRatio = Math.max(v.over, v.under) / v.count;
    return { key: k, ...v, avg, biasRatio, impact: v.count * Math.abs(avg) * biasRatio };
  })
  .sort((a, b) => b.impact - a.impact);

console.log('\nEngine/System combinations ranked by fix impact:');
for (const r of ranked.slice(0, 15)) {
  const dir = r.avg > 0 ? 'OVER' : 'UNDER';
  console.log(`  ${r.key.padEnd(35)} n=${String(r.count).padStart(3)} avg=${r.avg.toFixed(1).padStart(7)} bias=${(r.biasRatio*100).toFixed(0)}% ${dir} impact=${r.impact.toFixed(0)}`);
}
