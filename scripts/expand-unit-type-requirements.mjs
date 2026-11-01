/**
 * json-schema-to-zod does not implement if/then. Expand the unit schema's
 * discriminator requirements into ordinary union branches before conversion.
 * Reject unhandled clauses so new schema rules cannot silently disappear.
 */
export function expandUnitTypeRequirements(schema) {
  if (!schema.allOf?.length) return schema;
  const unitTypes = schema.properties?.unitType?.enum;
  if (!Array.isArray(unitTypes))
    throw new Error('Unit schema needs an enumerated unitType');

  for (const rule of schema.allOf) {
    const condition = rule.if;
    if (
      Object.keys(rule).some((key) => !['if', 'then'].includes(key)) ||
      !condition ||
      !rule.then ||
      Object.keys(condition).some(
        (key) => !['required', 'properties'].includes(key),
      ) ||
      JSON.stringify(condition.required) !== '["unitType"]' ||
      Object.keys(condition.properties ?? {}).join(',') !== 'unitType' ||
      Object.keys(condition.properties.unitType).join(',') !== 'enum' ||
      !Array.isArray(condition.properties.unitType.enum)
    )
      throw new Error('Unsupported conditional rule in unit schema');
  }

  const groups = new Map();
  for (const unitType of unitTypes) {
    const rules = schema.allOf.filter((rule) =>
      rule.if.properties.unitType.enum.includes(unitType),
    );
    const key = JSON.stringify(rules);
    const group = groups.get(key) ?? { unitTypes: [], rules };
    group.unitTypes.push(unitType);
    groups.set(key, group);
  }

  const branches = [...groups.values()].map((group) => {
    const branch = structuredClone(schema);
    delete branch.allOf;
    branch.properties.unitType.enum = group.unitTypes;
    for (const rule of group.rules) applyRequirements(branch, rule.then);
    foldNumericAlternative(branch);
    return branch;
  });
  return {
    $schema: schema.$schema,
    title: schema.title,
    description: schema.description,
    anyOf: branches,
  };
}

/** Preserve the generated object's public shape when its discriminator rules out alternatives. */
function foldNumericAlternative(branch) {
  if (!branch.anyOf) return;
  const alternatives = branch.anyOf.filter((clause) => {
    const types = clause.properties?.unitType?.enum;
    return (
      !types ||
      types.some((type) => branch.properties.unitType.enum.includes(type))
    );
  });
  if (alternatives.length !== 1) return;
  const clause = alternatives[0];
  if (Object.keys(clause).some((key) => key !== 'properties')) return;
  const entries = Object.entries(clause.properties ?? {});
  if (
    !entries.length ||
    entries.some(
      ([key, constraint]) =>
        Object.keys(constraint).some(
          (keyword) => !['type', 'maximum'].includes(keyword),
        ) ||
        constraint.type !== 'number' ||
        typeof constraint.maximum !== 'number' ||
        branch.properties[key]?.type !== 'number',
    )
  )
    return;
  for (const [key, constraint] of entries) {
    const target = branch.properties[key];
    target.maximum = Math.min(target.maximum ?? Infinity, constraint.maximum);
  }
  delete branch.anyOf;
}

function applyRequirements(target, clause) {
  if (
    Object.keys(clause).some(
      (key) => !['required', 'properties', 'maximum'].includes(key),
    )
  ) {
    throw new Error('Unsupported conditional constraint in unit schema');
  }
  if (clause.maximum !== undefined)
    target.maximum = Math.min(target.maximum ?? Infinity, clause.maximum);
  if (clause.required) {
    if (
      !Array.isArray(clause.required) ||
      clause.required.some((key) => typeof key !== 'string')
    ) {
      throw new Error('Invalid conditional required list in unit schema');
    }
    target.required = [
      ...new Set([...(target.required ?? []), ...clause.required]),
    ];
  }
  for (const [key, child] of Object.entries(clause.properties ?? {})) {
    if (!target.properties?.[key])
      throw new Error('Conditional property has no base schema: ' + key);
    applyRequirements(target.properties[key], child);
  }
}
