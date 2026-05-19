/**
 * Scenario Objective Placement tests.
 *
 * Covers the `scenario-objectives` delta-spec scenarios for Objective
 * Placement During Scenario Generation.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { VictoryCondition } from '@/types/scenario/ScenarioInterfaces';

import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';
import { keyToCoord } from '@/utils/gameplay/hexMath';

import {
  deriveObjectivePlacementConfig,
  objectiveMarkerTypeFor,
  placeObjectives,
} from '../objectivePlacement';

const RADIUS = 5;
const ZONE = {
  radius: RADIUS,
  playerRow: -(RADIUS - 1),
  opponentRow: RADIUS - 1,
};

function inBounds(q: number, r: number): boolean {
  return (
    Math.abs(q) <= RADIUS && Math.abs(r) <= RADIUS && Math.abs(q + r) <= RADIUS
  );
}

describe('objectiveMarkerTypeFor', () => {
  it('maps hex objective types and rejects markerless types', () => {
    expect(objectiveMarkerTypeFor(ScenarioObjectiveType.Capture)).toBe(
      'capture',
    );
    expect(objectiveMarkerTypeFor(ScenarioObjectiveType.Defend)).toBe('defend');
    expect(objectiveMarkerTypeFor(ScenarioObjectiveType.Breakthrough)).toBe(
      'breakthrough',
    );
    expect(objectiveMarkerTypeFor(ScenarioObjectiveType.Destroy)).toBeNull();
    expect(objectiveMarkerTypeFor(ScenarioObjectiveType.Escort)).toBeNull();
    expect(objectiveMarkerTypeFor(ScenarioObjectiveType.Recon)).toBeNull();
  });
});

describe('deriveObjectivePlacementConfig', () => {
  it('returns null for a destroy scenario', () => {
    expect(
      deriveObjectivePlacementConfig(ScenarioObjectiveType.Destroy),
    ).toBeNull();
  });

  it('clamps Capture objective count to 1..3 from victory conditions', () => {
    const vc: VictoryCondition[] = [
      {
        id: 'capture_and_hold',
        name: 'Capture and Hold',
        description: '',
        primary: true,
        objectiveCount: 9,
        holdTurns: 3,
      },
    ];
    const cfg = deriveObjectivePlacementConfig(
      ScenarioObjectiveType.Capture,
      vc,
    );
    expect(cfg?.hexCount).toBe(3);
    expect(cfg?.holdTurnsRequired).toBe(3);
  });

  it('uses Breakthrough requiredUnits from victory conditions', () => {
    const vc: VictoryCondition[] = [
      {
        id: 'breakthrough',
        name: 'Breakthrough',
        description: '',
        primary: true,
        requiredUnits: 2,
      },
    ];
    const cfg = deriveObjectivePlacementConfig(
      ScenarioObjectiveType.Breakthrough,
      vc,
    );
    expect(cfg?.requiredUnits).toBe(2);
  });
});

describe('placeObjectives — Capture', () => {
  const cfg = deriveObjectivePlacementConfig(ScenarioObjectiveType.Capture);

  it('places 1-3 interior markers outside both deployment zones', () => {
    const objectives = placeObjectives(cfg!, ZONE, 12345);
    const keys = Object.keys(objectives);
    expect(keys.length).toBeGreaterThanOrEqual(1);
    expect(keys.length).toBeLessThanOrEqual(3);
    for (const key of keys) {
      const coord = keyToCoord(key);
      expect(inBounds(coord.q, coord.r)).toBe(true);
      expect(coord.r).not.toBe(ZONE.playerRow);
      expect(coord.r).not.toBe(ZONE.opponentRow);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = placeObjectives(cfg!, ZONE, 999);
    const b = placeObjectives(cfg!, ZONE, 999);
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  });

  it('yields different placements for different seeds', () => {
    const a = Object.keys(placeObjectives(cfg!, ZONE, 1)).sort();
    const b = Object.keys(placeObjectives(cfg!, ZONE, 2)).sort();
    // Not a hard guarantee, but interior pools are large enough that
    // two seeds picking identical sets is vanishingly unlikely.
    expect(a).not.toEqual(b);
  });

  it('starts every marker neutral with zero hold progress', () => {
    const objectives = placeObjectives(cfg!, ZONE, 77);
    for (const m of Object.values(objectives)) {
      expect(m.owningSide).toBe('neutral');
      expect(m.controlSide).toBe('neutral');
      expect(m.holdProgress).toBe(0);
      expect(m.objectiveType).toBe('capture');
    }
  });
});

describe('placeObjectives — Defend', () => {
  it('places objectives inside the defender deployment zone', () => {
    const cfg = deriveObjectivePlacementConfig(ScenarioObjectiveType.Defend);
    const objectives = placeObjectives(cfg!, ZONE, 42);
    const keys = Object.keys(objectives);
    expect(keys.length).toBeGreaterThanOrEqual(1);
    for (const key of keys) {
      expect(keyToCoord(key).r).toBe(ZONE.opponentRow);
    }
  });
});

describe('placeObjectives — Breakthrough', () => {
  it('places exit hexes on the edge opposite the attacker', () => {
    const cfg = deriveObjectivePlacementConfig(
      ScenarioObjectiveType.Breakthrough,
    );
    const objectives = placeObjectives(cfg!, ZONE, 314);
    const keys = Object.keys(objectives);
    expect(keys.length).toBeGreaterThanOrEqual(1);
    // Attacker deploys on the south (negative-r) edge → exits on the
    // north (most-positive-r) edge.
    for (const key of keys) {
      expect(keyToCoord(key).r).toBe(RADIUS);
    }
  });
});
