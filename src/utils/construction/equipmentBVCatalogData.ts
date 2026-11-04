import nameMappings from '../../../public/data/equipment/name-mappings.json';
import ammunitionArtillery from '../../../public/data/equipment/official/ammunition/artillery.json';
import ammunitionAtm from '../../../public/data/equipment/official/ammunition/atm.json';
import ammunitionAutocannon from '../../../public/data/equipment/official/ammunition/autocannon.json';
import ammunitionGauss from '../../../public/data/equipment/official/ammunition/gauss.json';
import registryAmmo from '../../../public/data/equipment/official/ammunition/java-registry.json';
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
import registryMisc from '../../../public/data/equipment/official/miscellaneous/java-registry.json';
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
import registryWeapons from '../../../public/data/equipment/official/weapons/java-registry.json';
import weaponsMissileAtm from '../../../public/data/equipment/official/weapons/missile-atm.json';
import weaponsMissileLrm from '../../../public/data/equipment/official/weapons/missile-lrm.json';
import weaponsMissileMrm from '../../../public/data/equipment/official/weapons/missile-mrm.json';
import weaponsMissileOther from '../../../public/data/equipment/official/weapons/missile-other.json';
import weaponsMissileSrm from '../../../public/data/equipment/official/weapons/missile-srm.json';
import weaponsPhysical from '../../../public/data/equipment/official/weapons/physical.json';
import registryRouting from '../../../public/data/equipment/registry-routing.json';
import { parseNameMappings } from './equipmentBV/nameMappingsContractAdapter';
import { nativeIdentityId } from './equipmentBV/sourceLookupAliases';

interface CatalogDataFile {
  items?: Array<Record<string, unknown>>;
}

export const WEAPON_CATALOG_FILES: readonly CatalogDataFile[] = [
  registryWeapons,
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
  registryMisc,
  miscellaneousHeatSinks,
  miscellaneousJumpJets,
  miscellaneousMovement,
  miscellaneousMyomer,
  miscellaneousDefensive,
  miscellaneousOther,
] as const;

export const AMMUNITION_CATALOG_FILES: readonly CatalogDataFile[] = [
  registryAmmo,
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

// Parsed once at module load through `parseNameMappings`, which is the
// adapter for the `NameMappingsContract` Zod schema generated from
// `public/data/equipment/_schema/name-mappings-schema.json`. This
// closes the previous schema-bridge cast: instead of trusting
// the imported JSON shape statically, we validate it at the boundary
// so any future drift in `name-mappings.json` (e.g. a non-string value
// sneaking in via an audit) fails loudly with a Zod issue path.
export const NAME_MAPPINGS_DATA = parseNameMappings(nameMappings);
// Imported Java identities are exact-only; adding candidates must not change
// established alias synthesis, prefix stripping or fuzzy consumer fallbacks.
const registryIds = new Set(
  [...registryWeapons.items, ...registryAmmo.items, ...registryMisc.items].map(
    (item) => item.id,
  ),
);
const registryNames = new Map<string, string>();
for (const [name, id] of Object.entries(NAME_MAPPINGS_DATA))
  if (typeof id === 'string' && registryIds.has(id))
    registryNames.set(name.toLowerCase(), id);
export const isRegistryEquipment = (id: string): boolean => registryIds.has(id);
export const isLegacyEquipmentId = (id: string): boolean =>
  !isRegistryEquipment(id);
const previousRegistryIds = new Map(
  Object.entries(registryRouting.previousIds),
);
// A route is one native name (previous id in previousIds) or, for approved
// alias identity fixes, { native name: previous id } (follow-up 79).
const registryRoutes = registryRouting.nativeNames as Readonly<
  Record<string, string | Readonly<Record<string, string>>>
>;
export const registryPreviousId = (
  id: string,
  name?: string,
): string | undefined => {
  if (name === undefined) return previousRegistryIds.get(id);
  const key = name.trim().toLowerCase();
  const route = registryRoutes[id];
  if (typeof route === 'string')
    return route.toLowerCase() === key
      ? (nativeIdentityId(name) ?? previousRegistryIds.get(id))
      : undefined;
  const native = Object.keys(route ?? {}).find((n) => n.toLowerCase() === key);
  return native && route
    ? (nativeIdentityId(name) ?? route[native])
    : undefined;
};
// Follow-up 93: a name whose pinned Java owner depends on the unit's tech base
// (java-registry.json.lookups.json IS vs CLAN), keyed by the Java lookup name and
// the converter's list id, so both sides of a mount reach one identity.
const techRoutes = new Map(
  Object.entries(
    (
      registryRouting as {
        techRoutes?: Record<string, { INNER_SPHERE: string; CLAN: string }>;
      }
    ).techRoutes ?? {},
  ).map(([name, route]) => [name.toLowerCase(), route]),
);
export const techRouteId = (name: string, clan: boolean): string | undefined =>
  techRoutes.get(name.trim().toLowerCase())?.[clan ? 'CLAN' : 'INNER_SPHERE'];
export function preferRegistryEquipment<
  T extends { id: string } | null | undefined,
>(previous: T, imported: NonNullable<T> | undefined, name: string): T {
  return imported &&
    (!previous || registryPreviousId(imported.id, name) === previous.id)
    ? imported
    : previous;
}
export const resolveRegistryId = (name: string): string | undefined => {
  const key = name.toLowerCase().trim();
  return registryIds.has(key) ? key : registryNames.get(key);
};
