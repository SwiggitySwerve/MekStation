import {
  buildFacingCommands,
  buildGmReferralCommands,
  buildHeatEndCommands,
  buildMovementCommands,
  buildPhysicalAttackCommands,
  buildUtilityCommands,
  buildWeaponAttackCommands,
  MovementType,
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT,
  GM_COMMAND_EXCLUSION_SUPPORT,
  sortedKeys,
  commandIds,
  supportGaps,
  supportIdsByLevel,
} from './combatActionCatalog.test-helpers';

it('covers every player tactical command and excludes GM referee tools', () => {
  const playerCommandIds = commandIds([
    ...buildMovementCommands(),
    ...buildFacingCommands(),
    ...buildWeaponAttackCommands(),
    ...buildPhysicalAttackCommands(),
    ...buildHeatEndCommands(),
    ...buildUtilityCommands(),
  ]);
  const gmCommandIds = commandIds(buildGmReferralCommands());

  expect(sortedKeys(COMBAT_COMMAND_ACTION_SUPPORT)).toEqual(playerCommandIds);
  expect(sortedKeys(GM_COMMAND_EXCLUSION_SUPPORT)).toEqual(gmCommandIds);
  expect(playerCommandIds.filter((id) => id.startsWith('gm.'))).toEqual([]);
  expect(supportGaps(COMBAT_COMMAND_ACTION_SUPPORT)).toEqual([]);
  expect(supportGaps(GM_COMMAND_EXCLUSION_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(GM_COMMAND_EXCLUSION_SUPPORT, 'out-of-scope'),
  ).toEqual(gmCommandIds);
  expect(
    supportIdsByLevel(GM_COMMAND_EXCLUSION_SUPPORT, 'unsupported'),
  ).toEqual([]);
  for (const id of gmCommandIds) {
    const entry =
      GM_COMMAND_EXCLUSION_SUPPORT[
        id as keyof typeof GM_COMMAND_EXCLUSION_SUPPORT
      ];

    expect(entry.sourceRefs).toEqual([
      expect.objectContaining({
        kind: 'mekstation-deviation',
        citation: expect.stringContaining(id),
        url: expect.stringContaining('gmReferralCommands.ts#L'),
        sourceVersion: 'MekStation working-tree',
      }),
    ]);
  }

  expect(
    supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'integrated'),
  ).toEqual([
    'facing.rotate-left',
    'facing.rotate-right',
    'facing.torso-twist',
    'heat-end.begin-round',
    'heat-end.end-phase',
    'heat-end.next-turn',
    'heat.continue',
    'movement.activate-masc',
    'movement.activate-supercharger',
    'movement.carefulStand',
    'movement.evade',
    'movement.goProne',
    'movement.hullDown',
    'movement.stand',
    'physical.break-grapple',
    'physical.brush-off',
    'physical.charge',
    'physical.club',
    'physical.dfa',
    'physical.flail',
    'physical.grapple',
    'physical.jump-jet-attack',
    'physical.kick',
    'physical.lance',
    'physical.mace',
    'physical.punch',
    'physical.push',
    'physical.retractable-blade',
    'physical.sword',
    'physical.thrash',
    'physical.trip',
    'physical.wrecking-ball',
    'utility.concede',
    'utility.eject',
    'utility.request-spot',
    'weapon.fire-volley',
  ]);
  expect(
    supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'helper-only'),
  ).toEqual([]);
  const outOfScopeCommandSourceFiles = {
    'movement.cancel': 'movementCommands.ts',
    'movement.stabilize': 'movementCommands.ts',
    'utility.withdraw': 'utilityCommands.ts',
    'weapon.clear-attacks': 'weaponAttackCommands.ts',
    'weapon.declare-attack': 'weaponAttackCommands.ts',
  } as const;
  for (const [id, file] of Object.entries(outOfScopeCommandSourceFiles)) {
    const entry =
      COMBAT_COMMAND_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
      ];

    expect(entry).toMatchObject({ level: 'out-of-scope' });
    expect(entry.sourceRefs).toEqual([
      expect.objectContaining({
        kind: 'mekstation-deviation',
        citation: expect.stringContaining(id),
        url: expect.stringContaining(file),
        sourceVersion: 'MekStation working-tree',
      }),
    ]);
  }
  const integratedMovementCommandSourceRows = {
    'movement.activate-masc': 'movementCommands.ts',
    'movement.activate-supercharger': 'movementCommands.ts',
    'movement.carefulStand': 'movementPostureCommands.ts',
    'movement.evade': 'movementTraversalCommands.ts',
    'movement.goProne': 'movementPostureCommands.ts',
    'movement.hullDown': 'movementPostureCommands.ts',
    'movement.stand': 'movementPostureCommands.ts',
  } as const;
  for (const [id, file] of Object.entries(
    integratedMovementCommandSourceRows,
  )) {
    const entry =
      COMBAT_COMMAND_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
      ];

    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining(`${file}#L`),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  const utilityCommandSourceRows = [
    'utility.concede',
    'utility.eject',
    'utility.request-spot',
    'utility.withdraw',
  ];
  for (const id of utilityCommandSourceRows) {
    const entry =
      COMBAT_COMMAND_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
      ];

    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining('utilityCommands.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  expect(
    COMBAT_COMMAND_ACTION_SUPPORT['weapon.fire-volley'].sourceRefs,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'mekstation-deviation',
        citation: expect.stringContaining('weapon.fire-volley'),
        url: expect.stringContaining('weaponAttackCommands.ts#L'),
        sourceVersion: 'MekStation working-tree',
      }),
    ]),
  );
  expect(
    COMBAT_COMMAND_ACTION_SUPPORT['weapon.fire-volley'].sourceRefs?.every(
      (sourceRef) => sourceRef.url.includes('#L'),
    ),
  ).toBe(true);
  const heatEndCommandSourceRows = [
    'heat-end.begin-round',
    'heat.continue',
    'heat-end.end-phase',
    'heat-end.next-turn',
  ];
  for (const id of heatEndCommandSourceRows) {
    const entry =
      COMBAT_COMMAND_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
      ];

    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining('heatEndCommands.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  const facingCommandSourceRows = [
    'facing.rotate-left',
    'facing.rotate-right',
    'facing.torso-twist',
  ];
  for (const id of facingCommandSourceRows) {
    const entry =
      COMBAT_COMMAND_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
      ];

    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining('facingCommands.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  const physicalCommandSourceRows = [
    'physical.charge',
    'physical.club',
    'physical.dfa',
    'physical.flail',
    'physical.brush-off',
    'physical.jump-jet-attack',
    'physical.kick',
    'physical.lance',
    'physical.mace',
    'physical.punch',
    'physical.push',
    'physical.retractable-blade',
    'physical.sword',
    'physical.trip',
    'physical.wrecking-ball',
  ];
  for (const id of physicalCommandSourceRows) {
    const entry =
      COMBAT_COMMAND_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMMAND_ACTION_SUPPORT
      ];

    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining('physicalAttackCommands.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
  expect(
    supportIdsByLevel(COMBAT_COMMAND_ACTION_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.stabilize']).toMatchObject({
    level: 'out-of-scope',
    layer: 'tactical-command',
    gap: expect.stringContaining('MekStation-local command id'),
    sourceRefs: [
      expect.objectContaining({
        kind: 'mekstation-deviation',
        citation: expect.stringContaining('movement.stabilize'),
      }),
    ],
  });
  expect(
    COMBAT_COMMAND_ACTION_SUPPORT['facing.torso-twist'].sourceRefs?.map(
      (sourceRef) => sourceRef.citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('TorsoTwistAction'),
      expect.stringContaining('secondary facing'),
      expect.stringContaining('canChangeSecondaryFacing'),
      expect.stringContaining('ComputeArc'),
    ]),
  );
  expect(
    COMBAT_COMMAND_ACTION_SUPPORT['facing.torso-twist'].gap,
  ).toBeUndefined();
});

it('tracks source-backed optional BattleMech movement action surfaces explicitly', () => {
  const playerCommandIds = commandIds([
    ...buildMovementCommands(),
    ...buildFacingCommands(),
    ...buildWeaponAttackCommands(),
    ...buildPhysicalAttackCommands(),
    ...buildHeatEndCommands(),
    ...buildUtilityCommands(),
  ]);

  expect(sortedKeys(BATTLEMECH_ABSENT_ACTION_SUPPORT)).toEqual([]);
  expect(supportGaps(BATTLEMECH_ABSENT_ACTION_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(BATTLEMECH_ABSENT_ACTION_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(
    sortedKeys(BATTLEMECH_ABSENT_ACTION_SUPPORT).filter((id) =>
      playerCommandIds.includes(id),
    ),
  ).toEqual([]);
  expect(Object.values(MovementType)).toContain('evade');
  expect(Object.values(MovementType)).toContain('sprint');
  // Walk/Run/Sprint/Jump mode selection moved off the dock into the Movement
  // Intent Composer under tactical-movement-intent-composer, so their combat
  // parity coverage now lives on the composer-movement-mode surface rather than
  // the dock tactical-command map. The movement CAPABILITY (and its
  // source-backed sprint MP / to-hit / heat behavior) is unchanged.
  expect(
    COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT['movement.sprint'],
  ).toMatchObject({
    layer: 'composer-movement-mode',
    level: 'integrated',
    evidence: expect.stringContaining('MovementType.Sprint'),
  });
  expect(
    COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT['movement.sprint'].gap,
  ).toBeUndefined();
  expect(
    COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT['movement.sprint'].sourceRefs?.map(
      (sourceRef) => sourceRef.citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('movement.sprint'),
      expect.stringContaining('MoveStep.canUseSprint'),
      expect.stringContaining('Mek.getSprintMP'),
      expect.stringContaining('Mek.getSprintHeat'),
      expect.stringContaining('Engine.getSprintHeat'),
      expect.stringContaining('attacks by sprinting attackers'),
      expect.stringContaining('target sprinted'),
    ]),
  );
  expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.evade']).toMatchObject({
    layer: 'tactical-command',
    level: 'integrated',
    evidence: expect.stringContaining('MovementType.Evade'),
  });
  expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.evade'].gap).toBeUndefined();
  expect(
    COMBAT_COMMAND_ACTION_SUPPORT['movement.evade'].sourceRefs?.map(
      (sourceRef) => sourceRef.citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('movement.evade'),
      expect.stringContaining('TacOps Evade'),
      expect.stringContaining('MoveStepType defines EVADE'),
      expect.stringContaining('sets the entity evading flag'),
      expect.stringContaining('Engine.getRunHeat'),
      expect.stringContaining('getEvasionBonus'),
      expect.stringContaining('target evasion bonus'),
      expect.stringContaining('evading attackers from firing'),
    ]),
  );
  for (const id of [
    'movement.activate-masc',
    'movement.activate-supercharger',
  ] as const) {
    expect(COMBAT_COMMAND_ACTION_SUPPORT[id]).toMatchObject({
      layer: 'tactical-command',
      level: 'integrated',
      evidence: expect.stringContaining('activateMovementEnhancement'),
    });
    expect(COMBAT_COMMAND_ACTION_SUPPORT[id].gap).toBeUndefined();
    expect(
      COMBAT_COMMAND_ACTION_SUPPORT[id].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(id),
        expect.stringContaining('active MASC/Supercharger'),
      ]),
    );
  }
});

it('tracks composer Movement Budget lock-in modes off the dock command surface', () => {
  const playerCommandIds = commandIds([
    ...buildMovementCommands(),
    ...buildFacingCommands(),
    ...buildWeaponAttackCommands(),
    ...buildPhysicalAttackCommands(),
    ...buildHeatEndCommands(),
    ...buildUtilityCommands(),
  ]);

  // Walk/Run/Sprint/Jump are composed + locked in at the Movement Intent
  // Composer under tactical-movement-intent-composer, never as dock commands.
  expect(sortedKeys(COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT)).toEqual([
    'movement.jump',
    'movement.run',
    'movement.sprint',
    'movement.walk',
  ]);
  expect(supportGaps(COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT, 'integrated'),
  ).toEqual([
    'movement.jump',
    'movement.run',
    'movement.sprint',
    'movement.walk',
  ]);
  // None of the composer modes leak back onto the dock command surface.
  expect(
    playerCommandIds.filter((id) =>
      Object.keys(COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT).includes(id),
    ),
  ).toEqual([]);
  expect(
    sortedKeys(COMBAT_COMMAND_ACTION_SUPPORT).filter((id) =>
      Object.keys(COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT).includes(id),
    ),
  ).toEqual([]);
  for (const id of Object.keys(COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT)) {
    const entry =
      COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT[
        id as keyof typeof COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT
      ];

    expect(entry).toMatchObject({
      layer: 'composer-movement-mode',
      level: 'integrated',
    });
    expect(entry.gap).toBeUndefined();
    // Every composer mode is anchored to the composer / intent-slice / commit
    // path — the SAME authoritative declaration path a dock move used.
    expect(entry.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(id),
          url: expect.stringContaining('MovementIntentComposer.tsx#L'),
          sourceVersion: 'MekStation working-tree',
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: expect.stringContaining('useGameplayStore.movementIntent.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('commitPlannedMovementLogic'),
          url: expect.stringContaining('useGameplayStore.ts#L'),
          sourceVersion: 'MekStation working-tree',
        }),
      ]),
    );
    expect(
      entry.sourceRefs?.every((sourceRef) => sourceRef.url.includes('#L')),
    ).toBe(true);
  }
});
