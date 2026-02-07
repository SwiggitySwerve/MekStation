const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

// Load weapon/equip catalogs
const equipMap = new Map();
for (const f of findJsonFiles('public/data/equipment/official')) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const item of (data.items || [])) {
      equipMap.set(item.id.toLowerCase(), item);
    }
  } catch {}
}

// Load name mappings
const nameMappings = JSON.parse(fs.readFileSync('public/data/equipment/name-mappings.json', 'utf8'));

// Check specific equipment that appeared in overcalculated units
const checkList = [
  'large-re-engineered-laser',
  'c3-master-boosted-with-tag',
  'ppcp',  // prototype PPC?
  'er-large-laser-prototype',
  'silver-bullet-gauss-rifle',
  'hag-20', 'hag-30', 'hag-40',
  'ultra-ac-10', 'ultra-ac-20',
  'rotary-ac-5', 'rotary-ac-2',
  'er-flamer',
  'er-micro-laser',
  'er-medium-pulse-laser', 'er-large-pulse-laser',
  'micro-pulse-laser',
  'streak-lrm-15',
  'lrt-15', 'lrt-10',
  'srt-4', 'srt-6',
  'sniper-cannon',
  'rifle-cannon',
  'arrow-iv',
  'anti-missile-system',
  'risc-advanced-point-defense-system',
];

console.log('=== Equipment resolution check ===\n');
for (const id of checkList) {
  const direct = equipMap.get(id);
  const mapped = Object.entries(nameMappings).find(([k]) => k.toLowerCase() === id)?.[1];
  const mappedEntry = mapped ? equipMap.get(mapped.toLowerCase()) : null;

  if (direct) {
    console.log(`  ${id}: BV=${direct.battleValue} heat=${direct.heat ?? '-'} (direct catalog)`);
  } else if (mappedEntry) {
    console.log(`  ${id}: BV=${mappedEntry.battleValue} heat=${mappedEntry.heat ?? '-'} (via ${mapped})`);
  } else {
    // Try partial matching
    const partials = [...equipMap.keys()].filter(k => k.includes(id) || id.includes(k));
    if (partials.length > 0) {
      console.log(`  ${id}: NOT FOUND - partial matches: ${partials.slice(0, 3).join(', ')}`);
    } else {
      console.log(`  ${id}: NOT FOUND`);
    }
  }
}

// Check what BV the validate-bv.ts assigns to these by looking at the BV overrides
// Read the validate-bv.ts weapon BV map
console.log('\n=== Checking validate-bv.ts BV overrides ===');
const vbvContent = fs.readFileSync('scripts/validate-bv.ts', 'utf8');

// Find BV overrides for specific weapons
for (const id of ['large-re-engineered-laser', 'c3-master-boosted-with-tag', 'ppcp', 'er-large-laser-prototype', 'sniper-cannon']) {
  // Search for the ID in the BV override map
  const re = new RegExp(`['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*:\\s*\\{[^}]+\\}`, 'i');
  const match = vbvContent.match(re);
  if (match) {
    console.log(`  ${id}: ${match[0].trim()}`);
  } else {
    // Try partial match
    const rePartial = new RegExp(`['"][^'"]*${id.replace(/-/g, '[- ]?')}[^'"]*['"]\\s*:`, 'i');
    const pm = vbvContent.match(rePartial);
    if (pm) {
      const idx = vbvContent.indexOf(pm[0]);
      const snippet = vbvContent.substring(idx, idx + 100);
      console.log(`  ${id}: partial match → ${snippet.split('\n')[0].trim()}`);
    } else {
      console.log(`  ${id}: NO override found`);
    }
  }
}
