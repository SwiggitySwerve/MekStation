import fs from 'fs';
import path from 'path';

const d = JSON.parse(fs.readFileSync('validation-output/bv-all-results.json', 'utf8'));
const noAmmo = d.filter((r: any) => r.calc !== null && r.ammoBV === 0);
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
let hasAmmoInCrits = 0;
const missingTypes = new Map<string, number>();

for (const r of noAmmo) {
  const entry = (idx as any).units.find((u: any) => u.id === r.id);
  if (!entry) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', entry.path), 'utf8'));
    const crits = unit.criticalSlots || {};
    const allSlots = Object.values(crits).flat().filter(Boolean) as string[];
    const ammoSlots = allSlots.filter((s: string) => s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed'));
    if (ammoSlots.length > 0) {
      hasAmmoInCrits++;
      for (const s of ammoSlots) {
        const clean = (s as string)
          .replace(/\s*\(omnipod\)/gi, '')
          .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
          .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
          .trim();
        missingTypes.set(clean, (missingTypes.get(clean) || 0) + 1);
      }
    }
  } catch {}
}

console.log('Units with ammoBV=0 that have ammo in crits:', hasAmmoInCrits, 'of', noAmmo.length);
const sorted = [...missingTypes.entries()].sort((a, b) => b[1] - a[1]);
console.log('\nTop unresolved ammo types:');
for (const [name, count] of sorted.slice(0, 40)) {
  console.log(count.toString().padStart(5), name);
}
