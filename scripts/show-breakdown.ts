#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const target = process.argv[2] || 'Atlas AS8-K';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) { console.log('Not found:', target); process.exit(1); }
const ud = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', iu.path), 'utf-8'));

console.log('Armor type from JSON:', ud.armor.type);

// Simulate crit scan armor detection
const allSlots = Object.values(ud.criticalSlots || {}).flat().filter((s): s is string => !!s && typeof s === 'string');
const allSlotsLo = allSlots.map(s => s.toLowerCase());

// Test each armor detection pattern
const patterns = [
  { name: 'ferro-lamellor', test: (s: string) => s.includes('ferro-lamellor') },
  { name: 'ballistic-reinforced', test: (s: string) => s.includes('ballistic-reinforced') || s.includes('ballistic reinforced') },
  { name: 'reactive', test: (s: string) => s.includes('reactive') && !s.includes('ferro') },
  { name: 'reflective', test: (s: string) => (s.includes('reflective') || s.includes('laser-reflective')) && !s.includes('ferro') },
  { name: 'hardened', test: (s: string) => s.includes('hardened armor') || s.includes('is hardened') },
  { name: 'anti-penetrative', test: (s: string) => s.includes('anti-penetrative') || s.includes('ablation') },
  { name: 'heat-dissipating', test: (s: string) => s.includes('heat-dissipating') },
];

for (const p of patterns) {
  const matches = allSlotsLo.filter(p.test);
  if (matches.length > 0) {
    console.log(`  Detected: ${p.name} (${matches.length} matches)`);
    console.log(`    First match: "${matches[0]}"`);
  }
}

// What would the else-if chain give us?
let detected: string | null = null;
if (allSlotsLo.some(s => s.includes('ferro-lamellor'))) detected = 'ferro-lamellor';
else if (allSlotsLo.some(s => s.includes('ballistic-reinforced') || s.includes('ballistic reinforced'))) detected = 'ballistic-reinforced';
else if (allSlotsLo.some(s => s.includes('reactive') && !s.includes('ferro'))) detected = 'reactive';
else if (allSlotsLo.some(s => (s.includes('reflective') || s.includes('laser-reflective')) && !s.includes('ferro'))) detected = 'reflective';
else if (allSlotsLo.some(s => s.includes('hardened armor') || s.includes('is hardened'))) detected = 'hardened';
else if (allSlotsLo.some(s => s.includes('anti-penetrative') || s.includes('ablation'))) detected = 'anti-penetrative';
else if (allSlotsLo.some(s => s.includes('heat-dissipating'))) detected = 'heat-dissipating';

console.log('Detected armor type:', detected);
