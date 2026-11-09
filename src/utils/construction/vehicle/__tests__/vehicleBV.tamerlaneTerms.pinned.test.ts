import {
  buildDeltaReport,
  JavaReference,
} from '../../../../../scripts/unit-bv-parity';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import { contractUnitToBVUnit } from '../../contractBVUnitAdapter';

/**
 * @spec establish-all-unit-data-parity/battle-value-system
 * Java reference: normal-work/P1-reference/expected-policy/default-correction/
 * proof-d0c8c9e74/reference-full.jsonl (and .provenance.json), relative to
 * E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/.
 * Reference SHA-256: 4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87.
 * MegaMek: 48fcb2f64a1b3f2d575707ce5653dad64927b587.
 * Inputs: mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985, data/mekfiles/
 * plus each path below; sha256 identifies the LF-normalized source bytes.
 * Only BV-relevant converted source fields and these four Java maps are embedded.
 */
const source = {
  chassis: 'Tamerlane Strike Sled',
  unitType: 'Vehicle',
  techBase: 'INNER_SPHERE',
  rulesLevel: 'STANDARD',
  era: 'CIVIL_WAR',
  tonnage: 20,
  weightClass: 'LIGHT',
  motionType: 'Hover',
  movement: { cruiseMP: 12, flankMP: 18, jumpMP: 0 },
  engine: { type: 'FUSION', rating: 155 },
  armor: {
    type: 'STANDARD',
    byLocation: { FRONT: 10, RIGHT: 10, LEFT: 10, REAR: 8, TURRET: 10 },
  },
  armorTechRating: 0,
  internalType: -1,
};

const scalarTerms = {
  adjustment: 0,
  armorBV: 120,
  defensiveEquipmentBV: 0,
  defensiveFactor: 1.5,
  explosivePenalty: 0,
  offensiveEquipmentBV: 0,
  offensiveTypeModifier: 1,
  speedFactor: 2.72,
  structureBV: 15,
  summaryModifier: 1,
  typeModifier: 0.7,
  weightBV: 10,
};

const fixtures = [
  {
    path: 'vehicles/3075/Tamerlane Strike Sled (Flamer).blk',
    sha256: '5ceb9843137d2eadd33866de3484c8f9f9f4570da60e134a2a088c8d4b7f83d3',
    unit: {
      ...source,
      id: 'tamerlane-strike-sled-flamer',
      model: '(Flamer)',
      year: 3074,
      equipment: [
        { id: 'flamer', name: 'Flamer', location: 'FRONT' },
        { id: 'medium-laser', name: 'Medium Laser', location: 'TURRET' },
        { id: 'medium-laser', name: 'Medium Laser', location: 'TURRET' },
      ],
    },
    total: 436,
    offensive: 293.76000000000005,
    terms: {
      ...scalarTerms,
      ammoBV: 0,
      weaponBV: 98,
      'weapon.0.FR.Flamer': 6,
      'weapon.1.TU.Medium Laser': 46,
      'weapon.2.TU.Medium Laser': 46,
    },
  },
  {
    path: 'vehicles/3075/Tamerlane Strike Sled (RL).blk',
    sha256: 'd4e1201fbcd7753ce5cbaab414855f1060764ff7bd01d07ffd9b9499fe9d0717',
    unit: {
      ...source,
      id: 'tamerlane-strike-sled-rl',
      model: '(RL)',
      year: 3073,
      equipment: [
        { id: 'rl10', name: 'RL10', location: 'FRONT' },
        { id: 'rl10', name: 'RL10', location: 'FRONT' },
        { id: 'rl10', name: 'RL10', location: 'REAR' },
        { id: 'rl10', name: 'RL10', location: 'REAR' },
        { id: 'isermediumlaser', name: 'ISERMediumLaser', location: 'TURRET' },
      ],
    },
    total: 484,
    offensive: 342.72,
    terms: {
      ...scalarTerms,
      ammoBV: 0,
      weaponBV: 116,
      'weapon.0.FR.RL10': 18,
      'weapon.2.FR.RL10': 18,
      'weapon.4.RR.RL10': 9,
      'weapon.6.RR.RL10': 9,
      'weapon.8.TU.ISERMediumLaser': 62,
    },
  },
  {
    path: 'vehicles/3075/Tamerlane Strike Sled 2.blk',
    sha256: 'fef47ef938b0c8c3862933ad2eaa888068f0afbad99e273acd3787bf24e8f8af',
    unit: {
      ...source,
      id: 'tamerlane-strike-sled-2',
      model: '2',
      year: 3073,
      equipment: [
        { id: 'srm-2', name: 'SRM 2', location: 'FRONT' },
        { id: 'medium-laser', name: 'Medium Laser', location: 'TURRET' },
        { id: 'is-ammo-srm-2', name: 'IS Ammo SRM-2', location: 'BODY' },
      ],
    },
    total: 359,
    offensive: 217.60000000000002,
    terms: {
      ...scalarTerms,
      ammoBV: 3,
      weaponBV: 67,
      'ammo.available.SRM:2': 3,
      'ammo.cap.SRM:2': 21,
      'weapon.0.FR.SRM 2': 21,
      'weapon.1.TU.Medium Laser': 46,
    },
  },
  {
    path: 'vehicles/3075/Tamerlane Strike Sled.blk',
    sha256: '98dd4515a7ef1107445fd371c00f258ba1e798da84e8947552dc6d1d0e9bdece',
    unit: {
      ...source,
      id: 'tamerlane-strike-sled',
      model: '',
      year: 3071,
      equipment: [
        { id: 'srm-2', name: 'SRM 2', location: 'FRONT' },
        { id: 'isermediumlaser', name: 'ISERMediumLaser', location: 'TURRET' },
        { id: 'is-ammo-srm-2', name: 'IS Ammo SRM-2', location: 'BODY' },
      ],
    },
    total: 403,
    offensive: 261.12,
    terms: {
      ...scalarTerms,
      ammoBV: 3,
      weaponBV: 83,
      'ammo.available.SRM:2': 3,
      'ammo.cap.SRM:2': 21,
      'weapon.0.FR.SRM 2': 21,
      'weapon.1.TU.ISERMediumLaser': 62,
    },
  },
];

describe('pinned Tamerlane complete BV terms', () => {
  test.each(fixtures)(
    '$path matches every Java term without extra terms',
    (fixture) => {
      const reference = JavaReference.parse({
        path: fixture.path,
        sha256: fixture.sha256,
        concreteFamily: 'Tank',
        battleValue: {
          total: fixture.total,
          aggregates: {
            defensiveValue: 141.75,
            offensiveValue: fixture.offensive,
          },
          terms: fixture.terms,
        },
      });
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit(fixture.unit),
      );
      if (result?.kind !== 'vehicle')
        throw new Error(`Missing vehicle BV trace: ${fixture.path}`);
      // Structured calculation facts are not numeric trace entries.
      const {
        weaponMountBV: _mounts,
        ammoPools: _pools,
        ...terms
      } = result.breakdown;
      const figure = {
        total: result.breakdown.final,
        defensive: result.breakdown.defensive,
        offensive: result.breakdown.offensive,
        terms,
      };
      const actual = { path: fixture.path, sha256: fixture.sha256, figure };

      // Import the parity comparator so Java/local weapon names and indices use
      // its existing location/count/value correspondence, without copying it.
      const forward = buildDeltaReport(
        [actual],
        [reference],
        ['vehicles'],
        true,
      );
      expect(forward.errors).toEqual([]);
      expect(forward.rows[0].firstTermDifference).toBeNull();

      // These six local breakdown fields are outside Java's stage map. Pin their
      // aliases and neutral crew/turret/TMM facts rather than dropping local keys.
      const localFields = {
        defensive: 141.75,
        offensive: fixture.offensive,
        final: fixture.total,
        pilotMultiplier: 1,
        turretModifier: 1,
        tmm: 5,
      };
      expect(figure.terms).toMatchObject(localFields);
      // The comparator enumerates reference keys. Reverse it to reject every
      // additional local key, retaining the same weapon correspondence both ways.
      const reverse = buildDeltaReport(
        [
          {
            ...actual,
            figure: { ...figure, terms: { ...fixture.terms, ...localFields } },
          },
        ],
        [
          JavaReference.parse({
            ...reference,
            battleValue: { ...reference.battleValue, terms: figure.terms },
          }),
        ],
        ['vehicles'],
        true,
      );
      expect(reverse.errors).toEqual([]);
      expect(reverse.rows[0].firstTermDifference).toBeNull();
    },
  );
});
