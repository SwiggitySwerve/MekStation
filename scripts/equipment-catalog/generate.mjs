import assert from 'node:assert/strict';

export const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const techBases = { IS: 'INNER_SPHERE', CLAN: 'CLAN', ALL: 'BOTH' };
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const number = (value, label) => {
  assert(Number.isFinite(value), `Missing/nonfinite ${label}`);
  return value;
};

export function assertAdditive(before, after) {
  for (const id of new Set(before.map((entry) => entry.id))) {
    const entries = after.filter((entry) => entry.id === id);
    assert(entries.length, `Removed existing id ${id}`);
    assert.equal(
      JSON.stringify(entries),
      JSON.stringify(before.filter((entry) => entry.id === id)),
      `Changed existing id ${id}`,
    );
  }
}

export function generateEntries(
  registry,
  gaps,
  facts,
  lookups,
  existing,
  mappings,
) {
  const selected = new Set(gaps.map((gap) => gap.java.internalName));
  for (const [name, fact] of Object.entries(facts))
    if (fact.damageDivisor !== undefined || fact.usedByProto)
      selected.add(name);
  const types = new Map(registry.map((row) => [row.internalName, row]));
  assert.equal(types.size, registry.length, 'Duplicate Java internal name');
  const ids = new Set(existing.map((entry) => entry.id));
  const identities = new Map();
  for (const name of [...selected].sort()) {
    assert(types.has(name), `Unregistered gap ${name}`);
    const id = `${slug(name)}-registry`;
    assert(id && !ids.has(id), `Catalog id collision: ${name} -> ${id}`);
    ids.add(id);
    identities.set(name, id);
  }
  const known = new Map(identities);
  for (const type of registry) {
    if (known.has(type.internalName)) continue;
    const id = [type.internalName, ...type.aliases]
      .map((alias) => mappings[alias])
      .find((id) =>
        existing.some(
          (entry) =>
            entry.id === id &&
            entry.battleValue === type.bv &&
            entry.weight === type.tons &&
            (entry.techBase === 'BOTH' ||
              entry.techBase === techBases[type.tech]),
        ),
      );
    if (id) known.set(type.internalName, id);
  }
  const items = [];
  const aliases = {};
  const existingAliases = new Set(
    Object.keys(mappings).map((key) => key.toLowerCase()),
  );
  for (const [name, id] of identities) {
    const type = types.get(name),
      fact = facts[name];
    assert(fact, `Missing Java facts: ${name}`);
    const notes = [
      `https://github.com/MegaMek/megamek/blob/${revision}/megamek/src/${type.javaClass.replaceAll('.', '/')}.java: ${name}`,
    ];
    const fixed = (value, label) => {
      number(value, `${name}.${label}`);
      if (value < 0 || (value > 0 && value < 1e-30)) {
        notes.push(`Java variable ${label}: ${value}`);
        return 0;
      }
      return value;
    };
    const entry = {
      id,
      name: type.name,
      category: fact.kind === 'weapons' ? fact.category : 'Miscellaneous',
      techBase: techBases[type.tech],
      rulesLevel:
        fact.rulesLevel === 'INTRO' ? 'INTRODUCTORY' : fact.rulesLevel,
      weight: fixed(type.tons, 'weight'),
      criticalSlots: fixed(fact.criticalSlots, 'criticalSlots'),
      battleValue: fixed(type.bv, 'battleValue'),
      introductionYear: number(
        fact.introductionYear,
        `${name}.introductionYear`,
      ),
    };
    assert(entry.techBase, `Unknown tech base: ${type.tech}`);
    if (fact.allowedUnitTypes?.length)
      entry.allowedUnitTypes = fact.allowedUnitTypes;
    for (const key of ['extinctionYear', 'reintroductionYear'])
      if (fact[key] !== -1 && fact[key] !== undefined)
        entry[key] = number(fact[key], key);
    if (fact.kind === 'ammunition') {
      entry.category = fact.category;
      entry.variant =
        {
          M_STANDARD: 'Standard',
          M_CLUSTER: 'Cluster',
          M_INFERNO: 'Inferno',
          M_FRAGMENTATION: 'Fragmentation',
          M_SMOKE: 'Smoke',
        }[fact.munitions?.join(',')] ?? 'Other';
      entry.shotsPerTon = number(fact.shots, `${name}.shots`);
      entry.kgPerShot = number(fact.kgPerShot, `${name}.kgPerShot`);
      entry.compatibleWeaponIds = [
        ...new Set(
          (fact.compatible ?? [])
            .map((weapon) => known.get(weapon))
            .filter(Boolean),
        ),
      ];
      entry.costPerTon = fixed(fact.cost, 'cost');
      entry.isExplosive = fact.isExplosive;
      notes.push(`Java ammoType:rackSize ${fact.ammoType}:${fact.rackSize}`);
      notes.push(`Java munitions: ${(fact.munitions ?? []).join(',')}`);
      if (fact.compatible?.some((weapon) => !known.has(weapon)))
        notes.push(
          `Unrepresented compatible Java weapons: ${fact.compatible.filter((weapon) => !known.has(weapon)).join(', ')}`,
        );
    } else {
      entry.costCBills = fixed(fact.cost, 'cost');
      if (fact.kind === 'weapons') {
        entry.subType = type.javaClass.split('.').at(-1);
        entry.damage =
          fact.damage < 0
            ? `Java variable damage (${fact.damage})`
            : number(fact.damage, 'damage');
        entry.heat = number(fact.heat, 'heat');
        entry.ranges = fact.ranges;
      }
      if (fact.damageDivisor !== undefined) {
        entry.damageDivisor = number(fact.damageDivisor, 'damageDivisor');
        entry.allowedUnitTypes = ['Infantry'];
      }
    }
    entry.special = notes;
    items.push({ kind: fact.kind, entry, internalName: name });
    const gap = gaps.find((gap) => gap.java.internalName === name);
    const inputs = gap?.inputs?.map((input) => input.id) ?? [];
    for (const alias of new Set([name, ...type.aliases, ...inputs])) {
      // The frozen lookup oracle resolves duplicate lookup names; existing mappings win.
      const sourceName = [name, ...type.aliases].find(
        (native) => slug(native) === alias,
      );
      const owner =
        lookups[alias.toLowerCase()]?.default ??
        lookups[sourceName?.toLowerCase()]?.default;
      if (
        (owner
          ? owner !== name
          : !inputs.includes(alias) ||
            gaps.some(
              (gap) =>
                gap.java.internalName !== name &&
                gap.inputs?.some((input) => input.id === alias),
            )) ||
        existingAliases.has(alias.toLowerCase())
      )
        continue;
      assert(
        !aliases[alias] || aliases[alias] === id,
        `Alias collision: ${alias}`,
      );
      aliases[alias] = id;
    }
  }
  return { items, aliases };
}
