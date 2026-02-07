import fs from 'fs';
import path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const ammoCount = new Map<string, number>();

for (const entry of (idx as any).units) {
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', entry.path), 'utf8'));
    const crits = unit.criticalSlots || {};
    const allSlots = Object.values(crits).flat().filter(Boolean) as string[];
    for (const s of allSlots) {
      if (s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) {
        const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').trim();
        ammoCount.set(clean, (ammoCount.get(clean) || 0) + 1);
      }
    }
  } catch {}
}

const sorted = [...ammoCount.entries()].sort((a, b) => b[1] - a[1]);
console.log('Top 80 ammo types by frequency:');
for (const [name, count] of sorted.slice(0, 80)) {
  console.log(count.toString().padStart(5), name);
}
