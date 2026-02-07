import * as fs from 'fs';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function showEngineSlots(unitId: string) {
  const entry = idx.units.find((u: any) => u.id === unitId);
  if (!entry?.path) { console.log(`${unitId}: NOT FOUND`); return; }
  const d = JSON.parse(fs.readFileSync('public/data/units/battlemechs/' + entry.path, 'utf8'));
  console.log(`\n${unitId} (${d.tonnage}t ${d.techBase} ${d.engine.type}):`);
  for (const loc of ['LEFT_TORSO','RIGHT_TORSO','CENTER_TORSO']) {
    const slots = d.criticalSlots[loc] || [];
    const engSlots = (slots as string[]).filter(s => s && s.toLowerCase().includes('engine'));
    console.log(`  ${loc}: ${engSlots.length} engine slots`);
  }
}

// MIXED XXL (Clan origin)
showEngineSlots('cephalus-prime');
showEngineSlots('celerity-clr-03-oa');
showEngineSlots('malice-mal-yz');
showEngineSlots('wulfen-prime');

// IS XXL (correct units)
showEngineSlots('crab-crb-54');
showEngineSlots('battlemaster-blr-6x');
showEngineSlots('crusader-crd-9r');
