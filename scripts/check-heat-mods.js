const r = require('../validation-output/bv-validation-report.json');
const idx = require('../public/data/units/battlemechs/index.json');
const fs = require('fs');
const path = require('path');

function loadUnit(id) {
  const ie = idx.units.find(e => e.id === id);
  if (!ie || !ie.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = r.allResults.filter(x => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// For all outliers, check how many have Ultra, Rotary, Streak, One-shot, PPC cap
const outliers = valid.filter(x => Math.abs(x.percentDiff) > 1);
let streakCount = 0, ultraCount = 0, rotaryCount = 0, osCount = 0, ppcCapCount = 0;
let streakUnder = 0, streakOver = 0, ultraUnder = 0, ultraOver = 0;
let rotaryUnder = 0, rotaryOver = 0, osUnder = 0, osOver = 0;

for (const u of outliers) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const crits = JSON.stringify(unit.criticalSlots || {}).toLowerCase();
  const isUnder = u.percentDiff < 0;
  
  if (crits.includes('streak')) { streakCount++; if (isUnder) streakUnder++; else streakOver++; }
  if (crits.includes('ultra') || crits.includes('uac')) { ultraCount++; if (isUnder) ultraUnder++; else ultraOver++; }
  if (crits.includes('rotary') || crits.includes('rac')) { rotaryCount++; if (isUnder) rotaryUnder++; else rotaryOver++; }
  if (crits.includes(' (os)') || crits.includes('-os')) { osCount++; if (isUnder) osUnder++; else osOver++; }
  if (crits.includes('ppc capacitor') || crits.includes('ppccapacitor')) { ppcCapCount++; }
}

console.log('=== ALL OUTLIERS (>1% off) ===');
console.log('Total outliers:', outliers.length, '(under:', outliers.filter(x => x.percentDiff < 0).length, 'over:', outliers.filter(x => x.percentDiff > 0).length + ')');
console.log('Streak:', streakCount, '(under:', streakUnder, 'over:', streakOver + ')');
console.log('Ultra:', ultraCount, '(under:', ultraUnder, 'over:', ultraOver + ')');
console.log('Rotary:', rotaryCount, '(under:', rotaryUnder, 'over:', rotaryOver + ')');
console.log('One-shot:', osCount, '(under:', osUnder, 'over:', osOver + ')');
console.log('PPC Cap:', ppcCapCount);

// Now check weapons in the breakdown for heat values
console.log('\n=== SAMPLE STREAK WEAPON HEAT VALUES IN BREAKDOWN ===');
const streakSamples = outliers.filter(x => {
  const unit = loadUnit(x.unitId);
  return unit && JSON.stringify(unit.criticalSlots || {}).toLowerCase().includes('streak');
}).slice(0, 5);

for (const u of streakSamples) {
  const b = u.breakdown;
  if (!b || !b.weapons) continue;
  console.log('\n' + u.unitId + ' (' + u.percentDiff.toFixed(2) + '%)');
  for (const w of b.weapons) {
    const isStreak = (w.id || '').toLowerCase().includes('streak');
    const isUltra = (w.id || '').toLowerCase().includes('ultra') || (w.id || '').toLowerCase().includes('uac');
    const isRotary = (w.id || '').toLowerCase().includes('rotary') || (w.id || '').toLowerCase().includes('rac');
    if (isStreak || isUltra || isRotary) {
      console.log('  ' + (w.id||'?').padEnd(30) + ' bv=' + (w.bv||0).toString().padStart(4) + ' heat=' + (w.heat||0).toString().padStart(2) + ' [' + (isStreak?'STREAK':'') + (isUltra?'ULTRA':'') + (isRotary?'ROTARY':'') + ']');
    }
  }
}

// Check ULTRA AC heat values
console.log('\n=== ULTRA AC WEAPON HEAT VALUES (should be 2x nominal for BV) ===');
const ultraSamples = outliers.filter(x => {
  const unit = loadUnit(x.unitId);
  return unit && JSON.stringify(unit.criticalSlots || {}).toLowerCase().includes('ultra');
}).slice(0, 5);

for (const u of ultraSamples) {
  const b = u.breakdown;
  if (!b || !b.weapons) continue;
  console.log('\n' + u.unitId + ' (' + u.percentDiff.toFixed(2) + '%)');
  for (const w of b.weapons) {
    const id = (w.id || '').toLowerCase();
    if (id.includes('ultra') || id.includes('uac')) {
      console.log('  ' + (w.id||'?').padEnd(30) + ' bv=' + (w.bv||0).toString().padStart(4) + ' heat=' + (w.heat||0).toString().padStart(2) + ' [ULTRA - MegaMek should use heat*2]');
    }
  }
}

// Check ROTARY AC heat values  
console.log('\n=== ROTARY AC WEAPON HEAT VALUES (should be 6x nominal for BV) ===');
const rotarySamples = outliers.filter(x => {
  const unit = loadUnit(x.unitId);
  return unit && JSON.stringify(unit.criticalSlots || {}).toLowerCase().includes('rotary');
}).slice(0, 5);

for (const u of rotarySamples) {
  const b = u.breakdown;
  if (!b || !b.weapons) continue;
  console.log('\n' + u.unitId + ' (' + u.percentDiff.toFixed(2) + '%)');
  for (const w of b.weapons) {
    const id = (w.id || '').toLowerCase();
    if (id.includes('rotary') || id.includes('rac')) {
      console.log('  ' + (w.id||'?').padEnd(30) + ' bv=' + (w.bv||0).toString().padStart(4) + ' heat=' + (w.heat||0).toString().padStart(2) + ' [ROTARY - MegaMek should use heat*6]');
    }
  }
}
