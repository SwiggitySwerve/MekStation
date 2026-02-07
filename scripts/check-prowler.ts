#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json','utf-8'));
const iu = idx.units.find((u:any) => u.chassis === 'Prowler' && u.model === 'PWR-1X');
if (!iu) { console.log('NOT FOUND'); process.exit(1); }
const fp = path.resolve('public/data/units/battlemechs', iu.path);
const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));
console.log('techBase:', ud.techBase);
console.log('equipment:', JSON.stringify(ud.equipment, null, 2));
