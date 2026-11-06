/** Native multi-crew identity; MM 48fcb2f64 CrewType.java:51-53,79-81. */
export const MECH_CREW_TYPES = Object.freeze([
  'TRIPOD',
  'SUPERHEAVY_TRIPOD',
  'QUADVEE',
] as const);
export type MechCrewType = (typeof MECH_CREW_TYPES)[number];
export const MECH_CREW_ROLES = Object.freeze({
  Pilot: 'Pilot',
  Gunner: 'Gunner',
  TechOfficer: 'Tech Officer',
} as const);
export type MechCrewRole =
  (typeof MECH_CREW_ROLES)[keyof typeof MECH_CREW_ROLES];

const { Pilot, Gunner, TechOfficer } = MECH_CREW_ROLES;
const roles: Readonly<Record<MechCrewType, readonly MechCrewRole[]>> = {
  TRIPOD: Object.freeze([Pilot, Gunner]),
  SUPERHEAVY_TRIPOD: Object.freeze([Pilot, Gunner, TechOfficer]),
  QUADVEE: Object.freeze([Pilot, Gunner]),
};

/** Ordered native slots; no person assignment or cockpit/tonnage inference. */
export function getMechCrewRoles(type: MechCrewType): readonly MechCrewRole[] {
  return roles[type];
}
