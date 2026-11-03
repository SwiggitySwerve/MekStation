/**
 * Native inventory location abbreviations from MegaMek 48fcb2f6
 * Tank, SuperHeavyTank, Aero and SmallCraft.getLocationAbbreviations().
 * Inventory labels and SVG anchor suffixes are distinct contracts: a standard
 * dual tank prints RT in its inventory but its rear armor template uses TU.
 */
const VEHICLE_LOCATIONS: Readonly<Record<string, string>> = {
  Front: 'FR',
  Left: 'LS',
  Right: 'RS',
  Rear: 'RR',
  Body: 'BD',
  'Front Left': 'FRLS',
  'Front Right': 'FRRS',
  'Rear Left': 'RRLS',
  'Rear Right': 'RRRS',
  Turret: 'TU',
  'Turret 2': 'FT',
  Rotor: 'RO',
  Chin: 'TU',
};
const AEROSPACE_LOCATIONS: Readonly<Record<string, string>> = {
  NOSE: 'NOS',
  LEFT_WING: 'LWG',
  RIGHT_WING: 'RWG',
  AFT: 'AFT',
  WINGS: 'WNG',
  FUSELAGE: 'FSLG',
  LEFT_SIDE: 'LS',
  RIGHT_SIDE: 'RS',
  HULL: 'HULL',
};

export function getVehicleEquipmentLocationAbbr(
  location: string,
  dualTurret: boolean,
): string {
  return location === 'Turret' && dualTurret
    ? 'RT'
    : (VEHICLE_LOCATIONS[location] ?? location);
}

/** Takes the contract arc returned by the public editor/contract arc mapper. */
export function getAerospaceEquipmentLocationAbbr(contractArc: string): string {
  return AEROSPACE_LOCATIONS[contractArc] ?? contractArc;
}
