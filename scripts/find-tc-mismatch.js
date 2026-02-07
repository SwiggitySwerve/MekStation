const fs = require('fs');
const path = require('path');
function find(d) {
  const r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) r.push(...find(f));
    else if (e.name.endsWith('.json') && e.name !== 'index.json') r.push(f);
  }
  return r;
}
const files = find('public/data/units/battlemechs');
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const crits = JSON.stringify(d.criticalSlots || {}).toLowerCase();
  const equip = JSON.stringify(d.equipment || []).toLowerCase();
  const critTC = crits.includes('targeting computer');
  const equipTC = equip.includes('targeting-computer') || equip.includes('targeting computer');
  if (critTC && !equipTC) console.log('CRIT ONLY TC:', d.chassis, d.model);
  if (equipTC && !critTC) console.log('EQUIP ONLY TC:', d.chassis, d.model);
}
