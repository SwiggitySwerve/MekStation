#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
let count = 0;
for (const iu of indexData.units) {
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const mgaEquip = (ud.equipment || []).filter((e: {id: string}) => e.id.toLowerCase().includes('machine-gun-array'));
  if (mgaEquip.length > 0) {
    count++;
    if (count <= 10) {
      const mgEquip = (ud.equipment || []).filter((e: {id: string}) => e.id.toLowerCase().includes('machine-gun'));
      console.log(`${iu.chassis} ${iu.model} - MGA: ${mgaEquip.map((e: {id: string}) => e.id).join(', ')} | MGs: ${mgEquip.map((e: {id: string}) => e.id).join(', ')}`);
    }
  }
}
console.log(`\nTotal units with MGA: ${count}`);
