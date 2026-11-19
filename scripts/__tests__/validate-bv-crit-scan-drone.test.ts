/**
 * Drone Operating System detection is identity, never display text. MegaMek
 * 48fcb2f64: BVCalculator.java:296 sets isDrone from
 * hasWorkingMisc(F_DRONE_OPERATING_SYSTEM), :845-847 multiplies weapon BV by
 * 0.8 and MekBVCalculator.java:463-465 applies the 0.95 summary modifier.
 *
 * A unit has a Drone OS when a mount's equipment id is droneoperatingsystem, or
 * a raw critical cell holds one of the item's pinned native tokens
 * (ISDroneOperatingSystem, and its lookup names CLDroneOperatingSystem and
 * ISDroneControlConsole: MiscType.java:5102-5104). Display text never counts,
 * so a catalog rename cannot flip the modifier.
 */
import type { UnitData } from '../validate-bv-types';

import { scanCrits } from '../validate-bv-crit-scan';

function unitWith(
  cell: string,
  equipment: { id: string; location: string }[] = [],
): UnitData {
  return {
    id: 'drone-test',
    chassis: 'Test',
    model: 'Drone',
    tonnage: 60,
    techBase: 'INNER_SPHERE',
    configuration: 'Biped',
    engine: { type: 'FUSION', rating: 240 },
    equipment,
    armor: { type: 'STANDARD', allocation: {} },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    criticalSlots: { RIGHT_TORSO: [cell] },
  } as unknown as UnitData;
}

describe('Drone OS detection by identity', () => {
  it.each([
    'ISDroneOperatingSystem',
    'CLDroneOperatingSystem',
    'ISDroneControlConsole',
  ])('detects the raw native token %s', (cell) => {
    expect(scanCrits(unitWith(cell)).detectedDroneOS).toBe(true);
  });

  it('detects a mount whose equipment id is droneoperatingsystem, whatever its cell text', () => {
    expect(
      scanCrits(
        unitWith('Drone (Remote) Operating System', [
          { id: 'droneoperatingsystem', location: 'RT' },
        ]),
      ).detectedDroneOS,
    ).toBe(true);
  });

  it('does not detect a display-name-only cell with no mount or id: identity comes from the mount', () => {
    expect(
      scanCrits(unitWith('Drone (Remote) Operating System')).detectedDroneOS,
    ).toBe(false);
  });

  it.each([
    'Remote Drone Command Console',
    'ISRemoteDroneCommandConsole',
    'Drone (Remote) Carrier Control System',
    'SDS (Caspar) Drone Control System',
    // Substring look-alikes must not count.
    'Not a Drone Operating System Kit',
    'ISDroneOperatingSystemKit',
  ])('does not detect %s', (cell) => {
    expect(scanCrits(unitWith(cell)).detectedDroneOS).toBe(false);
  });

  it.each(['remotedronecommandconsole', 'dronecarriercontrolsystem'])(
    'does not detect a look-alike mount id %s',
    (id) => {
      expect(
        scanCrits(unitWith('', [{ id, location: 'RT' }])).detectedDroneOS,
      ).toBe(false);
    },
  );
});
