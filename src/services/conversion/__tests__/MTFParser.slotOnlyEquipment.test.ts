import { MTFParserService } from '../MTFParserService';

// Gyro identities now come from the shared MTF component vocabulary and are
// covered by MTFParser.vocabulary.test.ts (replaces the XL-only precursor).

const parse = (slots: string, weapons = '', mass = 80) =>
  new MTFParserService().parse(
    `chassis:Slot test\nmodel:Native\nConfig:Biped\ntechbase:Inner Sphere\nmass:${mass}\nWeapons:0\n${weapons}\n\n${slots}`,
  );

// Original left-torso sections, mm-data 50f7efe, meks/3075/Kiso KR4/KR5.
it.each([
  ['K-3N-KR4 ConstructionMech', 'Rock Cutter', 'rock-cutter', 7, 5],
  ['K-3N-KR5 ConstructionMech', 'Backhoe', 'backhoe', 6, 6],
] as const)(
  'retains sized communications before the Kiso %s tool',
  (model, token, id, start, count) => {
    const slots = [
      ...(start === 7 ? ['Heat Sink'] : []),
      ...Array<string>(3).fill('Communications Equipment:SIZE:3.0'),
      ...Array<string>(3).fill('Lift Hoist/Arresting Hoist'),
      ...Array<string>(count).fill(token),
    ];
    const result = new MTFParserService().parse(
      `chassis:Kiso\nmodel:${model}\nConfig:Quad\ntechbase:Inner Sphere\nmass:100\nWeapons:0\n\nLeft Torso:\n${slots.join('\n')}`,
    );
    expect(result.unit?.criticalSlots.LEFT_TORSO).toEqual(slots);
    expect(result.unit?.equipment).toEqual([
      {
        id,
        location: 'LEFT_TORSO',
        slots: Array.from({ length: count }, (_, i) => start + i),
      },
    ]);
  },
);

it('loads one complete Cudgel Mace from criticals with no summary', () => {
  expect(
    parse(`Left Arm:\n${Array(8).fill('Mace').join('\n')}`).unit?.equipment,
  ).toEqual([
    { id: 'mace', location: 'LEFT_ARM', slots: [0, 1, 2, 3, 4, 5, 6, 7] },
  ]);
});

it('keeps repeated shields, qualifiers and an ordinary unlisted weapon', () => {
  const result = parse(
    `Left Arm:\n${Array(6).fill('ISSmallShield (R) (OMNIPOD) (ARMORED)').join('\n')}\nRight Arm:\nISMediumLaser`,
  );
  expect(result.unit?.equipment).toEqual([
    {
      id: 'smallshield',
      location: 'LEFT_ARM',
      slots: [0, 1, 2],
      isRearMounted: true,
      isOmniPodMounted: true,
    },
    {
      id: 'smallshield',
      location: 'LEFT_ARM',
      slots: [3, 4, 5],
      isRearMounted: true,
      isOmniPodMounted: true,
    },
    { id: 'medium-laser', location: 'RIGHT_ARM', slots: [0] },
  ]);
});

it('reserves listed multiplicity and preserves unrelated summary fields', () => {
  const result = parse(
    `Left Arm:\n${Array(8).fill('Mace').join('\n')}`,
    'Mace, Left Arm',
    40,
  );
  expect(result.unit?.equipment).toEqual([
    { id: 'mace', location: 'LEFT_ARM' },
    { id: 'mace', location: 'LEFT_ARM', slots: [4, 5, 6, 7] },
  ]);
});

it('joins a slot-only split weapon through the canonical adjacency owner', () => {
  const result = parse(
    `Left Arm:\n${Array(6).fill('ISAC20').join('\n')}\nLeft Torso:\n${Array(4).fill('ISAC20').join('\n')}`,
  );
  expect(result.unit?.equipment).toEqual([
    { id: 'ac-20', location: 'LEFT_ARM', slots: [0, 1, 2, 3, 4, 5] },
  ]);
});

it('retains unknown and incomplete critical entries without inventing mounts', () => {
  const result = parse('Left Arm:\nMystery Cannon\nMace');
  expect(result.unit?.equipment).toEqual([]);
  expect(result.unit?.criticalSlots.LEFT_ARM.slice(0, 2)).toEqual([
    'Mystery Cannon',
    'Mace',
  ]);
  expect(result.warnings.join(' ')).toMatch(/incomplete.*mace/i);
});

it('reserves Clan summary aliases and both locations of a split summary', () => {
  const clan = new MTFParserService().parse(
    'chassis:Clan\nmass:50\ntechbase:Clan\nWeapons:1\nER Medium Laser, Left Arm\n\nLeft Arm:\nCLERMediumLaser',
  );
  expect(clan.unit?.equipment).toEqual([
    { id: 'er-medium-laser', location: 'LEFT_ARM' },
  ]);
  expect(
    parse(
      `Left Arm:\n${Array(6).fill('ISAC20').join('\n')}\nLeft Torso:\n${Array(4).fill('ISAC20').join('\n')}`,
      'AC/20, Left Torso',
    ).unit?.equipment,
  ).toEqual([{ id: 'ac-20', location: 'LEFT_TORSO' }]);
});

it('does not classify shared-id ammunition as another weapon', () => {
  const result = parse('Left Arm:\nCLStreakSRM4\nClan Ammo Streak SRM-4');
  expect(result.unit?.equipment).toEqual([
    { id: 'clan-streak-srm-4', location: 'LEFT_ARM', slots: [0] },
  ]);
});

it('keeps cold-parser artillery and apostrophized mortar summary aliases', () => {
  expect(
    parse(
      `Left Arm:\n${Array(10).fill('CLArrowIV').join('\n')}\nLeft Torso:\nCLArrowIV\nCLArrowIV`,
      'Arrow IV, Left Torso',
    ).unit?.equipment,
  ).toEqual([{ id: 'arrow-iv', location: 'LEFT_TORSO' }]);
  expect(
    parse(
      'Left Arm:\nClan Mech Mortar-8\nClan Mech Mortar-8\nClan Mech Mortar-8',
      "'Mech Mortar 8, Left Arm",
    ).unit?.equipment,
  ).toEqual([{ id: "'mech-mortar-8", location: 'LEFT_ARM' }]);
});
