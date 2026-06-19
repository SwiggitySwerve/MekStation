import { PHYSICAL_LEGALITY_GATE_SUPPORT } from './combatActionCatalog.test-helpers';

it('anchors every physical legality gate to commit-pinned MegaMek source', () => {
  const invalidSourceRefs = Object.values(
    PHYSICAL_LEGALITY_GATE_SUPPORT,
  ).flatMap((entry) => {
    const sourceRefs = entry.sourceRefs ?? [];
    if (sourceRefs.length === 0) return [`${entry.id}: missing sourceRefs`];

    return sourceRefs.flatMap((sourceRef, index) => {
      const sourceRefId = `${entry.id}.sourceRefs[${index}]`;
      const failures: string[] = [];

      if (sourceRef.kind !== 'megamek-source') {
        failures.push(`${sourceRefId}: expected megamek-source`);
      }
      if (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/')) {
        failures.push(`${sourceRefId}: missing MegaMek blob URL`);
      }
      if (!sourceRef.url.includes(sourceRef.sourceVersion)) {
        failures.push(`${sourceRefId}: source version not pinned in URL`);
      }
      if (!sourceRef.url.includes('#L')) {
        failures.push(`${sourceRefId}: missing line anchor`);
      }
      if (sourceRef.citation.trim().length === 0) {
        failures.push(`${sourceRefId}: missing citation`);
      }

      return failures;
    });
  });

  expect(invalidSourceRefs).toEqual([]);
  expect(
    Object.values(PHYSICAL_LEGALITY_GATE_SUPPORT)
      .filter((entry) => entry.level !== 'integrated')
      .map((entry) => entry.gap)
      .every((gap) => typeof gap === 'string' && gap.length > 0),
  ).toBe(true);
});

it('catalogs punch and kick missing-limb legality as integrated source-backed gates', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['punch.selected-arm-present'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'punch',
    evidence: expect.stringContaining('attackerDestroyedLocations'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('PunchAttackAction'),
      }),
    ],
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['kick.both-legs-present'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'kick',
    evidence: expect.stringContaining('left or right BattleMech legs'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('KickAttackAction'),
      }),
    ],
  });
});

it('catalogs charge prone-attacker legality as an integrated source-backed gate', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['charge.attacker-not-prone'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'charge',
    evidence: expect.stringContaining('attackerProne'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('ChargeAttackAction'),
      }),
    ],
  });
});

it('catalogs charge and DFA stuck-attacker legality as integrated source-backed gates', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['charge.attacker-not-stuck'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'charge',
    evidence: expect.stringContaining('attackerStuck'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('stuck'),
      }),
    ],
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.attacker-not-stuck'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'dfa',
    evidence: expect.stringContaining('attackerStuck'),
  });
});

it('catalogs charge backward-movement legality as an integrated source-backed gate', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['charge.no-backward-movement'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'charge',
    evidence: expect.stringContaining('movedBackwardThisTurn'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('move backward'),
      }),
    ],
  });
});

it('catalogs charge jump-movement legality as an integrated source-backed gate', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['charge.no-jump-movement'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'charge',
    evidence: expect.stringContaining('attackerJumpedThisTurn'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('that jump'),
      }),
    ],
  });
});

it('catalogs DFA mechanical jump booster legality as an integrated source-backed gate', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.no-mechanical-jump-booster'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'dfa',
    evidence: expect.stringContaining('usedMechanicalJumpBoosterThisTurn'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('DfaAttackAction'),
      }),
    ],
  });
});

it('catalogs DFA DropShip target legality as an integrated source-backed gate', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.target-not-dropship'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'dfa',
    evidence: expect.stringContaining('targetUnitType'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('DfaAttackAction'),
      }),
    ],
  });
});

it('catalogs DFA VTOL/WIGE reach with runner jump-MP and motion-type hydration', () => {
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['dfa.vtol-elevation-reachable'],
  ).toMatchObject({
    level: 'integrated',
    attackFamily: 'dfa',
    evidence: expect.stringContaining('automatic runner selection'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('DfaAttackAction'),
      }),
    ],
  });
});
