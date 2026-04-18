/**
 * populateAttackerDesignations — Wave 2b combat hand-off test.
 *
 * Confirms the typed designations stored on the pilot record are mapped
 * onto the flat `designated*` fields of `IAttackerState` so existing
 * modifier functions keep reading their inputs from the wire format.
 *
 * @spec openspec/changes/add-spa-designation-persistence/tasks.md
 */

import {
  MovementType,
  RangeBracket,
  type IAttackerState,
} from '@/types/gameplay';
import {
  PilotStatus,
  PilotType,
  type IPilot,
  type ISPADesignation,
} from '@/types/pilot';
import { populateAttackerDesignations } from '@/utils/gameplay/spaModifiers/integration';

function buildPilot(
  designations: ISPADesignation[],
): Pick<IPilot, 'abilities'> {
  return {
    abilities: designations.map((d, i) => ({
      abilityId: `spa-${i}`,
      acquiredDate: '2026-01-01T00:00:00.000Z',
      designation: d,
    })),
  };
}

const baseAttacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Walk,
  heat: 0,
  damageModifiers: [],
  abilities: ['weapon_specialist'],
};

describe('populateAttackerDesignations', () => {
  it('maps weapon_type onto designatedWeaponType using the displayLabel', () => {
    const pilot = buildPilot([
      {
        kind: 'weapon_type',
        weaponTypeId: 'medium_laser',
        displayLabel: 'Medium Laser',
      },
    ]);
    const out = populateAttackerDesignations(pilot, baseAttacker);
    expect(out.designatedWeaponType).toBe('Medium Laser');
  });

  it('maps weapon_category onto designatedWeaponCategory', () => {
    const pilot = buildPilot([
      {
        kind: 'weapon_category',
        category: 'energy',
        displayLabel: 'Energy',
      },
    ]);
    const out = populateAttackerDesignations(pilot, baseAttacker);
    expect(out.designatedWeaponCategory).toBe('energy');
  });

  it('maps target.targetUnitId onto designatedTargetId', () => {
    const pilot = buildPilot([
      {
        kind: 'target',
        targetUnitId: 'unit-7',
        displayLabel: 'Atlas',
      },
    ]);
    const out = populateAttackerDesignations(pilot, baseAttacker);
    expect(out.designatedTargetId).toBe('unit-7');
  });

  it('skips deferred (empty) target bindings', () => {
    const pilot = buildPilot([
      {
        kind: 'target',
        targetUnitId: '',
        displayLabel: 'To be assigned',
      },
    ]);
    const out = populateAttackerDesignations(pilot, baseAttacker);
    expect(out.designatedTargetId).toBeUndefined();
  });

  it('maps range_bracket onto designatedRangeBracket', () => {
    const pilot = buildPilot([
      {
        kind: 'range_bracket',
        bracket: 'medium',
        displayLabel: 'Medium',
      },
    ]);
    const out = populateAttackerDesignations(pilot, baseAttacker);
    expect(out.designatedRangeBracket).toBe(RangeBracket.Medium);
  });

  it('preserves caller-supplied overrides', () => {
    const pilot = buildPilot([
      {
        kind: 'weapon_type',
        weaponTypeId: 'ppc',
        displayLabel: 'PPC',
      },
    ]);
    const out = populateAttackerDesignations(pilot, {
      ...baseAttacker,
      designatedWeaponType: 'Manual Override',
    });
    expect(out.designatedWeaponType).toBe('Manual Override');
  });

  it('handles pilots with multiple stored designations', () => {
    const pilot = buildPilot([
      {
        kind: 'weapon_type',
        weaponTypeId: 'ppc',
        displayLabel: 'PPC',
      },
      {
        kind: 'range_bracket',
        bracket: 'long',
        displayLabel: 'Long',
      },
      {
        kind: 'target',
        targetUnitId: 'unit-99',
        displayLabel: 'Awesome 8Q',
      },
    ]);
    const out = populateAttackerDesignations(pilot, baseAttacker);
    expect(out.designatedWeaponType).toBe('PPC');
    expect(out.designatedRangeBracket).toBe('long');
    expect(out.designatedTargetId).toBe('unit-99');
  });
});

// Quick integration smoke — make sure adapting full IPilot works end-to-end.
describe('populateAttackerDesignations — full IPilot smoke', () => {
  it('accepts a full IPilot record', () => {
    const fullPilot: IPilot = {
      id: 'pilot-1',
      name: 'Test',
      type: PilotType.Persistent,
      status: PilotStatus.Active,
      skills: { gunnery: 4, piloting: 5 },
      wounds: 0,
      abilities: [
        {
          abilityId: 'weapon_specialist',
          acquiredDate: '2026-01-01T00:00:00.000Z',
          designation: {
            kind: 'weapon_type',
            weaponTypeId: 'gauss_rifle',
            displayLabel: 'Gauss Rifle',
          },
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const out = populateAttackerDesignations(fullPilot, baseAttacker);
    expect(out.designatedWeaponType).toBe('Gauss Rifle');
  });
});
