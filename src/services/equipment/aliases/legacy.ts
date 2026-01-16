/**
 * Legacy MegaMek ID Parsing Utilities
 *
 * Provides parsing and conversion for legacy MegaMek-style equipment IDs.
 * Handles formats like: "1-ismediumlaser", "2-clermediumlaser", "1-islbxac10"
 *
 * @module services/equipment/aliases/legacy
 */

/**
 * Parse legacy MegaMek-style equipment IDs
 * Formats like: "1-ismediumlaser", "2-clermediumlaser", "1-islbxac10"
 *
 * Pattern: [quantity]-[techbase][equipmentname]
 * - quantity: numeric prefix (1, 2, 3, etc.)
 * - techbase: 'is' (Inner Sphere) or 'cl' (Clan)
 * - equipmentname: concatenated equipment name
 *
 * @returns Canonical equipment ID or null if not a legacy format
 */
export function parseLegacyMegaMekId(legacyId: string): string | null {
  // Match pattern: optional quantity prefix + techbase + equipment
  // Examples: "1-ismediumlaser", "clerlargelaser", "1-islbxac10", "1-is-coolant-pod"
  const patterns = [
    // With quantity prefix and hyphenated techbase: "1-is-coolant-pod"
    /^(\d+)-(is|cl)-(.+)$/i,
    // With quantity prefix: "1-ismediumlaser"
    /^(\d+)-?(is|cl)(.+)$/i,
    // Without quantity: "ismediumlaser", "clerlargelaser"
    /^(is|cl)(.+)$/i,
  ];

  let techBase: 'is' | 'cl' | null = null;
  let equipName: string = '';

  for (const pattern of patterns) {
    const match = legacyId.match(pattern);
    if (match) {
      if (match.length === 4) {
        // With quantity: [full, quantity, techbase, name]
        techBase = match[2].toLowerCase() as 'is' | 'cl';
        equipName = match[3].toLowerCase();
      } else if (match.length === 3) {
        // Without quantity: [full, techbase, name]
        techBase = match[1].toLowerCase() as 'is' | 'cl';
        equipName = match[2].toLowerCase();
      }
      break;
    }
  }

  if (!techBase || !equipName) {
    return null;
  }

  // Build canonical ID by converting concatenated name to slug format
  // e.g., "mediumlaser" -> "medium-laser", "erlarge laser" -> "er-large-laser"
  const canonicalId = convertMegaMekNameToSlug(equipName, techBase);
  return canonicalId;
}

/**
 * Convert MegaMek concatenated equipment name to slug format
 */
export function convertMegaMekNameToSlug(name: string, techBase: 'is' | 'cl'): string {
  const prefix = techBase === 'cl' ? 'clan-' : '';

  // Common weapon patterns
  const weaponPatterns: [RegExp, string][] = [
    // Lasers
    [/^ersmalllaser$/, `${prefix}er-small-laser`],
    [/^ermediumlaser$/, `${prefix}er-medium-laser`],
    [/^erlargelaser$/, `${prefix}er-large-laser`],
    [/^smalllaser$/, 'small-laser'],
    [/^mediumlaser$/, 'medium-laser'],
    [/^largelaser$/, 'large-laser'],
    [/^smallpulselaser$/, `${prefix}small-pulse-laser`],
    [/^mediumpulselaser$/, `${prefix}medium-pulse-laser`],
    [/^largepulselaser$/, `${prefix}large-pulse-laser`],
    [/^smallxpulselaser$/, `smallxpulselaser`],
    [/^mediumxpulselaser$/, `mediumxpulselaser`],
    [/^largexpulselaser$/, `largexpulselaser`],
    [/^smallvsplaser$/, `${prefix}small-vsp-laser`],
    [/^mediumvsplaser$/, `${prefix}medium-vsp-laser`],
    [/^largevsplaser$/, `${prefix}large-vsp-laser`],
    [/^heavylargelaser$/, `large-heavy-laser`],
    [/^heavymediumlaser$/, `medium-heavy-laser`],
    [/^heavysmalllaser$/, `small-heavy-laser`],
    [/^microlaser$/, `${prefix}micro-laser`],
    [/^microlaser$/, `${prefix}micro-laser`],
    [/^rellaser$/, `${prefix}re-engineered-large-laser`],
    [/^chemicallargelaser$/, `${prefix}chemical-large-laser`],
    [/^chemicalmediumlaser$/, `${prefix}chemical-medium-laser`],
    [/^chemicalsmalllaser$/, `${prefix}chemical-small-laser`],
    [/^bombastlaser$/, `${prefix}bombast-laser`],

    // PPCs
    [/^ppc$/, 'ppc'],
    [/^erppc$/, `${prefix}er-ppc`],
    [/^heavyppc$/, `${prefix}heavy-ppc`],
    [/^lightppc$/, `${prefix}light-ppc`],
    [/^snppc$/, `${prefix}snub-nose-ppc`],
    [/^snubnose?ppc$/, `${prefix}snub-nose-ppc`],

    // Autocannons
    [/^ac(\d+)$/, 'ac-$1'],
    [/^uac(\d+)$/, `${prefix}uac-$1`],
    [/^ultraac(\d+)$/, `${prefix}uac-$1`],
    [/^lac(\d+)$/, `${prefix}lac-$1`],
    [/^lightac(\d+)$/, `${prefix}lac-$1`],
    [/^lbxac(\d+)$/, `${prefix}lb-$1-x-ac`],
    [/^lb(\d+)xac$/, `${prefix}lb-$1-x-ac`],
    [/^lb(\d+)x$/, `${prefix}lb-$1-x-ac`],
    [/^rac(\d+)$/, `${prefix}rac-$1`],
    [/^rotaryac(\d+)$/, `${prefix}rac-$1`],
    [/^hvac(\d+)$/, `${prefix}hvac-$1`],
    [/^hypervelocityac(\d+)$/, `${prefix}hvac-$1`],

    // Hyper Assault Gauss
    [/^hag(\d+)$/, `hag$1`],

    // Gauss
    [/^gaussrifle$/, `${prefix}gauss-rifle`],
    [/^lightgaussrifle$/, `${prefix}light-gauss-rifle`],
    [/^heavygaussrifle$/, `${prefix}heavy-gauss-rifle`],
    [/^improvedheavygaussrifle$/, `${prefix}improved-heavy-gauss-rifle`],
    [/^magshot$/, 'magshot'],
    [/^silverbulletgauss$/, 'silver-bullet-gauss'],

    // Missiles
    [/^srm(\d+)$/, `${prefix}srm-$1`],
    [/^lrm(\d+)$/, `${prefix}lrm-$1`],
    [/^mrm(\d+)$/, `${prefix}mrm-$1`],
    [/^mml(\d+)$/, `${prefix}mml-$1`],
    [/^streaksrm(\d+)$/, `${prefix}streak-srm-$1`],
    [/^streaklrm(\d+)$/, `${prefix}streak-lrm-$1`],
    [/^atm(\d+)$/, `${prefix}atm-$1`],
    [/^iatm(\d+)$/, `${prefix}iatm-$1`],
    [/^extendedlrm(\d+)$/, `${prefix}extended-lrm-$1`],
    [/^elrm(\d+)$/, `${prefix}extended-lrm-$1`],
    [/^rl(\d+)$/, `rl$1`],
    [/^rocketlauncher(\d+)$/, `rl$1`],
    [/^rocketlauncher(\d+)prototype$/, `rl$1`],
    [/^narc$/, `${prefix}narc`],
    [/^narcbeacon$/, `${prefix}narc`],
    [/^inarc$/, `${prefix}inarc`],
    [/^inarcbeacon$/, `${prefix}inarc`],
    [/^thunderbolt(\d+)$/, `${prefix}thunderbolt-$1`],

    // Machine Guns
    [/^machinegun$/, `${prefix}machine-gun`],
    [/^mg$/, `${prefix}machine-gun`],
    [/^lightmachinegun$/, `${prefix}light-machine-gun`],
    [/^lightmg$/, `${prefix}light-machine-gun`],
    [/^heavymachinegun$/, `${prefix}heavy-machine-gun`],
    [/^heavymg$/, `${prefix}heavy-machine-gun`],

    // Other weapons
    [/^flamer$/, `${prefix}flamer`],
    [/^erflamer$/, `${prefix}er-flamer`],
    [/^heavyflamer$/, `${prefix}heavy-flamer`],
    [/^vehicleflamer$/, 'vehicle-flamer'],
    [/^plasmarifle$/, `${prefix}plasma-rifle`],
    [/^plasmacannon$/, `${prefix}plasma-cannon`],
    [/^tag$/, `${prefix}tag`],
    [/^lighttag$/, `${prefix}light-tag`],

    // Electronics
    [/^guardianecm$/, `${prefix}guardian-ecm`],
    [/^angelecm$/, `${prefix}angel-ecm`],
    [/^ecmsuite$/, `${prefix}ecm-suite`],
    [/^beagleactiveprobe$/, `${prefix}beagle-active-probe`],
    [/^bloodhoundactiveprobe$/, `${prefix}bloodhound-active-probe`],
    [/^lightactiveprobe$/, `${prefix}light-active-probe`],
    [/^c3slaveunit$/, 'c3-slave'],
    [/^c3slave$/, 'c3-slave'],
    [/^c3mastercomputer$/, 'c3-master'],
    [/^c3master$/, 'c3-master'],
    [/^c3i$/, 'c3i'],
    [/^improvedc3cpu$/, 'improved-c3'],
    [/^improvedc3computer$/, 'improved-c3'],
    [/^targetingcomputer$/, `${prefix}targeting-computer`],
    [/^watchdogcews$/, `${prefix}watchdog-cews`],
    [/^ecm$/, `${prefix}guardian-ecm`],
    [/^activeprobe$/, `${prefix}active-probe`],

    // Physical Weapons
    [/^sword$/, 'sword'],
    [/^hatchet$/, 'hatchet'],
    [/^mace$/, 'mace'],
    [/^claw$/, `${prefix}claw`],
    [/^talons$/, `${prefix}talons`],

    // Artillery
    [/^arrowiv$/, `${prefix}arrow-iv`],
    [/^arrowivmissile$/, `${prefix}arrow-iv`],
    [/^arropivsystem$/, `${prefix}arrow-iv`],
    [/^longtom$/, `${prefix}long-tom`],
    [/^sniper$/, `${prefix}sniper-cannon`],
    [/^thumper$/, `${prefix}thumper-cannon`],

    // Misc Equipment
    [/^coolantpod$/, `${prefix}coolant-pod`],
    [/^mpod$/, `${prefix}m-pod`],
    [/^bpod$/, `${prefix}b-pod`],

    // Anti-Missile
    [/^ams$/, `${prefix}ams`],
    [/^antimissilesystem$/, `${prefix}ams`],
    [/^laserantimissilesystem$/, `${prefix}laser-ams`],
    [/^laserAMS$/, `${prefix}laser-ams`],
    [/^clams$/, 'clan-ams'],
  ];

  // Try each pattern
  for (const [pattern, replacement] of weaponPatterns) {
    if (pattern.test(name)) {
      return name.replace(pattern, replacement);
    }
  }

  // Fallback: convert camelCase to slug
  // Insert hyphens before capital letters and numbers
  const slug = name
    .replace(/([a-z])(\d)/g, '$1-$2')  // letter followed by number
    .replace(/(\d)([a-z])/g, '$1-$2')  // number followed by letter
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase
    .toLowerCase();

  return prefix + slug;
}
