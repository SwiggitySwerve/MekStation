#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));

const targets = ['Archangel C-ANG-O Invictus', 'Blade BLD-XR', 'Cataphract CTF-5D', 'Black Knight BLK-NT-2Y'];
for (const iu of indexData.units) {
  const name = `${iu.chassis} ${iu.model}`;
  if (!targets.includes(name)) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  console.log(`${name}: cockpit="${ud.cockpit}" HEAD crits=${JSON.stringify(ud.criticalSlots?.HEAD)}`);
}
