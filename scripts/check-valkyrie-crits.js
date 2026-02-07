// Check exact crit slot names for Valkyrie VLK-QT2
const fs = require('fs');
const path = require('path');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const e = idx.units.find(x => x.id === 'valkyrie-vlk-qt2');
if (!e) { console.log('Not found'); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', e.path), 'utf8'));
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  for (const slot of (slots || [])) {
    if (slot && typeof slot === 'string' && slot.toLowerCase().includes('ammo')) {
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
      const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
      console.log(`${loc}: "${slot}" => clean: "${clean}" => canon: "${canonKey}"`);
    }
  }
}
