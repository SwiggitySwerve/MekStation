import * as fs from 'fs';
import * as path from 'path';

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

function normalizeEquipId(s: string): string {
  return s.replace(/^\d+-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isClanEquipAtLocation(equipId: string, location: string, criticalSlots?: Record<string, (string | null)[]>): boolean {
  if (!criticalSlots) return false;
  const locKey = location.split(',')[0].toUpperCase();
  const locVariants = [locKey, location];
  const eqNorm = normalizeEquipId(equipId);

  for (const lk of locVariants) {
    const slots = criticalSlots[lk];
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim();
      if (!/^CL/i.test(clean)) continue;
      const slotNorm = clean.toLowerCase().replace(/^(cl|clan)\s*/i, '').replace(/[^a-z0-9]/g, '');
      if (slotNorm === eqNorm || slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) return true;
    }
  }
  return false;
}

// Test with specific units
const testUnits = ['malice-mal-yz', 'cephalus-e', 'cephalus-d', 'atlas-c', 'thunder-fox-tft-f11'];

for (const unitId of testUnits) {
  const entry = (index.units as any[]).find((e: any) => e.id === unitId);
  if (!entry?.path) { console.log(`${unitId}: NOT FOUND`); continue; }
  const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  console.log(`\n=== ${unitId} (${data.techBase}) ===`);

  for (const eq of data.equipment) {
    const detected = isClanEquipAtLocation(eq.id, eq.location, data.criticalSlots);
    console.log(`  ${eq.id.padEnd(30)} @${eq.location.padEnd(15)} clanDetected=${detected}`);

    // Verbose trace for failed detections
    if (!detected && data.criticalSlots) {
      const locKey = eq.location.split(',')[0].toUpperCase();
      const slots = data.criticalSlots[locKey];
      if (slots) {
        const eqNorm = normalizeEquipId(eq.id);
        const clSlots = (slots as any[]).filter((s: any) => s && typeof s === 'string' && /^CL/i.test(s.replace(/\s*\(omnipod\)/gi, '').trim()));
        if (clSlots.length > 0) {
          console.log(`    eqNorm="${eqNorm}" CL slots at ${locKey}:`);
          for (const s of clSlots) {
            const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim();
            const slotNorm = clean.toLowerCase().replace(/^(cl|clan)\s*/i, '').replace(/[^a-z0-9]/g, '');
            console.log(`      "${s}" → clean="${clean}" → norm="${slotNorm}" match=${slotNorm === eqNorm || slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)}`);
          }
        }
      }
    }
  }
}
