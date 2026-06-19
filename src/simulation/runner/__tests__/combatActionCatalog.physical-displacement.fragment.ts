import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from './combatActionCatalog.test-helpers';

it('keeps physical displacement chain edges visible and source-backed', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.carried-cargo-arm-lockout'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'shared',
    evidence: expect.stringContaining(
      'selected-arm punch, selected-arm brush-off, arm-mounted melee weapon',
    ),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining(
          'rejects punching with an arm that cannot fire',
        ),
      }),
      expect.objectContaining({
        citation: expect.stringContaining(
          'rejects pushing when neither BattleMech arm can fire',
        ),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('rejects club attacks'),
      }),
    ],
  });

  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-positional-chain'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented push/charge/DFA/charge-miss target-displacement helpers',
    ),
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-positional-chain'
    ].evidence,
  ).toContain('DominoEffect PSRs');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-minefield-fallout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'conventional coordinate-state minefield damage plus density reduction/MinefieldChanged fallout',
    ),
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-minefield-fallout'
    ].evidence,
  ).toContain('already-detonated coordinate suppression');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-minefield-fallout'
    ].evidence,
  ).toContain('inferno coordinate-state pendingExternalHeat');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-minefield-fallout'
    ].evidence,
  ).toContain('non-conventional coordinate-state no-fallback guards');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-chain'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'source-backed recursive occupied-hex domino chain',
    ),
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-secondary-fallout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Broad domino secondary-fallout accounting is split',
    ),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining(
          'Compute.isValidDisplacement recursively validates',
        ),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('domino-effect displacement'),
      }),
    ],
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-secondary-fallout'
    ].evidence,
  ).toContain('voluntary blocker step-out branch are integrated sibling rows');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-secondary-fallout'
    ].gap,
  ).toBeUndefined();
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-terrain-building-environment-fallout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented destination terrain/building PSR fallout',
    ),
  });
  expect(DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS).toEqual([]);
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('blockerStepOutDecision'),
    sourceRefs: [
      expect.objectContaining({
        url: expect.stringContaining('L9190-L9280'),
      }),
    ],
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr']
      .gap,
  ).toBeUndefined();
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr']
      .sourceRefs?.[0].citation,
  ).toContain('CFR_DOMINO_EFFECT');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr']
      .sourceRefs?.[0].citation,
  ).toContain('blocker step-out PSR');
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr']
      .evidence,
  ).toContain('invalid, declined, failed, or no-response decisions fall back');
  expect(DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS).toEqual([
    'shared.displacement-domino-dropship-secondary-hex',
  ]);
  for (const supportId of DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS) {
    expect(PHYSICAL_LEGALITY_GATE_SUPPORT[supportId]).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining(
        'Out-of-scope for this BattleMech validation suite',
      ),
    });
  }
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-friendly-avoidance'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('DFA-miss displacement destinations'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining(
          'getPreferredDisplacement first skips',
        ),
      }),
    ],
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-dropship-radius'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'runner and event-sourced DFA hit displacement',
    ),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining(
          'getValidDisplacement searches at radius two',
        ),
      }),
    ],
  });
});
