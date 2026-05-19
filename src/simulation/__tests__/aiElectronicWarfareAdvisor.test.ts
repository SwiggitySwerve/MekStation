/**
 * Tests for the AI electronic-warfare advisor (A4).
 *
 * Covers the `AI Electronic-Warfare Awareness` requirement of
 * `add-ai-advanced-systems` — scenarios "Bot avoids a hostile ECM bubble",
 * "ECM carrier is rewarded for covering the lance", and "Awareness does not
 * touch combat resolution".
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Electronic-Warfare Awareness
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import type {
  IActiveProbe,
  IECMSuite,
  IElectronicWarfareState,
} from '@/utils/gameplay/electronicWarfare';

import { Facing, MovementType } from '@/types/gameplay';

import type { IAIUnitState } from '../ai/types';

import { adviseDestination } from '../ai/AIElectronicWarfareAdvisor';

function makeUnit(
  overrides: Partial<IAIUnitState> & { unitId: string },
): IAIUnitState {
  return {
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function ecmSuite(overrides: Partial<IECMSuite>): IECMSuite {
  return {
    type: 'guardian',
    mode: 'ecm',
    operational: true,
    entityId: 'ecm-entity',
    teamId: 'enemy',
    position: { q: 0, r: 0 },
    ...overrides,
  };
}

function probe(overrides: Partial<IActiveProbe>): IActiveProbe {
  return {
    type: 'bloodhound',
    operational: true,
    entityId: 'probe-entity',
    teamId: 'friendly',
    position: { q: 0, r: 0 },
    ...overrides,
  };
}

describe('AIElectronicWarfareAdvisor.adviseDestination', () => {
  describe('Scenario: Bot avoids a hostile ECM bubble', () => {
    it('penalizes a destination inside a hostile ECM bubble', () => {
      // An enemy ECM suite at the origin; its bubble has radius 6.
      const ewState: IElectronicWarfareState = {
        ecmSuites: [
          ecmSuite({
            entityId: 'enemy-ecm',
            teamId: 'enemy',
            position: { q: 0, r: 0 },
          }),
        ],
        activeProbes: [],
      };
      const unit = makeUnit({ unitId: 'friendly-1' });

      // A hex 2 away is inside the radius-6 bubble.
      const inside = adviseDestination(
        unit,
        { q: 2, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );
      // A hex 10 away is outside the bubble.
      const outside = adviseDestination(
        unit,
        { q: 10, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );

      expect(inside.hostileBubblePenalty).toBeGreaterThan(0);
      expect(outside.hostileBubblePenalty).toBe(0);
    });

    it('does not penalize a friendly ECM bubble', () => {
      const ewState: IElectronicWarfareState = {
        ecmSuites: [
          ecmSuite({
            entityId: 'friendly-ecm',
            teamId: 'friendly',
            position: { q: 0, r: 0 },
          }),
        ],
        activeProbes: [],
      };
      const unit = makeUnit({ unitId: 'friendly-1' });

      const advice = adviseDestination(
        unit,
        { q: 2, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );

      expect(advice.hostileBubblePenalty).toBe(0);
    });

    it('penalizes a hex inside two hostile bubbles more than one', () => {
      const ewState: IElectronicWarfareState = {
        ecmSuites: [
          ecmSuite({
            entityId: 'e1',
            teamId: 'enemy',
            position: { q: 0, r: 0 },
          }),
          ecmSuite({
            entityId: 'e2',
            teamId: 'enemy',
            position: { q: 4, r: 0 },
          }),
        ],
        activeProbes: [],
      };
      const unit = makeUnit({ unitId: 'friendly-1' });

      const inBoth = adviseDestination(
        unit,
        { q: 2, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );
      const inOne = adviseDestination(
        unit,
        { q: -3, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );

      expect(inBoth.hostileBubblePenalty).toBeGreaterThan(
        inOne.hostileBubblePenalty,
      );
    });
  });

  describe('Scenario: ECM carrier is rewarded for covering the lance', () => {
    it('rewards an ECM carrier whose destination bubble covers lancemates', () => {
      const carrier = makeUnit({ unitId: 'carrier' });
      const ewState: IElectronicWarfareState = {
        ecmSuites: [
          ecmSuite({
            entityId: 'carrier',
            teamId: 'friendly',
            mode: 'ecm',
            position: { q: 0, r: 0 },
          }),
        ],
        activeProbes: [],
      };
      const lancemates = [
        makeUnit({ unitId: 'mate-1', position: { q: 1, r: 0 } }),
        makeUnit({ unitId: 'mate-2', position: { q: 0, r: 1 } }),
      ];

      // Destination right next to both lancemates — its radius-6 bubble
      // covers them.
      const covering = adviseDestination(
        carrier,
        { q: 1, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
          lancemates,
        },
      );
      // Destination far from both lancemates — bubble covers neither.
      const notCovering = adviseDestination(
        carrier,
        { q: 20, r: -10 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
          lancemates,
        },
      );

      expect(covering.coverageBonus).toBeGreaterThan(notCovering.coverageBonus);
      expect(covering.coverageBonus).toBeGreaterThan(0);
    });

    it('awards no coverage bonus to a non-carrier unit', () => {
      const plainUnit = makeUnit({ unitId: 'plain' });
      const ewState: IElectronicWarfareState = {
        ecmSuites: [ecmSuite({ entityId: 'someone-else', teamId: 'friendly' })],
        activeProbes: [],
      };
      const lancemates = [
        makeUnit({ unitId: 'mate', position: { q: 1, r: 0 } }),
      ];

      const advice = adviseDestination(
        plainUnit,
        { q: 1, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
          lancemates,
        },
      );

      expect(advice.coverageBonus).toBe(0);
    });

    it('rewards a probe carrier for countering an enemy ECM source', () => {
      const carrier = makeUnit({ unitId: 'probe-carrier' });
      const ewState: IElectronicWarfareState = {
        ecmSuites: [
          ecmSuite({
            entityId: 'enemy-ecm',
            teamId: 'enemy',
            position: { q: 5, r: 0 },
          }),
        ],
        activeProbes: [
          probe({
            entityId: 'probe-carrier',
            teamId: 'friendly',
            type: 'bloodhound',
          }),
        ],
      };

      // Bloodhound counter range is 8 — a destination within 8 of the enemy
      // ECM counters it; one far away does not.
      const countering = adviseDestination(
        carrier,
        { q: 3, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );
      const notCountering = adviseDestination(
        carrier,
        { q: 20, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );

      expect(countering.coverageBonus).toBeGreaterThan(0);
      expect(notCountering.coverageBonus).toBe(0);
    });
  });

  describe('Scenario: Awareness does not touch combat resolution', () => {
    it('never mutates the electronic-warfare state it reads', () => {
      const ewState: IElectronicWarfareState = {
        ecmSuites: [
          ecmSuite({
            entityId: 'carrier',
            teamId: 'friendly',
            position: { q: 0, r: 0 },
          }),
        ],
        activeProbes: [
          probe({
            entityId: 'carrier',
            teamId: 'friendly',
            position: { q: 0, r: 0 },
          }),
        ],
      };
      const snapshot = JSON.stringify(ewState);
      const carrier = makeUnit({ unitId: 'carrier' });
      const lancemates = [
        makeUnit({ unitId: 'mate', position: { q: 1, r: 0 } }),
      ];

      adviseDestination(
        carrier,
        { q: 3, r: 3 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
          lancemates,
        },
      );

      expect(JSON.stringify(ewState)).toBe(snapshot);
    });

    it('the electronicWarfare module source is not modified by A4', () => {
      // A4 consumes the electronic-warfare module as-is. The advisor must
      // never import a path that reaches into combat resolution.
      const source = readFileSync(
        join(process.cwd(), 'src/simulation/ai/AIElectronicWarfareAdvisor.ts'),
        'utf-8',
      );
      const importSpecifier = /\bfrom\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      const specifiers: string[] = [];
      while ((match = importSpecifier.exec(source)) !== null) {
        specifiers.push(match[1]);
      }
      for (const specifier of specifiers) {
        // No combat-resolution imports — the advisor only reads EW state.
        expect(specifier).not.toContain('combatResolution');
        expect(specifier).not.toContain('toHit');
        expect(specifier).not.toContain('weaponAttack');
      }
    });
  });

  describe('determinism', () => {
    it('returns identical advice for identical inputs', () => {
      const ewState: IElectronicWarfareState = {
        ecmSuites: [ecmSuite({ entityId: 'e1', teamId: 'enemy' })],
        activeProbes: [],
      };
      const unit = makeUnit({ unitId: 'a' });
      const first = adviseDestination(
        unit,
        { q: 2, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );
      const second = adviseDestination(
        unit,
        { q: 2, r: 0 },
        {
          movingUnitTeamId: 'friendly',
          ewState,
        },
      );
      expect(first).toEqual(second);
    });
  });
});
