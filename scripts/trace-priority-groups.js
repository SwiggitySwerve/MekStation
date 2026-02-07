// Trace the highest-impact groups from dimensional analysis
const fs = require('fs');
const path = require('path');
const report = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

const outliers = report.allResults.filter(x => {
  return x.status !== 'exact' && x.status !== 'within1' && x.breakdown;
});

function loadUnit(id) {
  const entry = idx.units.find(x => x.id === id);
  if (!entry) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', entry.path), 'utf8')); }
  catch(e) { return null; }
}

function detectSystems(unit) {
  const crits = unit.criticalSlots ? Object.values(unit.criticalSlots).flat().filter(Boolean).map(s => typeof s === 'string' ? s : '') : [];
  return {
    hasMASC: crits.some(s => /masc/i.test(s)),
    hasSC: crits.some(s => /supercharger/i.test(s)),
    hasTC: crits.some(s => /targeting/i.test(s)),
    hasTSM: crits.some(s => /triple.*strength|tsm/i.test(s)),
    hasC3: crits.some(s => /c3/i.test(s)),
    hasBAP: crits.some(s => /active.*probe|beagle|bloodhound/i.test(s)),
  };
}

function noSpecialSystems(sys) {
  return ![sys.hasMASC, sys.hasSC, sys.hasTC, sys.hasTSM, sys.hasC3, sys.hasBAP].some(Boolean);
}

// === GROUP 1: CLAN_XL / none ===
console.log('=== CLAN_XL / no special systems (highest impact group) ===');
const clanXLNone = [];
for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  if (unit.engine?.type !== 'CLAN_XL') continue;
  if (!noSpecialSystems(detectSystems(unit))) continue;
  const b = u.breakdown;
  clanXLNone.push({ name: (u.chassis + ' ' + u.model).trim(), diff: u.difference, pct: u.percentDiff,
    defBV: b.defensiveBV, offBV: b.offensiveBV, weaponBV: b.weaponBV, ammoBV: b.ammoBV || 0,
    armorBV: b.armorBV, structBV: b.structureBV, gyroBV: b.gyroBV,
    defFactor: b.defensiveFactor, speedFactor: b.speedFactor,
    heatEff: b.heatEfficiency, heatDiss: b.heatDissipation,
    tonnage: unit.tonnage, indexBV: u.indexBV });
}
clanXLNone.sort((a, b) => a.diff - b.diff);
for (const u of clanXLNone) {
  const total = u.defBV + u.offBV;
  const defPct = ((u.defBV / total) * 100).toFixed(0);
  console.log(`  ${u.name.padEnd(35)} diff=${String(u.diff).padStart(5)} (${u.pct.toFixed(1)}%)  def=${String(Math.round(u.defBV)).padStart(5)} (${defPct}%) off=${String(Math.round(u.offBV)).padStart(5)} sf=${u.speedFactor.toFixed(2)} df=${u.defFactor.toFixed(2)} hEff=${u.heatEff} wBV=${Math.round(u.weaponBV)} aBV=${Math.round(u.ammoBV)}`);
}

// === GROUP 2: LIGHT / none ===
console.log('\n=== LIGHT engine / no special systems ===');
const lightNone = [];
for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  if (unit.engine?.type !== 'LIGHT') continue;
  if (!noSpecialSystems(detectSystems(unit))) continue;
  const b = u.breakdown;
  lightNone.push({ name: (u.chassis + ' ' + u.model).trim(), diff: u.difference, pct: u.percentDiff,
    defBV: b.defensiveBV, offBV: b.offensiveBV, weaponBV: b.weaponBV,
    armorBV: b.armorBV, structBV: b.structureBV, gyroBV: b.gyroBV,
    defFactor: b.defensiveFactor, speedFactor: b.speedFactor, heatEff: b.heatEfficiency, tonnage: unit.tonnage });
}
lightNone.sort((a, b) => a.diff - b.diff);
for (const u of lightNone) {
  console.log(`  ${u.name.padEnd(35)} diff=${String(u.diff).padStart(5)} (${u.pct.toFixed(1)}%)  def=${String(Math.round(u.defBV)).padStart(5)} off=${String(Math.round(u.offBV)).padStart(5)} sf=${u.speedFactor.toFixed(2)} df=${u.defFactor.toFixed(2)} hEff=${u.heatEff} struct=${Math.round(u.structBV)} armor=${Math.round(u.armorBV)}`);
}

// === GROUP 3: FUSION / TC ===
console.log('\n=== FUSION engine + TC ===');
const fusionTC = [];
for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  if (unit.engine?.type !== 'FUSION') continue;
  if (!detectSystems(unit).hasTC) continue;
  const b = u.breakdown;
  fusionTC.push({ name: (u.chassis + ' ' + u.model).trim(), diff: u.difference, pct: u.percentDiff,
    defBV: b.defensiveBV, offBV: b.offensiveBV, weaponBV: b.weaponBV,
    armorBV: b.armorBV, structBV: b.structureBV, gyroBV: b.gyroBV,
    defFactor: b.defensiveFactor, speedFactor: b.speedFactor, heatEff: b.heatEfficiency });
}
fusionTC.sort((a, b) => a.diff - b.diff);
for (const u of fusionTC) {
  console.log(`  ${u.name.padEnd(35)} diff=${String(u.diff).padStart(5)} (${u.pct.toFixed(1)}%)  def=${String(Math.round(u.defBV)).padStart(5)} off=${String(Math.round(u.offBV)).padStart(5)} wBV=${String(Math.round(u.weaponBV)).padStart(5)} sf=${u.speedFactor.toFixed(2)} df=${u.defFactor.toFixed(2)} hEff=${u.heatEff}`);
}

// === 20 Closest-to-threshold "none" group outliers ===
console.log('\n=== 20 Closest-to-threshold "none" outliers (by |pct|) ===');
const noneUnits = [];
for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  if (!noSpecialSystems(detectSystems(unit))) continue;
  const b = u.breakdown;
  noneUnits.push({ name: (u.chassis + ' ' + u.model).trim(), diff: u.difference, pct: u.percentDiff,
    defBV: b.defensiveBV, offBV: b.offensiveBV, weaponBV: b.weaponBV, ammoBV: b.ammoBV || 0,
    heatEff: b.heatEfficiency, heatDiss: b.heatDissipation,
    armorBV: b.armorBV, structBV: b.structureBV, gyroBV: b.gyroBV,
    defFactor: b.defensiveFactor, speedFactor: b.speedFactor,
    engine: unit.engine?.type, tech: unit.techBase, tonnage: unit.tonnage,
    indexBV: u.indexBV });
}
noneUnits.sort((a, b) => Math.abs(a.pct) - Math.abs(b.pct));
for (const u of noneUnits.slice(0, 20)) {
  const dir = u.diff > 0 ? '+' : '';
  console.log(`  ${u.name.padEnd(35)} ${dir}${String(u.diff).padStart(4)} (${u.pct.toFixed(2)}%) ${(u.engine + '/' + u.tech).padEnd(20)} ${u.tonnage}t  def=${Math.round(u.defBV)} off=${Math.round(u.offBV)} hEff=${u.heatEff} wBV=${Math.round(u.weaponBV)} aBV=${Math.round(u.ammoBV)}`);
}

// === BAP investigation — 15 units, avg -33.9 ===
console.log('\n=== BAP units (avg -33.9, 15 units) ===');
const bapUnits = [];
for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const sys = detectSystems(unit);
  if (!sys.hasBAP) continue;
  const otherFlags = [sys.hasMASC, sys.hasSC, sys.hasTC, sys.hasTSM, sys.hasC3].filter(Boolean);
  const b = u.breakdown;
  bapUnits.push({ name: (u.chassis + ' ' + u.model).trim(), diff: u.difference, pct: u.percentDiff,
    defBV: b.defensiveBV, offBV: b.offensiveBV, defEquipBV: b.defEquipBV || 0,
    weaponBV: b.weaponBV, speedFactor: b.speedFactor, defFactor: b.defensiveFactor,
    engine: unit.engine?.type, tech: unit.techBase, otherSystems: otherFlags.length });
}
bapUnits.sort((a, b) => a.diff - b.diff);
for (const u of bapUnits) {
  console.log(`  ${u.name.padEnd(35)} diff=${String(u.diff).padStart(5)} (${u.pct.toFixed(1)}%)  defEquip=${Math.round(u.defEquipBV)} def=${Math.round(u.defBV)} off=${Math.round(u.offBV)} ${u.engine}/${u.tech}`);
}
