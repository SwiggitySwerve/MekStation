import {
  buildPhysicalAttackCommands,
  SUPPORTED_PHYSICAL_ATTACK_TYPES,
  MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES,
  PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
  PHYSICAL_ATTACK_ACTION_SUPPORT,
  sortedKeys,
  supportGaps,
  supportIdsByLevel,
} from './combatActionCatalog.test-helpers';

it('tracks supported physical attack types that have no tactical command', () => {
  const physicalCommandAttackTypes = Object.fromEntries(
    buildPhysicalAttackCommands().map((command) => [
      command.id,
      command.commit({} as never).payload?.attackType,
    ]),
  );

  expect(sortedKeys(PHYSICAL_ATTACK_ACTION_SUPPORT)).toEqual(
    [...SUPPORTED_PHYSICAL_ATTACK_TYPES].sort(),
  );
  expect(supportGaps(PHYSICAL_ATTACK_ACTION_SUPPORT)).toEqual([]);
  expect(physicalCommandAttackTypes).toMatchObject({
    'physical.break-grapple': 'break-grapple',
    'physical.charge': 'charge',
    'physical.club': 'hatchet',
    'physical.dfa': 'dfa',
    'physical.flail': 'flail',
    'physical.brush-off': 'brush-off',
    'physical.grapple': 'grapple',
    'physical.jump-jet-attack': 'jump-jet-attack',
    'physical.kick': 'kick',
    'physical.lance': 'lance',
    'physical.mace': 'mace',
    'physical.punch': 'punch',
    'physical.push': 'push',
    'physical.retractable-blade': 'retractable-blade',
    'physical.sword': 'sword',
    'physical.thrash': 'thrash',
    'physical.trip': 'trip',
    'physical.wrecking-ball': 'wrecking-ball',
  });
  expect(
    supportIdsByLevel(PHYSICAL_ATTACK_ACTION_SUPPORT, 'integrated'),
  ).toEqual([
    'break-grapple',
    'brush-off',
    'charge',
    'dfa',
    'flail',
    'grapple',
    'hatchet',
    'jump-jet-attack',
    'kick',
    'lance',
    'mace',
    'punch',
    'push',
    'retractable-blade',
    'sword',
    'thrash',
    'trip',
    'wrecking-ball',
  ]);
  expect(
    supportIdsByLevel(PHYSICAL_ATTACK_ACTION_SUPPORT, 'helper-only'),
  ).toEqual([]);
  for (const entry of Object.values(PHYSICAL_ATTACK_ACTION_SUPPORT)) {
    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: expect.stringContaining('physicalAttackCommands.ts#L'),
        }),
      ]),
    );
  }
});

it('partitions every source-checked MegaMek physical action class into BattleMech support or explicit scope gaps', () => {
  expect(
    Object.values(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT)
      .map((entry) => entry.sourceClass)
      .sort(),
  ).toEqual([...MEGAMEK_CONCRETE_PHYSICAL_ACTION_CLASSES].sort());
  expect(supportGaps(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT)).toEqual([]);

  expect(
    supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'integrated'),
  ).toEqual([
    'break-grapple',
    'brush-off',
    'charge',
    'club',
    'dfa',
    'grapple',
    'jump-jet-attack',
    'kick',
    'punch',
    'push',
    'thrash',
    'trip',
  ]);
  expect(
    supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT, 'out-of-scope'),
  ).toEqual([
    'airmek-ram',
    'battle-armor-vibro-claw',
    'lay-explosives',
    'protomek-physical',
    'ram',
  ]);

  const battleMechGaps = Object.values(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT)
    .filter(
      (entry) =>
        entry.battleMechScope === 'battlemech' && entry.level === 'unsupported',
    )
    .map((entry) => entry.id)
    .sort();
  expect(battleMechGaps).toEqual([]);
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.grapple).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runtime PhysicalAttackType'),
    runtimeAttackTypes: ['grapple'],
  });
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.grapple.gap).toBeUndefined();
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['break-grapple']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runtime PhysicalAttackType'),
    runtimeAttackTypes: ['break-grapple'],
  });
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['break-grapple'].gap,
  ).toBeUndefined();
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['brush-off']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runtime PhysicalAttackType'),
    runtimeAttackTypes: ['brush-off'],
  });
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['brush-off'].gap).toBeUndefined();
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.thrash).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runtime PhysicalAttackType'),
    runtimeAttackTypes: ['thrash'],
  });
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.thrash.gap).toBeUndefined();
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.trip).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runtime PhysicalAttackType'),
    runtimeAttackTypes: ['trip'],
  });
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.trip.gap).toBeUndefined();
  expect(PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['jump-jet-attack']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runtime PhysicalAttackType'),
    runtimeAttackTypes: ['jump-jet-attack'],
  });
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['jump-jet-attack'].gap,
  ).toBeUndefined();

  const invalidPhysicalClassRefs = Object.values(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
  ).flatMap((entry) => {
    const sourceRefs = entry.sourceRefs ?? [];
    if (sourceRefs.length === 0) return [`${entry.id}: missing sourceRefs`];

    return sourceRefs.flatMap((sourceRef, index) => {
      const sourceRefId = `${entry.id}.sourceRefs[${index}]`;
      const failures: string[] = [];

      if (sourceRef.kind === 'megamek-source') {
        if (
          sourceRef.sourceVersion !== '325b2504c7b7750ecdcb85468621fb2de2ad8e60'
        ) {
          failures.push(`${sourceRefId}: expected commit-pinned version`);
        }
        const expectedSourceClass =
          entry.id === 'break-grapple' &&
          sourceRef.citation.includes('shared grapple weight-class')
            ? 'GrappleAttackAction'
            : entry.sourceClass;
        if (!sourceRef.url.includes(expectedSourceClass)) {
          failures.push(`${sourceRefId}: expected source class URL`);
        }
      } else if (sourceRef.kind === 'mekstation-deviation') {
        if (sourceRef.sourceVersion !== 'MekStation working-tree') {
          failures.push(
            `${sourceRefId}: expected MekStation working-tree version`,
          );
        }
        if (!sourceRef.url.startsWith('src/')) {
          failures.push(`${sourceRefId}: expected local src/ URL`);
        }
      } else {
        failures.push(`${sourceRefId}: unexpected source ref kind`);
      }
      if (!sourceRef.url.includes('#L')) {
        failures.push(`${sourceRefId}: missing line anchor`);
      }

      return failures;
    });
  });
  expect(invalidPhysicalClassRefs).toEqual([]);
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['brush-off'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    expect.stringContaining('BrushOffAttackAction'),
    expect.stringContaining('canBrushOff'),
    expect.stringContaining('physical attack tests'),
  ]);
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.thrash.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    expect.stringContaining('ThrashAttackAction'),
    expect.stringContaining('canThrash'),
    expect.stringContaining('physical attack tests'),
  ]);
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.trip.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    expect.stringContaining('TripAttackAction'),
    expect.stringContaining('canTrip'),
    expect.stringContaining('physical attack tests'),
  ]);
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT.grapple.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    expect.stringContaining('GrappleAttackAction'),
    expect.stringContaining('canGrapple'),
    expect.stringContaining('physical attack tests'),
  ]);
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['break-grapple'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    expect.stringContaining('BreakGrappleAttackAction'),
    expect.stringContaining('GrappleAttackAction'),
    expect.stringContaining('canBreakGrapple'),
    expect.stringContaining('physical attack tests'),
  ]);
  expect(
    PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT['jump-jet-attack'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    expect.stringContaining('JumpJetAttackAction'),
    expect.stringContaining('canJumpJetAttack'),
    expect.stringContaining('physical attack tests'),
  ]);
});
