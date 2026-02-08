import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Get undercalculated minor-disc units
const underCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0
);

console.log(`Undercalculated minor-disc units: ${underCalc.length}`);

// Check various features that might explain the gap
interface UnitFeatures {
  id: string;
  pctDiff: number;
  diff: number;
  techBase: string;
  tonnage: number;
  hasTC: boolean;
  hasTSM: boolean;
  hasMASC: boolean;
  hasSupercharger: boolean;
  hasArtemis: boolean;
  hasCommandConsole: boolean;
  hasECM: boolean;
  hasBAP: boolean;
  hasShield: boolean;
  hasStealth: boolean;
  hasDHS: boolean;
  hasCase: boolean;
  hasCase2: boolean;
  ammoBV: number;
  weaponCount: number;
  jumpMP: number;
}

const features: UnitFeatures[] = [];
for (const r of underCalc) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(u.criticalSlots || {})) {
      if (Array.isArray(slots)) {
        for (const s of slots) {
          if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
        }
      }
    }

    features.push({
      id: r.unitId,
      pctDiff: r.percentDiff,
      diff: r.difference,
      techBase: u.techBase,
      tonnage: u.tonnage,
      hasTC: allSlots.some(s => s.includes('targeting computer') || s.includes('targetingcomputer') || s === 'istargetingcomputer' || s === 'cltargetingcomputer'),
      hasTSM: allSlots.some(s => s.includes('triple strength myomer') || s.includes('tsm')),
      hasMASC: allSlots.some(s => s.includes('masc') && !s.includes('supercharger')),
      hasSupercharger: allSlots.some(s => s.includes('supercharger')),
      hasArtemis: allSlots.some(s => (s.includes('artemis') && !s.includes('ammo') && !s.includes('capable'))),
      hasCommandConsole: allSlots.some(s => s.includes('command console')),
      hasECM: allSlots.some(s => s.includes('ecm') || s.includes('guardian')),
      hasBAP: allSlots.some(s => s.includes('probe') || s.includes('beagle') || s.includes('bloodhound')),
      hasShield: allSlots.some(s => s.includes('shield') && !s.includes('blue-shield')),
      hasStealth: (u.armor?.type || '').toLowerCase().includes('stealth'),
      hasDHS: (u.heatSinks?.type || '').toUpperCase().includes('DOUBLE'),
      hasCase: allSlots.some(s => s.includes('case') && !s.includes('case ii')),
      hasCase2: allSlots.some(s => s.includes('case ii')),
      ammoBV: r.breakdown?.ammoBV || 0,
      weaponCount: allSlots.filter(s => !s.includes('ammo') && !s.includes('heat') && !s.includes('endo') && !s.includes('ferro') && !s.includes('actuator') && !s.includes('shoulder') && !s.includes('hip') && !s.includes('engine') && !s.includes('gyro') && !s.includes('cockpit') && !s.includes('life support') && !s.includes('sensor')).length,
      jumpMP: u.movement?.jump || 0,
    });
  } catch {}
}

// Feature correlation analysis
const featureNames: (keyof UnitFeatures)[] = ['hasTC', 'hasTSM', 'hasMASC', 'hasSupercharger', 'hasArtemis', 'hasCommandConsole', 'hasECM', 'hasBAP', 'hasShield', 'hasStealth', 'hasCase', 'hasCase2'];

console.log('\n=== FEATURE FREQUENCY AND CORRELATION WITH GAP ===');
for (const feat of featureNames) {
  const withFeat = features.filter(f => f[feat] === true);
  const withoutFeat = features.filter(f => f[feat] === false);
  if (withFeat.length > 0) {
    const avgWith = withFeat.reduce((s, f) => s + f.pctDiff, 0) / withFeat.length;
    const avgWithout = withoutFeat.length > 0 ? withoutFeat.reduce((s, f) => s + f.pctDiff, 0) / withoutFeat.length : 0;
    console.log(`  ${String(feat).padEnd(25)} present=${String(withFeat.length).padStart(4)} avgPct=${avgWith.toFixed(2).padStart(7)}% | absent=${String(withoutFeat.length).padStart(4)} avgPct=${avgWithout.toFixed(2).padStart(7)}%`);
  }
}

// Check if command console units have worse gaps
console.log('\n=== COMMAND CONSOLE UNITS ===');
const ccUnits = features.filter(f => f.hasCommandConsole);
for (const f of ccUnits) {
  console.log(`  ${f.id.padEnd(45)} gap=${f.diff} (${f.pctDiff.toFixed(2)}%)`);
}

// Check TC units
console.log('\n=== TARGETING COMPUTER UNITS (top 10 by gap) ===');
const tcUnits = features.filter(f => f.hasTC).sort((a, b) => a.pctDiff - b.pctDiff);
for (const f of tcUnits.slice(0, 10)) {
  console.log(`  ${f.id.padEnd(45)} gap=${f.diff} (${f.pctDiff.toFixed(2)}%) ammoBV=${f.ammoBV}`);
}

// Check MIXED tech base
console.log('\n=== BY TECH BASE ===');
for (const tb of ['INNER_SPHERE', 'CLAN', 'MIXED']) {
  const tbUnits = features.filter(f => f.techBase === tb);
  if (tbUnits.length > 0) {
    const avg = tbUnits.reduce((s, f) => s + f.pctDiff, 0) / tbUnits.length;
    console.log(`  ${tb.padEnd(15)} n=${String(tbUnits.length).padStart(4)} avgPct=${avg.toFixed(2).padStart(7)}%`);
  }
}
