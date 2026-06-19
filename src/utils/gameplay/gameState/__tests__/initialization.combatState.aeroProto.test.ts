import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { createInitialUnitState } from '../initialization';
import {
  POSITION,
  SAMPLE_AERO_INIT,
  SAMPLE_PROTO_INIT,
  baseGameUnit,
} from './initialization.combatState.fixtures';

describe('createInitialUnitState aerospace seeding', () => {
  function buildAeroUnit(altitude?: number) {
    return baseGameUnit({
      id: 'aero-1',
      unitType: UnitType.AEROSPACE,
      aerospaceInit: { ...SAMPLE_AERO_INIT, altitude },
    });
  }

  it("seeds combatState with kind='aero' for aerospace unit types", () => {
    const state = createInitialUnitState(buildAeroUnit(), POSITION);
    expect(state.combatState?.kind).toBe('aero');

    for (const unitType of [
      UnitType.AEROSPACE,
      UnitType.CONVENTIONAL_FIGHTER,
      UnitType.SMALL_CRAFT,
    ]) {
      const unit = baseGameUnit({
        id: `${unitType}-unit`,
        unitType,
        aerospaceInit: SAMPLE_AERO_INIT,
      });
      const seeded = createInitialUnitState(unit, POSITION);
      expect(seeded.combatState?.kind).toBe('aero');
      if (seeded.combatState?.kind === 'aero') {
        expect(seeded.combatState.state.maxSI).toBe(SAMPLE_AERO_INIT.maxSI);
        expect(seeded.combatState.state.armorByArc.nose).toBe(20);
      }
    }
  });

  it('defaults altitude to airborne and honours explicit landed altitude', () => {
    const airborne = createInitialUnitState(buildAeroUnit(), POSITION);
    const landed = createInitialUnitState(buildAeroUnit(0), POSITION);

    if (airborne.combatState?.kind !== 'aero') {
      throw new Error('expected aero combatState');
    }
    if (landed.combatState?.kind !== 'aero') {
      throw new Error('expected aero combatState');
    }

    expect(airborne.combatState.state.altitude).toBe(1);
    expect(landed.combatState.state.altitude).toBe(0);
  });

  it('throws when aerospaceInit is missing or missing required fields', () => {
    const missingBlock = baseGameUnit({
      id: 'aero-2',
      unitType: UnitType.AEROSPACE,
    });
    const missingField = baseGameUnit({
      id: 'aero-3',
      unitType: UnitType.AEROSPACE,
      aerospaceInit: {
        ...SAMPLE_AERO_INIT,
        maxSI: undefined as unknown as number,
      },
    });

    expect(() => createInitialUnitState(missingBlock, POSITION)).toThrow(
      /aero-2.*aerospaceInit/i,
    );
    expect(() => createInitialUnitState(missingField, POSITION)).toThrow(
      /aero-3.*aerospaceInit\.maxSI/i,
    );
  });
});

describe('createInitialUnitState ProtoMech seeding', () => {
  it("seeds combatState with kind='proto' for PROTOMECH", () => {
    const unit = baseGameUnit({
      id: 'proto-1',
      unitType: UnitType.PROTOMECH,
      protoMechInit: SAMPLE_PROTO_INIT,
    });
    const state = createInitialUnitState(unit, POSITION);

    expect(state.combatState?.kind).toBe('proto');
    if (state.combatState?.kind === 'proto') {
      expect(state.combatState.state.chassisType).toBe(ProtoChassis.BIPED);
      expect(state.combatState.state.hasMainGun).toBe(true);
      expect(state.combatState.state.armorByLocation[ProtoLocation.TORSO]).toBe(
        6,
      );
    }
  });

  it('seeds glider and quad chassis variants', () => {
    const glider = baseGameUnit({
      id: 'proto-glider',
      unitType: UnitType.PROTOMECH,
      protoMechInit: { ...SAMPLE_PROTO_INIT, chassisType: ProtoChassis.GLIDER },
    });
    const quad = baseGameUnit({
      id: 'proto-quad',
      unitType: UnitType.PROTOMECH,
      protoMechInit: { ...SAMPLE_PROTO_INIT, chassisType: ProtoChassis.QUAD },
    });
    const gliderState = createInitialUnitState(glider, POSITION);
    const quadState = createInitialUnitState(quad, POSITION);

    if (gliderState.combatState?.kind !== 'proto') {
      throw new Error('expected proto combatState');
    }
    expect(gliderState.combatState.state.altitude).toBe(0);
    expect(quadState.combatState?.kind).toBe('proto');
  });

  it('throws when protoMechInit is missing or missing required fields', () => {
    const missingBlock = baseGameUnit({
      id: 'proto-2',
      unitType: UnitType.PROTOMECH,
    });
    const missingField = baseGameUnit({
      id: 'proto-3',
      unitType: UnitType.PROTOMECH,
      protoMechInit: {
        ...SAMPLE_PROTO_INIT,
        hasMainGun: undefined as unknown as boolean,
      },
    });

    expect(() => createInitialUnitState(missingBlock, POSITION)).toThrow(
      /proto-2.*protoMechInit/i,
    );
    expect(() => createInitialUnitState(missingField, POSITION)).toThrow(
      /proto-3.*protoMechInit\.hasMainGun/i,
    );
  });
});
