/**
 * Quantify impact of:
 * 1. Large shield running MP reduction (-1)
 * 2. iNARC/NARC pods not detected as explosive or ammo
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// 1. Large Shield analysis
console.log('=== LARGE SHIELD UNITS ===');
let largeShieldUnits: any[] = [];
let medShieldUnits: any[] = [];
let smallShieldUnits: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  let hasLarge = false, hasMed = false, hasSmall = false;
  for (const slots of Object.values(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '');
      if (lo.includes('largeshield') || lo.includes('large shield') || lo === 'islargeshield') hasLarge = true;
      if (lo.includes('mediumshield') || lo.includes('medium shield') || lo === 'ismediumshield') hasMed = true;
      if (lo.includes('smallshield') || lo.includes('small shield') || lo === 'issmallshield') hasSmall = true;
    }
  }
  if (hasLarge) largeShieldUnits.push(r);
  if (hasMed) medShieldUnits.push(r);
  if (hasSmall) smallShieldUnits.push(r);
}

console.log(`Large Shield: ${largeShieldUnits.length} units`);
for (const r of largeShieldUnits) {
  console.log(`  ${r.unitId.padEnd(45)} diff=${r.percentDiff?.toFixed(1).padStart(6)}% ref=${r.indexBV} calc=${r.calculatedBV}`);
}
console.log(`\nMedium Shield: ${medShieldUnits.length} units`);
for (const r of medShieldUnits) {
  console.log(`  ${r.unitId.padEnd(45)} diff=${r.percentDiff?.toFixed(1).padStart(6)}% ref=${r.indexBV} calc=${r.calculatedBV}`);
}
console.log(`\nSmall Shield: ${smallShieldUnits.length} units`);
for (const r of smallShieldUnits) {
  console.log(`  ${r.unitId.padEnd(45)} diff=${r.percentDiff?.toFixed(1).padStart(6)}% ref=${r.indexBV} calc=${r.calculatedBV}`);
}

// 2. iNARC/NARC pods in crits (not containing "ammo")
console.log('\n=== iNARC/NARC PODS IN CRITS ===');
let narcPodUnits: any[] = [];
for (const r of valid) {
  const unit = loadUnit(r.unitId);
  if (!unit?.criticalSlots) continue;
  let hasNarcPods = false;
  let podEntries: string[] = [];
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if ((lo.includes('narc') || lo.includes('inarc')) && lo.includes('pod') && !lo.includes('ammo')) {
        hasNarcPods = true;
        podEntries.push(`${loc}:${s}`);
      }
    }
  }
  if (hasNarcPods) {
    narcPodUnits.push({ ...r, pods: podEntries, techBase: unit.techBase });
  }
}

console.log(`Units with NARC/iNARC pods (not "ammo"): ${narcPodUnits.length}`);
for (const r of narcPodUnits) {
  const hasClan = r.techBase === 'CLAN';
  console.log(`  ${r.unitId.padEnd(45)} diff=${r.percentDiff?.toFixed(1).padStart(6)}% ${hasClan ? 'CLAN' : 'IS'} pods: ${r.pods.length}`);
}

// 3. What patterns exist in the 1-2% overcalculated band (no flags)?
console.log('\n=== OVERCALCULATED 1-5% BAND (no shield/narc) ===');
const over1_5 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 5);
const shieldNarcIds = new Set([...largeShieldUnits, ...medShieldUnits, ...smallShieldUnits, ...narcPodUnits].map((x: any) => x.unitId));
const cleanOver = over1_5.filter((x: any) => !shieldNarcIds.has(x.unitId));
console.log(`Total 1-5% overcalculated: ${over1_5.length}, after removing shield/narc: ${cleanOver.length}`);

// Check what these clean overcalculated units have in common
const patterns: Record<string, number> = {};
for (const r of cleanOver) {
  const b = r.breakdown;
  const cockpit = b?.cockpitModifier === 0.95 ? 'cock095' : 'cock100';
  const tech = b?.techBase || 'unknown';
  const key = `${tech}/${cockpit}`;
  patterns[key] = (patterns[key] || 0) + 1;
}
console.log('Patterns in clean 1-5% overcalculated:');
for (const [k, v] of Object.entries(patterns).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}
