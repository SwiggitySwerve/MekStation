import nameMappings from '../../../public/data/equipment/name-mappings.json';
import ammunitionArtillery from '../../../public/data/equipment/official/ammunition/artillery.json';
import ammunitionAtm from '../../../public/data/equipment/official/ammunition/atm.json';
import ammunitionAutocannon from '../../../public/data/equipment/official/ammunition/autocannon.json';
import ammunitionGauss from '../../../public/data/equipment/official/ammunition/gauss.json';
import ammunitionLrm from '../../../public/data/equipment/official/ammunition/lrm.json';
import ammunitionMachinegun from '../../../public/data/equipment/official/ammunition/machinegun.json';
import ammunitionMrm from '../../../public/data/equipment/official/ammunition/mrm.json';
import ammunitionNarc from '../../../public/data/equipment/official/ammunition/narc.json';
import ammunitionOther from '../../../public/data/equipment/official/ammunition/other.json';
import ammunitionSrm from '../../../public/data/equipment/official/ammunition/srm.json';
import electronicsActiveProbe from '../../../public/data/equipment/official/electronics/active-probe.json';
import electronicsC3 from '../../../public/data/equipment/official/electronics/c3.json';
import electronicsEcm from '../../../public/data/equipment/official/electronics/ecm.json';
import electronicsOther from '../../../public/data/equipment/official/electronics/other.json';
import miscellaneousDefensive from '../../../public/data/equipment/official/miscellaneous/defensive.json';
import miscellaneousHeatSinks from '../../../public/data/equipment/official/miscellaneous/heat-sinks.json';
import miscellaneousJumpJets from '../../../public/data/equipment/official/miscellaneous/jump-jets.json';
import miscellaneousMovement from '../../../public/data/equipment/official/miscellaneous/movement.json';
import miscellaneousMyomer from '../../../public/data/equipment/official/miscellaneous/myomer.json';
import miscellaneousOther from '../../../public/data/equipment/official/miscellaneous/other.json';
import weaponsBallisticAutocannon from '../../../public/data/equipment/official/weapons/ballistic-autocannon.json';
import weaponsBallisticGauss from '../../../public/data/equipment/official/weapons/ballistic-gauss.json';
import weaponsBallisticMachinegun from '../../../public/data/equipment/official/weapons/ballistic-machinegun.json';
import weaponsBallisticOther from '../../../public/data/equipment/official/weapons/ballistic-other.json';
import weaponsEnergyLaser from '../../../public/data/equipment/official/weapons/energy-laser.json';
import weaponsEnergyOther from '../../../public/data/equipment/official/weapons/energy-other.json';
import weaponsEnergyPpc from '../../../public/data/equipment/official/weapons/energy-ppc.json';
import weaponsMissileAtm from '../../../public/data/equipment/official/weapons/missile-atm.json';
import weaponsMissileLrm from '../../../public/data/equipment/official/weapons/missile-lrm.json';
import weaponsMissileMrm from '../../../public/data/equipment/official/weapons/missile-mrm.json';
import weaponsMissileOther from '../../../public/data/equipment/official/weapons/missile-other.json';
import weaponsMissileSrm from '../../../public/data/equipment/official/weapons/missile-srm.json';
import weaponsPhysical from '../../../public/data/equipment/official/weapons/physical.json';

interface CatalogDataFile {
  items?: Array<Record<string, unknown>>;
}

interface NameMappingsData {
  $schema?: string;
  [key: string]: string | undefined;
}

export const WEAPON_CATALOG_FILES: readonly CatalogDataFile[] = [
  weaponsEnergyLaser,
  weaponsEnergyPpc,
  weaponsEnergyOther,
  weaponsBallisticAutocannon,
  weaponsBallisticGauss,
  weaponsBallisticMachinegun,
  weaponsBallisticOther,
  weaponsMissileAtm,
  weaponsMissileLrm,
  weaponsMissileMrm,
  weaponsMissileOther,
  weaponsMissileSrm,
  weaponsPhysical,
] as const;

export const ELECTRONICS_CATALOG_FILES: readonly CatalogDataFile[] = [
  electronicsEcm,
  electronicsActiveProbe,
  electronicsC3,
  electronicsOther,
] as const;

export const MISCELLANEOUS_CATALOG_FILES: readonly CatalogDataFile[] = [
  miscellaneousHeatSinks,
  miscellaneousJumpJets,
  miscellaneousMovement,
  miscellaneousMyomer,
  miscellaneousDefensive,
  miscellaneousOther,
] as const;

export const AMMUNITION_CATALOG_FILES: readonly CatalogDataFile[] = [
  ammunitionArtillery,
  ammunitionAtm,
  ammunitionAutocannon,
  ammunitionGauss,
  ammunitionLrm,
  ammunitionMachinegun,
  ammunitionMrm,
  ammunitionNarc,
  ammunitionOther,
  ammunitionSrm,
] as const;

export const NAME_MAPPINGS_DATA = nameMappings as unknown as NameMappingsData;
