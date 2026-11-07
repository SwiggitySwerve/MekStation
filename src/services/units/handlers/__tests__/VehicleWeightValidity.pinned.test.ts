import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import { computeNativeTankWeight } from '../vehicleHandlerWeight';
import { VehicleUnitHandler } from '../VehicleUnitHandler';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
// MegaMek48fcb2f64a1b3f2d575707ce5653dad64927b587 / mm-data50f7efef0c9f775b0258f8283525ed4f906e1985.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

const fixtures = [
  {
    path: 'vehicles/3067 Unabridged/IS Vehicles/Ajax Assault Tank C.blk',
    sha256: '3f062a23b31ee55f3512985ce83c4b4fa72f423c4becc64aedd945b1d1ea0697',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-e5ae-72a0-bd69-d66acd0d60a5\n</UUID>\n\n<UnitType>\nTank\n</UnitType>\n\n<Name>\nAjax Assault Tank\n</Name>\n\n<Model>\nC\n</Model>\n\n<mul id:>\n5740\n</mul id:>\n\n<year>\n3068\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nJuggernaut\n</role>\n\n<motion_type>\nTracked\n</motion_type>\n\n<transporters>\nBattleArmorHandles - troopers:-1\n</transporters>\n\n<cruiseMP>\n3\n</cruiseMP>\n\n<engine_type>\n2\n</engine_type>\n\n<armor_type>\n0\n</armor_type>\n\n<armor_tech_rating>\n0\n</armor_tech_rating>\n\n<armor_tech_level>\n1\n</armor_tech_level>\n\n<omni>\n1\n</omni>\n\n<armor>\n76\n60\n60\n40\n68\n</armor>\n\n<Body Equipment>\nISCASE\nISTargeting Computer:OMNI\nISGuardianECMSuite:OMNI\nIS Streak SRM 6 Ammo:OMNI\nIS Streak SRM 6 Ammo:OMNI\nIS MRM 40 Ammo:OMNI\nIS MRM 40 Ammo:OMNI\n</Body Equipment>\n\n<Front Equipment>\nISStreakSRM6:OMNI\nISStreakSRM6:OMNI\nISStreakSRM6:OMNI\nMRM 40:OMNI\n</Front Equipment>\n\n<Right Equipment>\n</Right Equipment>\n\n<Left Equipment>\n</Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<Turret Equipment>\nPPC:OMNI\nISStreakSRM6:OMNI\n</Turret Equipment>\n\n<capabilities>\n<p>The Ajax rides on a GM 270 XL fusion engine, providing a top speed of 54 km/h. While this makes the tank relatively slow for its weight class, the space savings from the extralight powerplant allow it to carry an impressive nineteen tons of ArcShield Maxi II armor, giving it protection rivaling many assault BattleMechs. The chassis provides forty-two tons of pod space, with a maximum of thirty-five tons mountable in the turret.</p><p>In its Prime configuration, the Ajax pairs a Gauss rifle with an Ultra Autocannon/10, both turret-mounted, supported by twin medium pulse lasers and a Streak SRM-4 launcher. A C3 slave unit ties the tank into battlefield networks, significantly improving fire accuracy when operating alongside equipped lancemates. The turret mounting of all primary weapons gives the crew full 360-degree engagement capability regardless of the hull's facing.</p><p>The Ajax's primary weakness is its limited speed, which leaves it vulnerable to flanking by faster units. The reliance on an XL engine also means that critical engine hits can prove catastrophic, a tradeoff accepted in exchange for the vehicle's exceptional armor and firepower capacity.</p>\n</capabilities>\n\n<overview>\n<p>The Ajax Assault Tank is a ninety-ton tracked OmniVehicle developed by General Motors as a successor to its popular Challenger X main battle tank. Introduced in 3065 during the turbulent FedCom Civil War era, the Ajax was designed to capitalize on the growing demand for flexible conventional military vehicles within the Armed Forces of the Federated Commonwealth. Drawing on the proven success of Star Corps' Manteuffel Attack Tank, GM's engineers chose the OmniVehicle concept to give commanders the ability to rapidly reconfigure their heaviest armor assets for shifting battlefield requirements. Produced at GM facilities on Kathil and Salem as well as the joint GM/Blackwell Industries plant on New Valencia, the Ajax quickly earned a reputation as one of the most formidable assault tanks in the Inner Sphere. Its combination of heavy protection, substantial pod space, and network-capable electronics made it a cornerstone of Federated Suns armored formations for decades.</p>\n</overview>\n\n<deployment>\n<p>Introduced during the opening stages of the Jihad in 3068, the C configuration emphasizes close-range lethality. A targeting computer enhances its turret-mounted PPC, while four Streak SRM launchers and a bow-mounted MRM launcher deliver punishing short-range salvos. A Guardian ECM suite rounds out the electronics package.</p>\n</deployment>\n\n<history>\n<p>The Ajax entered service in 3065, arriving at a key moment during the FedCom Civil War. General Motors developed the design following the success of its Challenger X main battle tank, recognizing that the OmniVehicle concept pioneered by Star Corps' Manteuffel could be applied to heavier platforms. Production was established across three Federated Suns worlds, with General Motors facilities on Kathil and Salem joined by the GM/Blackwell Industries partnership on New Valencia.</p><p>The first Ajax tanks off the production lines on Kathil were assigned to the Fifth Davion Guards and Sixth Syrtis Fusiliers RCTs, units that put them to immediate use in their fight against the Eighth FedCom RCT and the Eighth Donegal Guards on New Syrtis. The Ajax proved its worth in these engagements, demonstrating the flexibility that the OmniVehicle concept promised. After the Fifth Davion Guards was officially deactivated following their victory, Leftenant General Seth Varnay led a mixed force that included a significant number of Ajax tanks to New Avalon, where their firepower was again put to effective use.</p><p>By the end of the Civil War, the Ajax had become a fixture in Federated Suns armored units. Nearly every surviving armored formation that fought with an RCT in the war retained Ajax tanks in its inventory. Production continued through the Jihad and into the Dark Age, with all three factory lines maintaining active output. The Kathil facility later expanded its production to include the environmentally sealed variant designed for amphibious assault missions, broadening the Ajax's operational envelope considerably. The design's enduring popularity reflected both its robust construction and the practical advantages of OmniVehicle technology for logistics-conscious commanders.</p>\n</history>\n\n<manufacturer>\nGeneral Motors Annex|General Motors|General Motors/Blackwell Corporation\n</manufacturer>\n\n<primaryFactory>\nKathil|Salem|New Valencia\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:GM\nARMOR:ArcShield\nCOMMUNICATIONS:Neil\nTARGETING:Sync Tracker\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:270 XL\nARMOR:Maxi II\nCOMMUNICATIONS:6000\nTARGETING:(39-42071)\n</systemModels>\n\n<source>\nTR:3067\n</source>\n\n<published>\nRS:3067u\n</published>\n\n<tonnage>\n90.0\n</tonnage>\n\n<baseChassisTurretWeight>\n3.5\n</baseChassisTurretWeight>\n\n",
    expected: {
      engine: 11.5,
      controls: 4.5,
      lift: 0,
      structure: 9,
      armor: 19,
      equipment: 45,
      turret: 3.5,
      heatSinks: 0,
      total: 92.5,
    },
    nativeWeightMethods: {
      calculateWeight: 92.5,
      calculateWeightExact: 92.5,
      getArmoredComponentWeight: 0,
      getTankWeightDualTurret: 0,
      getTankWeightLifting: 0,
      getTankWeightTurret: 3.5,
      getWeight: 90,
      getWeightAllocatedArmor: 19,
      getWeightAmmo: 4,
      getWeightArmor: 19,
      getWeightCarryingSpace: 0,
      getWeightControls: 4.5,
      getWeightEngine: 11.5,
      getWeightHeatSinks: 0,
      getWeightMisc: 3.5,
      getWeightMiscEquip: 4,
      getWeightPowerAmp: 0,
      getWeightStructure: 9,
      getWeightWeapon: 37,
    },
  },
  {
    path: 'vehicles/XTRs/Comstar/Lightning Attack Hovercraft CX-3.blk',
    sha256: '625f7751dfbf08e0c845684c3323ce2eef2df7a3b063e5eab023ce86b337dd2f',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-ebcd-7e0d-9ed5-753acb186788\n</UUID>\n\n<UnitType>\nTank\n</UnitType>\n\n<Name>\nLightning Attack Hovercraft\n</Name>\n\n<Model>\nCX-3\n</Model>\n\n<mul id:>\n5554\n</mul id:>\n\n<year>\n3069\n</year>\n\n<type>\nIS Level 4\n</type>\n\n<role>\nStriker\n</role>\n\n<quirks>\neasy_pilot\nprototype\nlow_profile\n</quirks>\n\n<motion_type>\nHover\n</motion_type>\n\n<cruiseMP>\n11\n</cruiseMP>\n\n<engine_type>\n0\n</engine_type>\n\n<armor_type>\n22\n</armor_type>\n\n<armor_tech_rating>\n0\n</armor_tech_rating>\n\n<armor_tech_level>\n7\n</armor_tech_level>\n\n<armor>\n10\n8\n8\n6\n</armor>\n\n<Body Equipment>\nIS Vehicular Stealth\nSponsonTurret\nISGuardianECMSuite\n</Body Equipment>\n\n<Front Equipment>\nISMediumPulseLaser\n</Front Equipment>\n\n<Right Equipment>\nRL15(ST)\nRL15(ST)\nRL15(ST)\n</Right Equipment>\n\n<Left Equipment>\nRL15(ST)\nRL15(ST)\nRL15(ST)\n</Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<capabilities>\n<p>The Lightning's defining attribute is raw speed. Its GM 210 fusion engine pushes the thirty-five-ton hovercraft to a flank speed exceeding 180 kilometers per hour, making it one of the faster combat vehicles in its weight class. Rear-mounted wings with small thrusters and elevators provide remarkable high-speed stability, and testing has demonstrated the craft can clear obstacles up to two meters high at full throttle. This is an extremely dangerous maneuver, however, and numerous Lightnings have been destroyed along with their crews during failed attempts.</p><p>The vehicle's armament is built around a pass-and-fire concept. Two Raker-IV medium pulse lasers in the front allow the crew to engage targets on approach, while a Maxima One Shot SRM-4 rack on each flank delivers a missile volley as the Lightning passes its target. A return pass fires the second rack from the opposite side. This tactic can inflict surprising damage on heavier opponents, particularly when multiple Lightnings coordinate their attack runs. StarSlab/3 ferro-fibrous armor provides reasonable protection for the vehicle's mass, but the one-shot missile launchers represent a significant limitation. Once both racks are expended, the Lightning's offensive capability drops to its pulse lasers alone, and crews must choose their missile targets carefully.</p>\n</capabilities>\n\n<overview>\n<p>The Lightning Attack Hovercraft was commissioned in 2696 by the Star League Defense Force as a light strike vehicle designed to exploit the flanks and rear of enemy formations. Produced by Curtiss Industries on New Stevens, it was conceived as a fast, expendable platform capable of disrupting slower BattleMechs and vehicles through coordinated hit-and-run attacks. Multiple Lightnings were often grouped into temporary compact units tasked with punching through hostile lines, using their exceptional speed to break up formations before heavier assets could engage. The design featured a distinctive low-mounted rear wing that improved stability at high speeds, giving crews greater control during the aggressive maneuvering the vehicle's mission profile demanded. Broadly distributed throughout the SLDF's conventional forces, the Lightning earned a reputation as an effective, if specialized, harassment platform that rewarded bold crews willing to close with much larger adversaries.</p>\n</overview>\n\n<deployment>\n<p>A ComStar prototype developed during the Jihad, the CX-3 serves as a radical departure from the standard Lightning configuration. Three Rocket Launcher 15 systems are mounted in sponson turrets, providing wider firing arcs than the original fixed-mount armament. The vehicle is protected by vehicular stealth armor paired with a Guardian ECM Suite, dramatically reducing its electronic signature at the cost of nearly all original offensive capability. Only a single medium pulse laser is retained from the base design. Produced in unknown numbers at an undisclosed facility, the CX-3 was evaluated for potential mass production but was considered too specialized and expensive for widespread adoption.</p>\n</deployment>\n\n<history>\n<p>Curtiss Industries received the Star League Defense Force contract in the mid-twenty-seventh century to develop a light, fast vehicle capable of breaking up enemy formations ahead of the main battle line. The resulting Lightning entered service in 2696 and was quickly distributed throughout the SLDF's conventional armor regiments. Its high speed and advanced fire-control systems impressed commanders, and the design saw broad deployment across Hegemony and member state garrisons. In 2720, an upgraded Royal variant entered limited production for SLDF Royal units, replacing the expendable one-shot missile systems with more sustainable launchers and adding a target acquisition designator to improve coordination with supporting artillery.</p><p>Production at the Curtiss Industries facility on New Stevens continued through the Star League era and into the Early Succession Wars. New Stevens passed from Terran Hegemony control to a brief period of independence before absorption by the Capellan Confederation, but the factory ceased active production before the Late Succession Wars began. The Lightning largely disappeared from battlefield inventories as existing stocks were destroyed or cannibalized for parts during the long technological decline.</p><p>The design's revival came under unexpected circumstances. Kressly Warworks on Epsilon Eridani began mass production of the Lightning in August 3067, mere months before the dissolution of the Second Star League. Under Word of Blake patronage, Kressly produced both the original design and a series of new variants tailored to Blakist tactical requirements. The Lightning-RL was conceived by Precentor Robert Havasy specifically to counter Capellan Confederation Shadow Lances operating on Tikonov. Havasy deployed teams of rocket-pod-equipped Lightnings several kilometers from Blakist factory complexes, waiting for stealth-armored BattleMechs to begin their raids before springing coordinated ambushes. In one notable engagement, his crews intercepted a Shadow Lance strike force, crippling a Pillager and a Warhammer before the remaining BattleMechs could withdraw. The surviving raiders attempted to disengage, but the Lightnings reloaded and made a second pass, destroying the rest of the formation.</p><p>Following the Jihad, Epsilon Eridani passed to the Republic of the Sphere, and Kressly continued Lightning production under Republic oversight. The factory remained active through the Dark Age, eventually falling under Capellan Confederation control during the ilClan era. ComStar also experimented with the design during the Jihad, producing a limited number of heavily modified CX-3 prototypes with vehicular stealth armor and sponson-mounted rocket launchers, though this variant saw only limited field evaluation.</p>\n</history>\n\n<manufacturer>\nRefit - Comstar\n</manufacturer>\n\n<primaryFactory>\nUnknown\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Curtiss Industries\nENGINE:General Motors\nARMOR:Unknown\nCOMMUNICATIONS:Century\nTARGETING:TGI\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:GM 210\nARMOR:Unknown\nCOMMUNICATIONS:Model 770\nTARGETING:2331C/TGI F-190\n</systemModels>\n\n<notes>\nVehicle overweight and Heat wrong in TRO:. No errata at this time.\n</notes>\n\n<source>\nXTR:Comstar\n</source>\n\n<published>\nXTR:Comstar\n</published>\n\n<tonnage>\n35.0\n</tonnage>\n\n",
    expected: {
      engine: 13.5,
      controls: 2,
      lift: 3.5,
      structure: 3.5,
      armor: 2,
      equipment: 10.5,
      turret: 0,
      heatSinks: 4,
      total: 39,
    },
    nativeWeightMethods: {
      calculateWeight: 39,
      calculateWeightExact: 39,
      getArmoredComponentWeight: 0,
      getTankWeightDualTurret: 0,
      getTankWeightLifting: 3.5,
      getTankWeightTurret: 0,
      getWeight: 35,
      getWeightAllocatedArmor: 2,
      getWeightAmmo: 0,
      getWeightArmor: 2,
      getWeightCarryingSpace: 0,
      getWeightControls: 2,
      getWeightEngine: 13.5,
      getWeightHeatSinks: 4,
      getWeightMisc: 3.5,
      getWeightMiscEquip: 2.5,
      getWeightPowerAmp: 0,
      getWeightStructure: 3.5,
      getWeightWeapon: 8,
    },
  },
  {
    path: 'vehicles/XTRs/Corporations/SturmFeur Kalki Cruise Missile Launcher.blk',
    sha256: '1412fee67e99acecca43f3af50f827cd2a4eca952ce3ae466f35a2552502a50d',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-ebd5-7f4d-bce8-e061a3846dc1\n</UUID>\n\n<UnitType>\nTank\n</UnitType>\n\n<Name>\nSturmFeur 'Kalki' Cruise Missile Launcher\n</Name>\n\n<Model>\n\n</Model>\n\n<mul id:>\n3112\n</mul id:>\n\n<year>\n3068\n</year>\n\n<type>\nIS Level 4\n</type>\n\n<role>\nMissile Boat\n</role>\n\n<motion_type>\nTracked\n</motion_type>\n\n<cruiseMP>\n2\n</cruiseMP>\n\n<engine_type>\n0\n</engine_type>\n\n<armor_type>\n0\n</armor_type>\n\n<armor_tech_rating>\n0\n</armor_tech_rating>\n\n<armor_tech_level>\n1\n</armor_tech_level>\n\n<armor>\n13\n12\n12\n12\n12\n7\n12\n</armor>\n\n<Body Equipment>\nISCruiseMissile50Ammo\nIS Machine Gun Ammo - Half\n</Body Equipment>\n\n<Front Equipment>\nISCruiseMissile50\n</Front Equipment>\n\n<Front Right Equipment>\n</Front Right Equipment>\n\n<Front Left Equipment>\n</Front Left Equipment>\n\n<Rear Right Equipment>\n</Rear Right Equipment>\n\n<Rear Left Equipment>\n</Rear Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<Turret Equipment>\nMachine Gun\nMachine Gun\n</Turret Equipment>\n\n<capabilities>\n<p>The experimental Kalki mounted a single Cruise Missile/50 launcher on an enlarged SturmFeur chassis, powered by a 250-rated fusion engine that limited the vehicle to approximately 32 km/h. The vehicle carried only a single missile reload, requiring external resupply after every second firing. Five tons of StarSlab armor provided minimal protection for the 125-ton hull, with coverage stretched dangerously thin across the expanded chassis. Two machine guns mounted in the turret offered negligible defensive capability against anything more threatening than unarmored infantry.</p><p>The SturmFeur chassis proved fundamentally unsuited to the stresses imposed by the cruise missile system. Suspension components failed frequently when traversing rough terrain, the turret assembly suffered from rotation problems and weapon jams, and crew ergonomics were reportedly poor. Most critically, the cruise missile launcher itself proved unreliable during live-fire testing, with repeated firings significantly increasing the probability of catastrophic failure. Kallon recommended complete overhaul after approximately fifteen launches, a maintenance burden that made the design impractical for sustained field operations.</p>\n</capabilities>\n\n<overview>\n<p>The SturmFeur 'Kalki' was the experimental predecessor to the production Kalki Cruise Missile Launcher, developed by Kallon Industries in 3068 as a proof of concept for mobile cruise missile artillery. Built on a heavily modified and enlarged SturmFeur chassis expanded to 125 tons, the prototype demonstrated that ground-based cruise missile deployment was technically feasible but revealed severe engineering shortcomings. The vehicle was never intended for mass production, serving instead as a testbed to validate the concept before Kallon committed to a purpose-built design. Despite its numerous flaws, the experimental Kalki provided invaluable data that informed the successful production model nearly a decade later.</p>\n</overview>\n\n<deployment>\n<p>The experimental Kalki never entered operational service. Several prototypes were built and tested at the Kallon Industries facility on Kirklin between 3068 and the early 3070s before the program was suspended. The test data gathered during the experimental program directly informed the successful production Kalki Cruise Missile Launcher that entered AFFS service in 3079.</p>\n</deployment>\n\n<history>\n<p>The experimental Kalki emerged from Kallon Industries' facility on Kirklin shortly after the onset of the Jihad in 3068. The Federated Commonwealth had recognized cruise missile technology's potential during the 3060s, but the massive scale of the launchers and ammunition made ground vehicle integration an enormous engineering challenge. Kallon was the first company to attempt a mobile deployment, using a modified SturmFeur chassis as the foundation.</p><p>Testing revealed numerous critical deficiencies across the prototype's structural, mechanical, and weapons systems. Kallon reportedly lost several prototypes along with their crews during live-fire exercises. The company attempted to salvage the project by rebranding it as a proof of concept and reimbursing the families of lost test crews, but the AFFS remained unconvinced. When competing defense contractors learned of Kallon's true costs, they abandoned their own programs. The experimental Kalki was formally shelved in the early 3070s, its data archived for the production redesign that would follow later in the decade.</p>\n</history>\n\n<manufacturer>\nKallon Industries\n</manufacturer>\n\n<primaryFactory>\nKirklin\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Brooks, Inc.\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:250 Fusion\nARMOR:StarSlab\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nXTR:Corps\n</source>\n\n<published>\nXTR:Corps\n</published>\n\n<tonnage>\n125.0\n</tonnage>\n\n",
    expected: {
      engine: 19,
      controls: 6.5,
      lift: 0,
      structure: 25,
      armor: 5,
      equipment: 81.5,
      turret: 0.5,
      heatSinks: 0,
      total: 137.5,
    },
    nativeWeightMethods: {
      calculateWeight: 137.5,
      calculateWeightExact: 137.5,
      getArmoredComponentWeight: 0,
      getTankWeightDualTurret: 0,
      getTankWeightLifting: 0,
      getTankWeightTurret: 0.5,
      getWeight: 125,
      getWeightAllocatedArmor: 5,
      getWeightAmmo: 25.5,
      getWeightArmor: 5,
      getWeightCarryingSpace: 0,
      getWeightControls: 6.5,
      getWeightEngine: 19,
      getWeightHeatSinks: 0,
      getWeightMisc: 0.5,
      getWeightMiscEquip: 0,
      getWeightPowerAmp: 0,
      getWeightStructure: 25,
      getWeightWeapon: 56,
    },
  },
];

const handler = new VehicleUnitHandler();
function load(content: string) {
  const parsed = new BlkParserService().parse(content);
  if (!parsed.success) throw Error(JSON.stringify(parsed.error));
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw Error(JSON.stringify(result.error));
  return { document: parsed.data.document, unit: result.data.unit };
}
it.each(fixtures)(
  '$path stays loadable and rejects its independently known overweight total',
  (row) => {
    expect(createHash('sha256').update(row.content).digest('hex')).toBe(
      row.sha256,
    );
    const { unit } = load(row.content);
    expect(unit.totalWeight).toBe(row.expected.total);
    expect(unit.remainingTonnage).toBeCloseTo(
      unit.tonnage - row.expected.total,
      9,
    );
    expect(unit.isValid).toBe(false);
    expect(handler.validate(unit).errors).toContain(
      'Total weight (' +
        row.expected.total.toFixed(2) +
        't) exceeds tonnage (' +
        unit.tonnage +
        't)',
    );
  },
);
it.each(fixtures)(
  '$path reuses independently recorded native component quantities',
  (row) => {
    const { unit, document } = load(row.content);
    const weight = computeNativeTankWeight(document, unit);
    expect(weight).toBeDefined();
    const { total: _total, ...components } = row.expected;
    expect(weight).toMatchObject({
      ...components,
      secondaryTurret: 0,
      powerAmplifiers: 0,
      isComplete: true,
    });
    expect(weight?.remaining).toBeCloseTo(unit.tonnage - row.expected.total, 9);
  },
);
it('keeps unresolved mounted mass unavailable without turning loading into rejection', () => {
  const parsed = new BlkParserService().parse(fixtures[0].content);
  if (!parsed.success) throw Error(JSON.stringify(parsed.error));
  const document = {
    ...parsed.data.document,
    equipmentByLocation: { Front: ['Unresolved source mount'] },
  };
  const result = handler.parse(document);
  expect(result.success).toBe(true);
  if (!result.success) throw Error(JSON.stringify(result.error));
  expect(computeNativeTankWeight(document, result.data.unit)).toBeUndefined();
  expect(() => handler.calculateWeight(result.data.unit)).toThrow(
    /weight.*incomplete/i,
  );
  expect(
    handler
      .validate(result.data.unit)
      .errors.filter((x) => x.startsWith('Total weight')),
  ).toEqual([]);
});
