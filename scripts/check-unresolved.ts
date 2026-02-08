import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Check ALL undercalculated units for unresolved weapons in their crit slots
const under = r.allResults.filter((x: any) => x.percentDiff < -1 && x.breakdown);

// Load weapon catalogs to know what's resolvable
const weaponDir = 'public/data/equipment/official/weapons';
const knownWeapons = new Set<string>();
for (const cat of ['energy.json', 'ballistic.json', 'missile.json']) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(weaponDir, cat), 'utf8'));
    for (const item of (d.items || [])) {
      knownWeapons.add(item.id.toLowerCase());
    }
  } catch {}
}

// Common weapon crit slot names and their normalized forms
function isWeaponSlot(s: string): boolean {
  const lo = s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(r\)/gi, '').trim();
  if (lo.includes('ammo') || lo.includes('heat sink') || lo.includes('engine') ||
      lo.includes('gyro') || lo.includes('cockpit') || lo.includes('sensor') ||
      lo.includes('life support') || lo.includes('shoulder') || lo.includes('actuator') ||
      lo.includes('hip') || lo.includes('endo') || lo.includes('ferro') ||
      lo.includes('case') || lo.includes('targeting computer') || lo.includes('tsm') ||
      lo.includes('masc') || lo.includes('supercharger') || lo.includes('ecm') ||
      lo.includes('probe') || lo.includes('bloodhound') || lo.includes('tag') ||
      lo.includes('null') || lo.includes('void') || lo.includes('chameleon') ||
      lo.includes('partial') || lo.includes('pod') || lo.includes('jump jet') ||
      lo.includes('umu') || lo.includes('shield') || lo.includes('aes') ||
      lo.includes('artemis') || lo.includes('apollo') || lo.includes('capacitor') ||
      lo.includes('harjel') || lo.includes('modular') || lo.includes('dispenser') ||
      lo.includes('coolant') || lo.includes('nova') || lo.includes('watchdog') ||
      lo === '-empty-' || lo === 'null' || lo === '') return false;
  // It's likely a weapon if it's a laser, ppc, ac, lrm, srm, etc.
  return true;
}

// For each undercalculated unit, find weapons in crits and check if they resolved
const unresolvedWeaponCounts = new Map<string, number>();
let unitsWithUnresolved = 0;
let unitsWithoutUnresolved = 0;

for (const res of under) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

    // Get all weapon-like crit slots (unique, first occurrence)
    const weaponSlots = new Set<string>();
    for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      let prev = '';
      for (const s of slots) {
        if (!s || typeof s !== 'string') { prev = ''; continue; }
        const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/gi, '').trim();
        if (isWeaponSlot(clean) && clean !== prev) {
          weaponSlots.add(clean);
        }
        prev = clean;
      }
    }

    // Check if these are in the weaponBV (indirectly, by checking the issues)
    const hasIssues = res.issues && res.issues.length > 0;

    // For a simpler check: compare equipment count to weapon entries
    // Or just count how many weapon-like crit entries we found
    if (weaponSlots.size > 0 && res.breakdown.weaponBV === 0) {
      unitsWithUnresolved++;
      for (const w of weaponSlots) unresolvedWeaponCounts.set(w, (unresolvedWeaponCounts.get(w) || 0) + 1);
    }
  } catch {}
}

// Actually, let me try a simpler approach - look at units where the gap is very large
// and check if they have iATM, HAG, or other Clan weapons
const specialWeapons = ['iatm', 'hag', 'improved heavy', 'plasma rifle', 'nova cews', 'improved medium heavy', 'improved small heavy', 'improved large heavy', 'streak lrm', 'atm', 'rotary', 'heavy gauss'];

let hasSpecialCount = 0;
let noSpecialCount = 0;
let hasSpecialGapSum = 0;
let noSpecialGapSum = 0;

for (const res of under) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as (string | null)[])) {
        if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
      }
    }

    const hasSpecial = specialWeapons.some(sw => allSlots.some(s => s.includes(sw)));
    if (hasSpecial) {
      hasSpecialCount++;
      hasSpecialGapSum += Math.abs(res.difference);
    } else {
      noSpecialCount++;
      noSpecialGapSum += Math.abs(res.difference);
    }
  } catch {}
}

console.log(`Undercalculated units: ${under.length}`);
console.log(`\nWith special/Clan weapons: ${hasSpecialCount} (avgGap=${(hasSpecialGapSum/hasSpecialCount).toFixed(1)})`);
console.log(`Without special weapons: ${noSpecialCount} (avgGap=${(noSpecialGapSum/noSpecialCount).toFixed(1)})`);

// Now check which specific special weapons are most common in undercalculated units
const weaponPresence: Record<string, { count: number; totalGap: number }> = {};
for (const res of under) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as (string | null)[])) {
        if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
      }
    }

    for (const sw of specialWeapons) {
      if (allSlots.some(s => s.includes(sw))) {
        if (!weaponPresence[sw]) weaponPresence[sw] = { count: 0, totalGap: 0 };
        weaponPresence[sw].count++;
        weaponPresence[sw].totalGap += Math.abs(res.difference);
      }
    }
  } catch {}
}

console.log(`\nSpecial weapon prevalence in undercalculated units:`);
for (const [w, v] of Object.entries(weaponPresence).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${w}: ${v.count} units (avgGap=${(v.totalGap/v.count).toFixed(1)})`);
}

// Check how many of the defensive-gap units actually have these special weapons
const defGapUnits = under.filter((res: any) => {
  const b = res.breakdown;
  const rawOff = b.offensiveBV / b.speedFactor;
  const expectedRawOff = b.weaponBV + b.ammoBV + res.tonnage;
  return Math.abs(rawOff - expectedRawOff) / Math.max(1, expectedRawOff) < 0.02;
});

let defGapWithSpecial = 0;
let defGapWithoutSpecial = 0;
for (const res of defGapUnits) {
  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const allSlots: string[] = [];
    for (const [, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as (string | null)[])) {
        if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
      }
    }
    if (specialWeapons.some(sw => allSlots.some(s => s.includes(sw)))) defGapWithSpecial++;
    else defGapWithoutSpecial++;
  } catch {}
}

console.log(`\nDefensive-gap units (rawOff check passes): ${defGapUnits.length}`);
console.log(`  With special weapons: ${defGapWithSpecial}`);
console.log(`  Without special weapons: ${defGapWithoutSpecial}`);
