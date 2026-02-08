const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const unitDir = 'public/data/units/battlemechs';
const files = findJsonFiles(unitDir);
const unitMap = new Map();
for (const f of files) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {}
}

// Check all outside-5% units
const outside = r.allResults.filter(u => Math.abs(u.percentDiff) > 5)
  .sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

for (const u of outside) {
  const data = unitMap.get(u.unitId);
  if (!data) { console.log('NOT FOUND:', u.unitId); continue; }

  console.log(`\n=== ${u.chassis} ${u.model} (${u.percentDiff.toFixed(1)}%) ref=${u.indexBV} calc=${u.calculatedBV} ===`);
  console.log('Equipment:', data.equipment.map(e => `${e.id}@${e.location}`).join(', '));

  // Check all crit slots for weapon-like items
  const critWeapons = [];
  const allCrits = [];
  for (const [loc, slots] of Object.entries(data.criticalSlots || {})) {
    for (const slot of (slots || [])) {
      if (!slot) continue;
      allCrits.push({ loc, name: slot });
    }
  }

  // Count MGA
  const mgaSlots = allCrits.filter(c => c.name.toLowerCase().includes('machine gun array') || c.name.toLowerCase().includes('mga'));
  if (mgaSlots.length > 0) console.log('  MGA:', mgaSlots.map(c => c.name + '@' + c.loc).join(', '));

  // Count MGs
  const mgSlots = allCrits.filter(c => {
    const lo = c.name.toLowerCase();
    return (lo.includes('machine gun') || lo === 'clmg' || lo === 'ismg' || lo === 'islightmg' || lo === 'cllightmg' || lo === 'isheavymg' || lo === 'clheavymg') && !lo.includes('array') && !lo.includes('ammo');
  });
  if (mgSlots.length > 0) console.log('  MGs:', mgSlots.length, 'items:', [...new Set(mgSlots.map(c => c.name))].join(', '));

  // Check MASC/SC
  const masc = allCrits.filter(c => c.name.toLowerCase().includes('masc') || c.name.toLowerCase().includes('supercharger'));
  if (masc.length > 0) console.log('  MASC/SC:', masc.map(c => c.name).join(', '));

  // Check for weapons in crits that might not be in equipment list
  const weapCrits = allCrits.filter(c => {
    const lo = c.name.toLowerCase();
    return !lo.includes('actuator') && !lo.includes('engine') && !lo.includes('gyro') &&
           !lo.includes('life support') && !lo.includes('sensor') && !lo.includes('cockpit') &&
           !lo.includes('endo') && !lo.includes('ferro') && !lo.includes('hip') && !lo.includes('shoulder') &&
           !lo.includes('heat sink') && !lo.includes('ammo') && !lo.includes('case') &&
           !lo.includes('jump jet') && !lo.includes('omnipod') && !lo.includes('coolantpod') &&
           !lo.includes('beagle') && !lo.includes('ecm') && !lo.includes('probe') && !lo.includes('masc') &&
           !lo.includes('supercharger') && !lo.includes('tsm') && !lo.includes('targcomp') &&
           !lo.includes('null sig') && !lo.includes('chameleon') && !lo.includes('blue shield') &&
           !lo.includes('partial wing') && !lo.includes('tracks') && !lo.includes('stealth') &&
           !lo.includes('reactive') && !lo.includes('reflective') && !lo.includes('hardened') &&
           !lo.includes('light ferro') && !lo.includes('heavy ferro') && !lo.includes('clan ferro') &&
           !lo.includes('isenhancedsensor') && !lo.includes('isangel') && !lo.includes('bloodhound') &&
           !lo.includes('guardianecm') && !lo.includes('angelecm') && !lo.includes('watchdog');
  });
  const uniqueWeaps = [...new Set(weapCrits.map(c => c.name))];
  console.log('  Crit weapons:', uniqueWeaps.join(', '));
}
