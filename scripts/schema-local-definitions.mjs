import { jsonSchemaToZod } from 'json-schema-to-zod';

/** Reuse local string-enum facts in generated code as well as JSON Schema. */
export function prepareSchemaDefinitions(input) {
  const definitions = input.$defs ?? {};
  const names = new Map();
  const declarations = [];
  for (const [key, value] of Object.entries(definitions)) {
    if (
      !/^\w+$/.test(key) ||
      !Array.isArray(value.enum) ||
      !value.enum?.length ||
      value.enum.some((item) => typeof item !== 'string') ||
      // A Zod literal drops `type`, so only the matching string type is safe.
      ('type' in value && value.type !== 'string') ||
      Object.keys(value).some(
        (keyword) => !['type', 'enum', 'description'].includes(keyword),
      )
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
  return {
    schema: resolve(input),
    declarations: declarations.join('\n'),
    parserOverride: (schema) => {
      const name = names.get(JSON.stringify(schema));
      if (name) return name;
      // The library emits z.any() for `not`; in an intersected branch that
      // widens the inferred field to any. unknown keeps the other branch's type.
      const negated =
        Object.keys(schema).length === 1 &&
        names.get(JSON.stringify(schema.not));
      if (negated)
        return `z.unknown().refine((value) => !${negated}.safeParse(value).success, "Invalid input: Should NOT be valid against schema")`;
      return undefined;
    },
  };
}
