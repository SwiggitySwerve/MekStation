import { jsonSchemaToZod } from 'json-schema-to-zod';

/** Decode only bounded string-enum alternatives; unsupported guards remain unfurled. */
export function stringEnumValues(schema) {
  const variants =
    schema &&
    Object.keys(schema).join() === 'anyOf' &&
    Array.isArray(schema.anyOf)
      ? schema.anyOf
      : [schema];
  if (
    !variants.length ||
    variants.some(
      (value) =>
        !value ||
        !Array.isArray(value.enum) ||
        !value.enum.length ||
        value.enum.some((item) => typeof item !== 'string') ||
        ('type' in value && value.type !== 'string') ||
        Object.keys(value).some(
          (key) => !['type', 'enum', 'description'].includes(key),
        ),
    )
  )
    return undefined;
  return variants.flatMap((value) => value.enum);
}

/** Reuse local string-enum facts in generated code as well as JSON Schema. */
export function prepareSchemaDefinitions(input) {
  const definitions = input.$defs ?? {};
  const names = new Map();
  const declarations = [];
  for (const [key, value] of Object.entries(definitions)) {
    if (
      !/^\w+$/.test(key) ||
      !Array.isArray(value?.enum) ||
      !stringEnumValues(value)
    )
      throw new Error('Unsupported local enum definition: ' + key);
    const name = 'SchemaDef_' + key;
    names.set(JSON.stringify(value), name);
    declarations.push(`const ${name} = ${jsonSchemaToZod(value)};`);
  }
  function resolve(value) {
    if (Array.isArray(value)) return value.map(resolve);
    if (!value || typeof value !== 'object') return value;
    if ('$ref' in value) {
      const key =
        typeof value.$ref === 'string'
          ? value.$ref.replace(/^#\/\$defs\//, '')
          : '';
      if (
        value.$ref !== '#/$defs/' + key ||
        !Object.hasOwn(definitions, key) ||
        Object.keys(value).length !== 1
      )
        throw new Error('Unsupported schema reference: ' + value.$ref);
      return structuredClone(definitions[key]);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolve(child)]),
    );
  }
  function parserOverride(schema) {
    const name = names.get(JSON.stringify(schema));
    if (name) return name;
    // z.any() for a negated family guard would erase the unitType discriminator.
    if (
      Object.keys(schema).length === 1 &&
      schema.not &&
      stringEnumValues(schema.not)
    ) {
      const negated = jsonSchemaToZod(schema.not, { parserOverride });
      return `z.unknown().refine((value) => !${negated}.safeParse(value).success, "Invalid input: Should NOT be valid against schema")`;
    }
    return undefined;
  }
  return {
    schema: resolve(input),
    declarations: declarations.join('\n'),
    parserOverride,
  };
}
