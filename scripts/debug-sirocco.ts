import { calculateOffensiveBVWithHeatTracking } from '../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

// Check resolved values
const weapons_to_check = ['ultra-ac-10', 'uac-10', 'er-medium-laser', 'medium-pulse-laser', 'streak-srm-2', 'streak-srm-6', 'rac-5', 'rac-2'];
for (const w of weapons_to_check) {
  const r = resolveEquipmentBV(w);
  console.log(`resolveEquipmentBV('${w}'):`, JSON.stringify(r));
}
