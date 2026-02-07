import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Get the top 20 undercalculated units
const underc = report.allResults
  .filter((r: any) => r.status !== 'error' && r.percentDiff !== null && r.percentDiff < -1)
  .sort((a: any, b: any) => a.percentDiff - b.percentDiff)
  .slice(0, 20);

function normalizeEquipId(s: string): string {
  return s.replace(/^\d+-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

for (const u of underc) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));

  console.log(`\n=== ${u.unitId} ===`);
  console.log(`  techBase: ${unit.techBase}, gap: ${u.difference} (${u.percentDiff?.toFixed(1)}%)`);

  // Check each weapon's equipment entry and corresponding crit slots
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase();
    // Skip non-weapons
    if (lo.includes('heat-sink') || lo.includes('case') || lo.includes('targeting') || lo.includes('tsm')
      || lo.includes('jump-jet') || lo.includes('ecm') || lo.includes('probe') || lo.includes('null-sig')
      || lo.includes('chameleon') || lo.includes('void-sig') || lo.includes('ams') || lo === 'supercharger'
      || lo.includes('masc') || lo.includes('c3') || lo.includes('tag') || lo.includes('narc')
      || lo.includes('beagle') || lo.includes('bap') || lo.includes('nova-cews')) continue;

    const eqNorm = normalizeEquipId(eq.id);
    const loc = eq.location.split(',')[0].toUpperCase();
    const slots = unit.criticalSlots?.[loc] || [];

    // Find matching crit slot
    let critName = '(no match)';
    let isCLPrefix = false;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim();
      const slotNorm = clean.toLowerCase().replace(/^(cl|clan|is)\s*/i, '').replace(/[^a-z0-9]/g, '');
      if (slotNorm === eqNorm || slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) {
        critName = clean;
        isCLPrefix = /^CL/i.test(clean);
        break;
      }
    }

    // Check if weapon looks like it could be Clan
    const couldBeClan = lo.includes('clan-') || lo.includes('cl-') || isCLPrefix;

    // Only log weapons that might have wrong resolution
    if (unit.techBase === 'MIXED' || unit.techBase === 'CLAN') {
      console.log(`  weapon: ${eq.id} @ ${eq.location}`);
      console.log(`    critSlot: "${critName}" | CL-prefix: ${isCLPrefix} | equipId hasClan: ${lo.includes('clan-')} | techBase: ${unit.techBase}`);
    }
  }

  // Also show all crit slots that have CL prefix
  if (unit.criticalSlots) {
    const clSlots: string[] = [];
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (slot && typeof slot === 'string' && /^CL/i.test(slot.replace(/\s*\(omnipod\)/gi, '').trim())) {
          clSlots.push(`${loc}: ${slot}`);
        }
      }
    }
    if (clSlots.length > 0) {
      console.log(`  CL-prefixed crits: ${clSlots.length}`);
      for (const s of clSlots.slice(0, 10)) console.log(`    ${s}`);
      if (clSlots.length > 10) console.log(`    ... and ${clSlots.length - 10} more`);
    }
  }
}
