#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const matches: string[] = [];
for (const u of index.units) {
  const fp = path.resolve('public/data/units/battlemechs', u.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const erPulse = ud.equipment.filter((e: any) => {
    const id = e.id.toLowerCase();
    return id.includes('pulse') && id.includes('er-');
  });
  if (erPulse.length > 0) {
    matches.push(`${u.chassis} ${u.model} (${ud.techBase}) equip: ${erPulse.map((e: any) => e.id).join(',')}`);
  }
}
console.log(`Units with ER Pulse Lasers: ${matches.length}`);
for (const m of matches) console.log(`  ${m}`);
