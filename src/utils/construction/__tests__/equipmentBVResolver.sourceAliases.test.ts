import {
  getEquipmentEntry,
  normalizeEquipmentId,
} from '../equipmentBVResolver';

describe('pinned native lookup identities', () => {
  it.each([
    ['IS Vehicle Flamer', 'vehicle-flamer'],
    ['ISVehicleFlamer', 'vehicle-flamer'],
    ['Autocannon/2', 'ac-2'],
    ['Autocannon/5', 'ac-5'],
    ['Autocannon/10', 'ac-10'],
    ['Autocannon/20', 'ac-20'],
    ['autocannon-2', 'ac-2'],
    ['autocannon-5', 'ac-5'],
    ['autocannon-10', 'ac-10'],
    ['autocannon-20', 'ac-20'],
    ['Light Auto Cannon/2', 'lac-2'],
    ['Light Auto Cannon/5', 'lac-5'],
    ['Hyper Velocity Auto Cannon/2', 'hyper-velocity-auto-cannon-2'],
    ['Hyper Velocity Auto Cannon/5', 'hyper-velocity-auto-cannon-5'],
    ['Hyper Velocity Auto Cannon/10', 'hyper-velocity-auto-cannon-10'],
    ['Binary Laser (Blazer) Cannon', 'blazer-cannon'],
    ['Naval Gauss (Heavy)', 'naval-gauss-heavy'],
    ['Naval Gauss (Medium)', 'naval-gauss-medium'],
    ['Naval Gauss (Light)', 'naval-gauss-light'],
    ['TSEMP Cannon', 'tsemp-cannon'],
    ['BAJumpJet', 'jump-jet-ba'],
    ['BAJumpBooster', 'jump-booster-ba'],
    ['BAPartialWing', 'partial-wing-ba'],
    ['BAParafoil', 'parafoil'],
    ['BAVTOL', 'vtol-ba'],
    ['BAUMU', 'umu-ba'],
    ['Armored Chassis', 'armored-chassis'],
    ['fed-suns-infantry-kit-3067+', 'fed-suns-infantry-kit-3067'],
    [
      'free-worlds-league-infantry-kit-3035+',
      'free-worlds-league-infantry-kit-3035',
    ],
    [
      'lyran-alliance-lyran-commonwealth-3060+-infantry-kit',
      'lyran-alliance-lyran-commonwealth-3060-infantry-kit',
    ],
    [
      'clothing,-fatigues-civilian-non-armored',
      'clothing-fatigues-civilian-non-armored',
    ],
    ['environment-suit,-hostile', 'environment-suit-hostile'],
    ['ballistic-plate,-standard', 'ballistic-plate-standard'],
    ['environment-suit,-marine', 'environment-suit-marine'],
    ['flak,-standard', 'flak-standard'],
    ['clothing,-leather-synthetic-hide', 'clothing-leather-synthetic-hide'],
    ['spacesuit,-combat', 'spacesuit-combat'],
    ['ablative-flak,-concealed', 'ablative-flak-concealed'],
    ['myomer,-vest', 'myomer-vest'],
    ['ba-srm4-ammo', 'ba-srm4'],
    ['ba-advanced-srm-2-ammo', 'ba-advanced-srm-2'],
    ['is-ba-ammo-lrm-3', 'ba-ammo-lrm-3'],
    ['ba-compact-narc-ammo', 'compact-narc-ammo'],
    ['CLAPGaussRifle Ammo', 'apgaussrifle'],
    ['clapgaussrifle-ammo', 'apgaussrifle'],
  ])('%s selects exactly %s', (native, canonical) => {
    expect(getEquipmentEntry(native)?.id).toBe(canonical);
  });

  it('keeps vehicle and fusion flamers distinct', () => {
    expect(getEquipmentEntry('vehicle-flamer')).toMatchObject({
      id: 'vehicle-flamer',
      battleValue: 5,
      weight: 0.5,
    });
    expect(getEquipmentEntry('Flamer')?.id).toBe('flamer');
  });

  it.each([
    ['IS Ammo AC/5:20', 'ac-5-ammo'],
    ['is-ammo-ac-5:40:omni', 'ac-5-ammo'],
    ['(R) (B) IS Gauss Ammo:16', 'gauss-ammo'],
    ['Clan Streak SRM 6 Ammo:15', 'clan-streak-srm-6'],
  ])('parses numeric capital shots in %s', (native, canonical) => {
    expect(getEquipmentEntry(native)?.id).toBe(canonical);
  });

  it.each([
    ['(B) ISERLargeLaser', 'er-large-laser'],
    ['b-iserlargelaser', 'er-large-laser'],
    ['(B) (R) CLERLargeLaser:OMNI', 'clan-er-large-laser'],
    ['r-b-clerlargelaser:omni', 'clan-er-large-laser'],
    ['ISERMediumLaser:LA', 'er-medium-laser'],
    ['ISERMediumLaser:RA:APM', 'er-medium-laser'],
    ['ISERMediumLaser:DWP:Body', 'er-medium-laser'],
    ['ISERMediumLaser:SSWM:TU', 'er-medium-laser'],
    ['IS Ammo LRM-15:Shots8#', 'ammo-lrm-15'],
    ['(B) IS Ammo LRM-15:OMNI:Shots8#:SIZE:0.5', 'ammo-lrm-15'],
    ['b-is-ammo-lrm-15:shots8#', 'ammo-lrm-15'],
    ['(B) Autocannon/5', 'ac-5'],
    ['b-autocannon-5', 'ac-5'],
    ['CLBAMG:RA', 'bamg'],
    ['CLBAAPGaussRifle:LA', 'baapgaussrifle'],
    ['CLMediumChemLaserAmmo (15)', 'clan-medium-chemical-laser-ammo'],
    ['Clan LB 2-X AC Ammo (20)', 'clan-lb-2-x-ac'],
    ['CLAPGaussRifle Ammo (10)', 'apgaussrifle'],
    ['(B) Naval Gauss (Heavy)', 'naval-gauss-heavy'],
    ['(B) Clan Ammo LRM-15:Shots8#', 'clan-ammo-lrm-15-registry'],
    [
      '(B) IS Ammo LRM-15 Artemis-capable:Shots8#',
      'is-ammo-lrm-15-artemis-capable-registry',
    ],
    ['(B) Naval Laser 55', 'naval-laser-55-registry'],
    ['ISBAERMediumLaser:LA', 'isbaermediumlaser-registry'],
    ['Clan Ammo LRM-15 (10)', 'clan-ammo-lrm-15-registry'],
    ['Sniper', 'sniper'],
    ['ISSniper', 'sniper'],
  ])('parses mount metadata in %s', (native, canonical) => {
    expect(getEquipmentEntry(native)?.id).toBe(canonical);
  });

  it.each([
    'IS Ammo LRM-15:Shots8',
    'IS Ammo LRM-15:Shots-1#',
    'IS Ammo LRM-15:Shots1.5#',
    'CLMediumChemLaserAmmo (-1)',
    'CLMediumChemLaserAmmo (1.5)',
    'IS Ammo AC/5:-20',
    'IS Ammo AC/5:1.5',
    'ISERMediumLaser:20',
    'ISERMediumLaser:Unknown',
    'ISERMediumLaser:SIZE:bad',
  ])('leaves missing variants and malformed tokens unresolved: %s', (id) => {
    expect(getEquipmentEntry(id)).toBeUndefined();
  });

  it.each(['b-pod', 'lift-hoist-arresting-hoist', 'vehicle-flamer'])(
    'preserves exact ID %s',
    (id) => {
      expect(normalizeEquipmentId(id)).toBe(id);
    },
  );

  it.each([
    ['r-myomer,-vest', 'myomer-vest'],
    ['r-lift-hoist-arresting-hoist', 'lift-hoist-arresting-hoist'],
  ])('preserves qualified catalog bases in %s', (native, canonical) => {
    expect(getEquipmentEntry(native)?.id).toBe(canonical);
  });
});
