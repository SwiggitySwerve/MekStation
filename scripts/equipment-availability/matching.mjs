import { normalize } from './sources.mjs';

// Stable catalog identities which differ from upstream lookup names. Dates and
// tech bases always come from the selected source, never from this mapping.
const aliases = {
  'enhanced-er-ppc': 'CLEnhancedPPC',
  'beagle-active-probe': 'createBeagleActiveProbe',
  'clan-active-probe': 'createCLActiveProbe',
  'clan-light-active-probe': 'createCLLightActiveProbe',
  'single-heat-sink': 'createHeatSink',
  claws: 'createISClaw',
  'compact-heat-sink': 'createIS1CompactHeatSink',
  'jump-jet': 'createJumpJet',
  'jump-jet-light': 'createJumpJet',
  'jump-jet-medium': 'createJumpJet',
  'jump-jet-heavy': 'createJumpJet',
  'improved-jump-jet-light': 'createImprovedJumpJet',
  'improved-jump-jet-medium': 'createImprovedJumpJet',
  'improved-jump-jet-heavy': 'createImprovedJumpJet',
  'guardian-ecm': 'createGECM',
  'watchdog-cews': 'createWatchdogECM',
  'c3-master': 'ISC3M',
  'c3-slave': 'createC3S',
  c3i: 'createC3I',
  'c3-boosted-master': 'ISC3MBS',
  'c3-boosted-slave': 'createC3SBS',
  'reactive-armor': 'createISReactive',
  'stealth-armor': 'createMekStealth',
  'b-pod': 'ISBPod',
  'risc-apds': 'ISAPDS',
  'arrow-iv-launcher': 'ISArrowIV',
  'clan-arrow-iv-launcher': 'CLArrowIV',
  'long-tom': 'LongTomCannon',
  'small-heavy-laser': 'CLHeavyLaserSmall',
  'medium-heavy-laser': 'CLHeavyLaserMedium',
  'large-heavy-laser': 'CLHeavyLaserLarge',
  'gauss-ammo': 'createISGaussAmmo',
  'light-gauss-ammo': 'createISLTGaussAmmo',
  'heavy-gauss-ammo': 'createISHVGaussAmmo',
  'ap-gauss-ammo': 'createCLAPGaussRifleAmmo',
  'ammunition/gauss.json:gauss': 'createISGaussAmmo',
  'ammunition/other.json:ams': 'createISAMSAmmo',
  'ams-ammo': 'createISAMSAmmo',
  'mg-ammo': 'createISMGAmmo',
  'mg-ammo-half': 'createISMGAmmoHalf',
  'light-mg-ammo': 'createISLightMGAmmo',
  'heavy-mg-ammo': 'createISHeavyMGAmmo',
  'narc-ammo': 'createISNarcAmmo',
  'lb-2-x-ammo': 'createISLB2XAmmo',
  'lb-5-x-ammo': 'createISLB5XAmmo',
  'lb-10-x-ammo': 'createISLB10XAmmo',
  'lb-20-x-ammo': 'createISLB20XAmmo',
  // These family bins share the dates of the representative rack size.
  'atm-standard-ammo': 'createCLATM3Ammo',
  'atm-er-ammo': 'createCLATM3ERAmmo',
  'atm-he-ammo': 'createCLATM3HEAmmo',
  'lrm-ammo': 'createISLRM5Ammo',
  'mrm-ammo': 'createISMRM10Ammo',
  'srm-ammo': 'createISSRM2Ammo',
  // The /2 supplies the initial availability interval; /4 and /6 arrive later.
  'streak-srm-ammo': 'createISStreakSRM2Ammo',
  'ammunition/srm.json:clan-streak-srm-2': 'createCLStreakSRM2Ammo',
  'ac-2-ap-ammo': 'ARMOR_PIERCING_MUNITION_MUTATOR',
  'ac-5-ap-ammo': 'ARMOR_PIERCING_MUNITION_MUTATOR',
  'ac-2-precision-ammo': 'PRECISION_MUNITION_MUTATOR',
  'lrm-fragmentation-ammo': 'FRAGMENTATION_MUNITION_MUTATOR_FOR_LRM',
  'lrm-thunder-ammo': 'THUNDER_MUNITION_MUTATOR',
  'lrm-swarm-ammo': 'SWARM_MUNITION_MUTATOR',
  'srm-inferno-ammo': 'INFERNO_MUNITION_MUTATOR',
  'srm-fragmentation-ammo': 'FRAGMENTATION_MUNITION_MUTATOR',
  'srm-tandem-charge-ammo': 'TANDEM_CHARGE_MUNITION_MUTATOR',
  'coolant-pod': 'createISCoolantPod',
  'clan-mech-mortar-2': 'CLMekMortar2',
  'clan-mech-mortar-4': 'CLMekMortar4',
  bacompactnarc: 'CLBACompactNarc',
  // Legacy catalog IDs correspond to the unofficial, non-BA constructors.
  rl1: 'ISRL1',
  rl2: 'ISRL2',
  rl3: 'ISRL3',
  rl4: 'ISRL4',
};

export function matchSource(item, file, records) {
  const kind = file.startsWith('ammunition/')
    ? 'ammunition'
    : file.startsWith('weapons/') && !file.endsWith('physical.json')
      ? 'weapon'
      : 'misc';
  const pool = records.filter(
    (record) =>
      record.kind === kind || (kind === 'misc' && record.kind === 'weapon'),
  );
  const alias = aliases[`${file}:${item.id}`] ?? aliases[item.id];
  if (alias) {
    const source = records.find((record) => record.key === alias);
    if (!source) throw new Error(`Missing explicit source ${alias}`);
    return { source };
  }
  const identities = new Set(
    [
      item.id,
      item.id.replace(/^clan-/, 'cl-'),
      item.name,
      item.name.replace(/ \(Clan\)$/, ''),
      item.name.replace(/^Clan /, ''),
      item.name.replace(/ \(Clan\)$/, '').replace(/^/, 'Clan '),
    ].map(normalize),
  );
  let candidates = pool.filter(
    (record) =>
      record.names.some((name) => identities.has(normalize(name))) ||
      identities.has(normalize(record.key)),
  );
  if (!candidates.length) return { reason: 'unmatched', candidates: [] };
  if (candidates.length > 1) {
    const exactName = candidates.filter(
      (record) => normalize(record.names[0]) === normalize(item.name),
    );
    if (exactName.length) candidates = exactName;
  }
  if (candidates.length > 1) {
    // Imported rows can have the wrong techBase; an explicit identity wins.
    const tech =
      /^clan[- ]/i.test(item.id) || /(?:^Clan |\(Clan\)$)/.test(item.name)
        ? 'CLAN'
        : item.techBase === 'CLAN'
          ? 'CLAN'
          : 'IS';
    const sameTech = candidates.filter(
      (record) => record.tech === tech || record.tech === 'ALL',
    );
    if (sameTech.length) candidates = sameTech;
  }
  if (candidates.length > 1) {
    const sameSize = candidates.filter(
      (record) =>
        record.weight === item.weight && record.slots === item.criticalSlots,
    );
    if (sameSize.length) candidates = sameSize;
  }
  return candidates.length === 1
    ? { source: candidates[0] }
    : {
        reason: 'ambiguous',
        candidates: candidates.map((record) => `${record.path}#${record.key}`),
      };
}
