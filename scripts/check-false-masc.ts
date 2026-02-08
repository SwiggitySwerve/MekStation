/**
 * Check for false MASC/Supercharger detection by comparing
 * equipment list, crit slots, and runMP calculation.
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
const suspectUnits = [
  'alpha-wolf-a', 'berserker-brz-c3', 'black-knight-bl-6-knt-ian',
  'black-lanner-f', 'cadaver-cvr-t1', 'celerity-clr-03-ob',
  'celerity-clr-03-od', 'celerity-clr-03-oe', 'charger-c',
  'charger-cgr-1x1', 'daedalus-dad-4a', 'doloire-dlr-od',
  'gladiator-gld-1r-keller', 'hatamoto-chi-htm-27t-lowenbrau',
  'hitman-hm-2', 'jade-hawk-jhk-03', 'linebacker-i',
  'mantis-mts-l', 'raptor-ii-rpt-2x2', 'raptor-ii-rpt-3x',
];

console.log('=== CHECKING MASC/SC IN CRIT SLOTS ===\n');
let trueFalsePositives = 0;
let truePositives = 0;

for (const uid of suspectUnits) {
  const unit = loadUnit(uid);
  if (!unit) { console.log(`${uid}: NOT FOUND`); continue; }
  const r = valid.find((x: any) => x.unitId === uid);

  // Check crits for MASC/SC
  let critMASC = false;
  let critSC = false;
  const mascSlots: string[] = [];
  const scSlots: string[] = [];

  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).toLowerCase();
        if (lo.includes('masc') && !lo.includes('ammo')) {
          critMASC = true;
          mascSlots.push(`[${loc}] ${s}`);
        }
        if (lo.includes('supercharger') || lo.includes('super charger')) {
          critSC = true;
          scSlots.push(`[${loc}] ${s}`);
        }
      }
    }
  }

  // Also check what could match 'masc' in crit names
  const allCritMatches: string[] = [];
  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        if (lo.includes('masc') && !lo.includes('ammo')) {
          allCritMatches.push(`[${loc}] ${s}`);
        }
      }
    }
  }

  const walk = unit.movement?.walk || 0;
  const normalRun = Math.ceil(walk * 1.5);
  const isFalse = !critMASC && !critSC;

  if (isFalse) trueFalsePositives++;
  else truePositives++;

  console.log(`${uid}: walk=${walk} normalRun=${normalRun} runMP=${r?.breakdown?.runMP || '?'} MASC_crit=${critMASC} SC_crit=${critSC} ${isFalse ? '*** FALSE POSITIVE ***' : 'CORRECT'}`);
  if (allCritMatches.length > 0) console.log(`  MASC matches: ${allCritMatches.join(', ')}`);
  if (scSlots.length > 0) console.log(`  SC matches: ${scSlots.join(', ')}`);
  if (isFalse) {
    // Find what's causing the inflated runMP
    // Check all equipment IDs for 'masc' substring
    for (const eq of unit.equipment || []) {
      if (eq.id.toLowerCase().includes('masc')) {
        console.log(`  EQUIP HIT: ${eq.id}`);
      }
    }
    // Check all crit slot entries - what do they contain?
    // Maybe something else triggers hasMASC/hasSC
    if (unit.criticalSlots) {
      for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots) {
          if (!s || typeof s !== 'string') continue;
          const lo = (s as string).replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
          if (lo.includes('supercharger') || lo.includes('super charger')) {
            console.log(`  SC CRIT HIT: [${loc}] ${s}`);
          }
        }
      }
    }
  }
}

console.log(`\nSummary: ${trueFalsePositives} true false positives, ${truePositives} correct detections`);

// Now check ALL overcalculated units for false MASC/SC
console.log('\n=== FULL SCAN: ALL OVERCALCULATED UNITS ===');
const over = valid.filter((x: any) => x.percentDiff > 1);
let totalFalseMASC = 0;
let totalTrueMASC = 0;
let totalFalseSC = 0;
let totalTrueSC = 0;

for (const u of over) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  if (!b) continue;

  const walk = unit.movement?.walk || 0;
  const normalRun = Math.ceil(walk * 1.5);

  // Does our validation detect MASC?
  const detectedMASC = b.runMP > normalRun;

  // Does unit actually have MASC in crits?
  let critMASC = false;
  let critSC = false;
  if (unit.criticalSlots) {
    for (const slots of Object.values(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        if (lo.includes('masc') && !lo.includes('ammo')) critMASC = true;
        if (lo.includes('supercharger') || lo.includes('super charger')) critSC = true;
      }
    }
  }

  if (detectedMASC && !critMASC && !critSC) {
    totalFalseMASC++;
    if (u.percentDiff > 3) {
      console.log(`  FALSE: ${u.unitId.padEnd(45)} +${u.percentDiff.toFixed(1)}% walk=${walk} normalRun=${normalRun} run=${b.runMP}`);
    }
  }
}
console.log(`\n  Total false MASC/SC detections in overcalculated: ${totalFalseMASC}`);
