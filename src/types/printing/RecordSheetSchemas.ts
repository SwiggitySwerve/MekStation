import { z } from 'zod';

// =============================================================================
// Zod schemas — runtime boundary for extractor -> renderer payloads
// =============================================================================

const numberOrStringSchema = z.union([z.number(), z.string()]);

export const RecordSheetHeaderSchema = z.object({
  unitName: z.string(),
  chassis: z.string(),
  model: z.string(),
  tonnage: z.number(),
  techBase: z.string(),
  rulesLevel: z.string(),
  era: z.string(),
  role: z.string().optional(),
  battleValue: z.number(),
  cost: z.number(),
});

export const RecordSheetMovementSchema = z.object({
  walkMP: z.number(),
  runMP: z.number(),
  jumpMP: z.number(),
  jumpJetType: z.string().optional(),
  hasMASC: z.boolean(),
  hasTSM: z.boolean(),
  hasSupercharger: z.boolean(),
});

export const LocationArmorSchema = z.object({
  location: z.string(),
  abbreviation: z.string(),
  current: z.number(),
  maximum: z.number(),
  rear: z.number().optional(),
  rearMaximum: z.number().optional(),
});

export const RecordSheetArmorSchema = z.object({
  type: z.string(),
  totalPoints: z.number(),
  locations: z.array(LocationArmorSchema),
});

export const LocationStructureSchema = z.object({
  location: z.string(),
  abbreviation: z.string(),
  points: z.number(),
});

export const RecordSheetStructureSchema = z.object({
  type: z.string(),
  totalPoints: z.number(),
  locations: z.array(LocationStructureSchema),
});

export const RecordSheetEquipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  locationAbbr: z.string(),
  heat: numberOrStringSchema,
  damage: numberOrStringSchema,
  damageCode: z.string().optional(),
  minimum: numberOrStringSchema,
  short: numberOrStringSchema,
  medium: numberOrStringSchema,
  long: numberOrStringSchema,
  quantity: z.number(),
  isWeapon: z.boolean(),
  isAmmo: z.boolean(),
  isEquipment: z.boolean().optional(),
  ammoCount: z.number().optional(),
});

export const RecordSheetHeatSinksSchema = z.object({
  type: z.string(),
  count: z.number(),
  capacity: z.number(),
  integrated: z.number(),
  external: z.number(),
});

export const RecordSheetCriticalSlotSchema = z.object({
  slotNumber: z.number(),
  content: z.string(),
  isSystem: z.boolean(),
  isHittable: z.boolean(),
  isRollAgain: z.boolean(),
  equipmentId: z.string().optional(),
});

export const LocationCriticalsSchema = z.object({
  location: z.string(),
  abbreviation: z.string(),
  slots: z.array(RecordSheetCriticalSlotSchema),
});

export const RecordSheetPilotSchema = z.object({
  name: z.string(),
  gunnery: z.number(),
  piloting: z.number(),
  wounds: z.number(),
  edge: z.number().optional(),
});

export const RecordSheetSPAEntrySchema = z.object({
  abilityId: z.string(),
  displayName: z.string(),
  category: z.string(),
  headline: z.string(),
  truncatedDescription: z.string(),
  xpSpent: z.number().optional(),
});

export const MechRecordSheetDataSchema = z.object({
  unitType: z.literal('mech'),
  header: RecordSheetHeaderSchema,
  movement: RecordSheetMovementSchema,
  armor: RecordSheetArmorSchema,
  structure: RecordSheetStructureSchema,
  equipment: z.array(RecordSheetEquipmentSchema),
  heatSinks: RecordSheetHeatSinksSchema,
  criticals: z.array(LocationCriticalsSchema),
  pilot: RecordSheetPilotSchema.optional(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
  mechType: z.enum(['biped', 'quad', 'tripod', 'lam', 'quadvee']),
});

export const VehicleCrewMemberSchema = z.object({
  role: z.enum(['driver', 'gunner', 'commander']),
  name: z.string().optional(),
  gunnery: z.number(),
  piloting: z.number(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

export const VehicleLocationArmorSchema = z.object({
  location: z.enum([
    'Front',
    'Left Side',
    'Right Side',
    'Rear',
    'Turret',
    'Rotor',
    'Chin',
    'Body',
  ]),
  current: z.number(),
  maximum: z.number(),
  bar: z.number().optional(),
});

export const VehicleRecordSheetDataSchema = z.object({
  unitType: z.literal('vehicle'),
  header: RecordSheetHeaderSchema,
  motionType: z.enum([
    'Tracked',
    'Wheeled',
    'Hover',
    'VTOL',
    'WiGE',
    'Naval',
    'Submarine',
    'Rail',
  ]),
  turretConfig: z.enum(['None', 'Single', 'Dual', 'Front', 'Rear', 'Sponson']),
  cruiseMP: z.number(),
  flankMP: z.number(),
  armorType: z.string(),
  armorLocations: z.array(VehicleLocationArmorSchema),
  crew: z.array(VehicleCrewMemberSchema),
  equipment: z.array(RecordSheetEquipmentSchema),
  barRating: z.number().optional(),
  pilot: RecordSheetPilotSchema.optional(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

export const AerospaceArcArmorSchema = z.object({
  arc: z.enum(['Nose', 'Left Wing', 'Right Wing', 'Aft']),
  current: z.number(),
  maximum: z.number(),
});

export const AerospaceRecordSheetDataSchema = z.object({
  unitType: z.literal('aerospace'),
  header: RecordSheetHeaderSchema,
  structuralIntegrity: z.number(),
  fuelPoints: z.number(),
  safeThrust: z.number(),
  maxThrust: z.number(),
  heatSinks: RecordSheetHeatSinksSchema,
  armorType: z.string(),
  armorArcs: z.array(AerospaceArcArmorSchema),
  equipment: z.array(RecordSheetEquipmentSchema),
  bombBaySlots: z.number(),
  pilot: RecordSheetPilotSchema.optional(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

export const BattleArmorTrooperSchema = z.object({
  index: z.number(),
  armorPips: z.number(),
  maximumArmorPips: z.number(),
  modularWeapon: z.string().optional(),
  apWeapon: z.string().optional(),
  gunnery: z.number(),
  antiMech: z.number(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

export const BattleArmorRecordSheetDataSchema = z.object({
  unitType: z.literal('battlearmor'),
  header: RecordSheetHeaderSchema,
  squadSize: z.number(),
  troopers: z.array(BattleArmorTrooperSchema),
  manipulators: z.object({ left: z.string(), right: z.string() }),
  jumpMP: z.number(),
  walkMP: z.number(),
  umuMP: z.number(),
  vtolMP: z.number(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

export const InfantryFieldGunSheetSchema = z.object({
  name: z.string(),
  count: z.number(),
  damage: numberOrStringSchema,
  minimumRange: z.number(),
  shortRange: z.number(),
  mediumRange: z.number(),
  longRange: z.number(),
  ammoRounds: z.number().optional(),
});

export const InfantryPlatoonCompositionSheetSchema = z.object({
  squads: z.number(),
  troopersPerSquad: z.number(),
});

export const InfantryWeaponSheetSchema = z.object({
  name: z.string(),
  damage: numberOrStringSchema,
  minimumRange: z.number(),
  shortRange: z.number(),
  mediumRange: z.number(),
  longRange: z.number(),
  ammoType: z.string().optional(),
  heat: z.number().optional(),
  special: z.array(z.string()).optional(),
});

export const InfantrySecondaryWeaponSheetSchema =
  InfantryWeaponSheetSchema.extend({
    perTrooperRatio: z.number(),
    count: z.number().optional(),
  });

export const InfantryRecordSheetDataSchema = z.object({
  unitType: z.literal('infantry'),
  header: RecordSheetHeaderSchema,
  platoonSize: z.number(),
  platoonComposition: InfantryPlatoonCompositionSheetSchema,
  motiveType: z.enum(['Foot', 'Motorized', 'Jump', 'Mechanized', 'Beast']),
  armorKit: z.string(),
  primaryWeapon: InfantryWeaponSheetSchema,
  secondaryWeapons: z.array(InfantrySecondaryWeaponSheetSchema),
  fieldGun: InfantryFieldGunSheetSchema.optional(),
  specialization: z.string().optional(),
  antiMechTraining: z.boolean(),
  gunnery: z.number(),
  antiMech: z.number(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

const protoArmorValueSchema = z.object({
  current: z.number(),
  maximum: z.number(),
});

export const ProtoMechUnitSchema = z.object({
  index: z.number(),
  armorByLocation: z.object({
    Head: protoArmorValueSchema,
    Torso: protoArmorValueSchema,
    'Left Arm': protoArmorValueSchema,
    'Right Arm': protoArmorValueSchema,
    Legs: protoArmorValueSchema,
    'Main Gun': protoArmorValueSchema,
  }),
});

export const ProtoMechRecordSheetDataSchema = z.object({
  unitType: z.literal('protomech'),
  header: RecordSheetHeaderSchema,
  pointSize: z.number(),
  protos: z.array(ProtoMechUnitSchema),
  mainGun: z.string().optional(),
  mainGunAmmo: z.number().optional(),
  hasUMU: z.boolean(),
  isGlider: z.boolean(),
  walkMP: z.number(),
  jumpMP: z.number(),
  equipment: z.array(RecordSheetEquipmentSchema),
  pilot: RecordSheetPilotSchema.optional(),
  specialAbilities: z.array(RecordSheetSPAEntrySchema).optional(),
});

export const RecordSheetDataSchema = z.discriminatedUnion('unitType', [
  MechRecordSheetDataSchema,
  VehicleRecordSheetDataSchema,
  AerospaceRecordSheetDataSchema,
  BattleArmorRecordSheetDataSchema,
  InfantryRecordSheetDataSchema,
  ProtoMechRecordSheetDataSchema,
]);
