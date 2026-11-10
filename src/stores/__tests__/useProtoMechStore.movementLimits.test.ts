/**
 * ProtoMech editor movement limits through the real store, on the pinned corpus.
 *
 * MegaMekLab 62bf193 limits a ProtoMech's walk and jump spinners only by the minimum
 * walk of its motive, the engine bound, TestProtoMek.maxJumpMP, and a glider's jump of
 * 0 (MovementView.java:224-292, 316-376; PMStructureTab.java:264-276). The weight-class
 * walk and jump caps the store used to apply are not MML's, and made the editor change
 * pinned units it only re-applied values to.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import fs from 'node:fs';
import path from 'node:path';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { Era } from '@/types/temporal/Era';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { serializeCustomSmallUnitState } from '@/utils/serialization/CustomUnitSerializer.smallUnits';

const DIR = path.join(process.cwd(), 'public/data/units/protomechs');
const definitions = fs
  .readdirSync(DIR)
  .filter((file) => file !== 'index.json')
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, '')),
  );
const open = (file: string) =>
  createProtoMechStore(
    mapProtoMechDefinitionToState(
      JSON.parse(
        fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, ''),
      ),
    ),
  );

describe('the 86 pinned ProtoMechs re-applying their own movement', () => {
  it('covers every canonical unit', () => {
    expect(definitions).toHaveLength(86);
  });

  it.each(
    definitions.map(
      (d) => [`${d.chassis} ${d.model ?? ''}`.trim(), d] as const,
    ),
  )(
    '%s keeps walk, jump, run and engine through setWalkMP and setJumpMP',
    (_name, definition) => {
      const store = createProtoMechStore(
        mapProtoMechDefinitionToState(definition),
      );
      const before = store.getState();
      const { walkMP, jumpMP, flankMP, engineRating } = before;
      store.getState().setWalkMP(walkMP);
      store.getState().setJumpMP(jumpMP);
      const after = store.getState();
      expect({
        walkMP: after.walkMP,
        jumpMP: after.jumpMP,
        flankMP: after.flankMP,
        engineRating: after.engineRating,
      }).toEqual({ walkMP, jumpMP, flankMP, engineRating });
    },
  );

  it.each(
    definitions.map(
      (d) => [`${d.chassis} ${d.model ?? ''}`.trim(), d] as const,
    ),
  )(
    '%s keeps walk and jump when its own chassis is re-selected',
    (_name, definition) => {
      const store = createProtoMechStore(
        mapProtoMechDefinitionToState(definition),
      );
      const { walkMP, jumpMP, chassisType } = store.getState();
      store.getState().setChassisType(chassisType);
      expect({
        walk: store.getState().walkMP,
        jump: store.getState().jumpMP,
      }).toEqual({
        walk: walkMP,
        jump: jumpMP,
      });
    },
  );
});

describe('Sprite Ultraheavy (jump 5 at walk 3, five Extended Jump Jets)', () => {
  it('keeps its jump through open, edit, save and reopen', () => {
    const store = open('Sprite Ultraheavy ProtoMech 3.json');
    expect(store.getState().chassisType).toBe(ProtoChassis.ULTRAHEAVY);
    expect(store.getState().jumpMP).toBe(5);

    store.getState().setJumpMP(3);
    expect(store.getState().jumpMP).toBe(3);

    const saved = serializeCustomSmallUnitState(store.getState(), {
      id: 'flow-sprite-uh',
      chassis: 'Flow Sprite UH',
      variant: 'Jump',
      era: Era.CLAN_INVASION,
    });
    const reopened = mapProtoMechDefinitionToState(
      JSON.parse(JSON.stringify(saved)),
    );
    expect(reopened.jumpMP).toBe(3);
    expect(reopened.chassisType).toBe(ProtoChassis.ULTRAHEAVY);
  });

  it('is capped by its Extended Jump Jets, 1.5 times walk', () => {
    const store = open('Sprite Ultraheavy ProtoMech 3.json');
    store.getState().setJumpMP(99);
    expect(store.getState().jumpMP).toBe(5); // ceil(1.5 x 3)
  });
});

describe('setJumpMP', () => {
  it('stops at the walk MP without an improved jump jet', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setWalkMP(4);
    store.getState().setJumpMP(9);
    expect(store.getState().jumpMP).toBe(4);
  });

  it('is 0 for a glider', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({
        tonnage: 3,
        chassisType: ProtoChassis.GLIDER,
      }),
    );
    store.getState().setJumpMP(3);
    expect(store.getState().jumpMP).toBe(0);
  });
});

describe('setWalkMP', () => {
  it('has no weight-class cap: a 3 t ProtoMech walks 10 (pinned Siren)', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 3 }),
    );
    store.getState().setWalkMP(10);
    expect(store.getState().walkMP).toBe(10);
  });

  it('lowers jump to the new limit when walk drops below it', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setWalkMP(6);
    store.getState().setJumpMP(6);
    store.getState().setWalkMP(3);
    expect(store.getState().jumpMP).toBe(3);
  });

  it('keeps a glider at or above its minimum walk', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({
        tonnage: 3,
        chassisType: ProtoChassis.GLIDER,
      }),
    );
    store.getState().setWalkMP(1);
    expect(store.getState().walkMP).toBe(3);
  });

  it('stops at the engine bound', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 15 }),
    );
    store.getState().setWalkMP(999);
    expect(store.getState().engineRating).toBeLessThanOrEqual(500);
    expect(store.getState().walkMP).toBe(22);
  });
});

describe('setChassisType', () => {
  it('raises walk to a quad or glider minimum', () => {
    const quad = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    quad.getState().setWalkMP(1);
    quad.getState().setChassisType(ProtoChassis.QUAD);
    expect(quad.getState().walkMP).toBe(2);

    const glider = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 3 }),
    );
    glider.getState().setWalkMP(2);
    glider.getState().setChassisType(ProtoChassis.GLIDER);
    expect(glider.getState().walkMP).toBe(3);
  });

  it('clears jump for a glider and keeps it for an ultraheavy', () => {
    const glider = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 3 }),
    );
    glider.getState().setWalkMP(4);
    glider.getState().setJumpMP(3);
    glider.getState().setChassisType(ProtoChassis.GLIDER);
    expect(glider.getState().jumpMP).toBe(0);

    const ultra = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 13 }),
    );
    ultra.getState().setWalkMP(4);
    ultra.getState().setJumpMP(3);
    ultra.getState().setChassisType(ProtoChassis.ULTRAHEAVY);
    expect(ultra.getState().jumpMP).toBe(3);
  });
});

// MML's new ProtoMek is a 2 t biped with setOriginalWalkMP(1) and the engine
// calcEngineRating gives it, 4 (PMMainUI.createNewUnit, PMMainUI.java:140-147). A
// motive change raises walk to the motive's minimum (MovementView.java:289).
describe('new-unit defaults', () => {
  it.each([2, 5, 8, 13])(
    'starts a %s t biped at walk 1, as MML does',
    (tonnage) => {
      const state = createDefaultProtoMechState({ tonnage });
      expect(state.walkMP).toBe(1);
      expect(state.cruiseMP).toBe(1);
      expect(state.flankMP).toBe(2);
    },
  );

  it("gives MML's new-unit engine at 2 t: rating 4", () => {
    expect(createDefaultProtoMechState({ tonnage: 2 }).engineRating).toBe(4);
  });

  it.each([
    [ProtoChassis.QUAD, 2],
    [ProtoChassis.GLIDER, 3],
    [ProtoChassis.ULTRAHEAVY, 1],
  ])('starts a %s unit at its motive minimum, %s', (chassisType, walk) => {
    expect(
      createDefaultProtoMechState({
        tonnage: chassisType === ProtoChassis.ULTRAHEAVY ? 13 : 3,
        chassisType,
      }).walkMP,
    ).toBe(walk);
  });
});
