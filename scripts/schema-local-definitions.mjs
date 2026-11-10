import { jsonSchemaToZod } from 'json-schema-to-zod';

/** Resolve only supplied schemas; share definitions without fetching references. */
export function prepareSchemaDefinitions(input, referencedSchemas = []) {
  const documents = new Map();
  const prefixes = new Map([[input, 'SchemaDef_']]);
  for (const [index, document] of referencedSchemas.entries()) {
    if (typeof document.$id !== 'string' || documents.has(document.$id))
      throw new Error(
        'Unsupported or duplicate schema identity: ' + document.$id,
      );
    documents.set(document.$id, document);
    prefixes.set(document, `SchemaRef_${index}_`);
  }
  if (input.$id) documents.set(input.$id, input);
  const names = new Map();
  const declarations = [];
  const resolved = new Map();
  const active = new Set();
  function definition(document, key) {
    const value = key === undefined ? document : document.$defs?.[key];
    if (!value || (key !== undefined && !/^\w+$/.test(key)))
      throw new Error('Unsupported schema definition: ' + key);
    const name = prefixes.get(document) + (key ?? '$Root');
    if (resolved.has(name)) return resolved.get(name);
    if (active.has(name)) throw new Error('Cyclic schema reference: ' + name);
    if (key !== undefined) {
      const stringEnum =
        Array.isArray(value.enum) &&
        value.enum.length > 0 &&
        value.enum.every((item) => typeof item === 'string') &&
        (!('type' in value) || value.type === 'string') &&
        Object.keys(value).every((keyword) =>
          ['type', 'enum', 'description'].includes(keyword),
        );
      if (
        !stringEnum &&
        ('enum' in value || !['object', 'array'].includes(value.type))
      )
        throw new Error('Unsupported local definition: ' + key);
    }
    active.add(name);
    const schema = resolve(value, document);
    const identity = JSON.stringify(schema);
    // Children are resolved first, so declarations appear before their users.
    declarations.push(
      `const ${name} = ${jsonSchemaToZod(schema, { parserOverride })};`,
    );
    names.set(identity, name);
    resolved.set(name, schema);
    active.delete(name);
    return schema;
  }
  function resolve(value, document) {
    if (Array.isArray(value))
      return value.map((child) => resolve(child, document));
    if (!value || typeof value !== 'object') return value;
    if ('$ref' in value) {
      const [uri, fragment, extra] =
        typeof value.$ref === 'string' ? value.$ref.split('#') : [];
      const target = uri === '' ? document : documents.get(uri);
      const key = fragment?.startsWith('/$defs/')
        ? fragment.slice('/$defs/'.length)
        : undefined;
      if (
        !target ||
        extra !== undefined ||
        (fragment !== undefined &&
          fragment !== '' &&
          fragment !== '/$defs/' + key) ||
        (key !== undefined && !Object.hasOwn(target.$defs ?? {}, key)) ||
        Object.keys(value).length !== 1
      )
        throw new Error('Unsupported schema reference: ' + value.$ref);
      return structuredClone(definition(target, key));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key === '$defs'
          ? Object.fromEntries(
              Object.keys(child).map((name) => [
                name,
                definition(document, name),
              ]),
            )
          : resolve(child, document),
      ]),
    );
  }
  function parserOverride(schema) {
    const name = names.get(JSON.stringify(schema));
    if (name) return name;
    const key = names.get(JSON.stringify(schema.propertyNames));
    const value = names.get(JSON.stringify(schema.additionalProperties));
    if (schema.type === 'object' && key && value) {
      const description = schema.description
        ? `.describe(${JSON.stringify(schema.description)})`
        : '';
      return `z.partialRecord(${key}, ${value})${description}`;
    }
    // json-schema-to-zod does not implement propertyNames/minProperties.
    // Keep native-name maps strict in both languages rather than dropping them.
    // Existing enum-keyed scalar maps retain their byte-identical output.
    if (
      schema.type === 'object' &&
      !schema.properties &&
      schema.propertyNames &&
      !key
    ) {
      const allowed = [
        '$schema',
        '$id',
        '$defs',
        'title',
        'description',
        'type',
        'propertyNames',
        'additionalProperties',
        'minProperties',
        'maxProperties',
      ];
      if (
        Object.keys(schema).some((keyword) => !allowed.includes(keyword)) ||
        !schema.additionalProperties ||
        typeof schema.additionalProperties !== 'object'
      )
        throw new Error('Unsupported constrained schema record');
      let code = `z.record(${jsonSchemaToZod(schema.propertyNames, { parserOverride })}, ${jsonSchemaToZod(schema.additionalProperties, { parserOverride })})`;
      for (const [keyword, comparison] of [
        ['minProperties', '>='],
        ['maxProperties', '<='],
      ]) {
        if (schema[keyword] !== undefined)
          code += `.refine((value) => Object.keys(value).length ${comparison} ${schema[keyword]}, ${JSON.stringify(keyword)})`;
      }
      if (schema.description)
        code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    // The library emits z.any() for `not`; in an intersected branch that
    // widens the inferred field to any. unknown keeps the other branch's type.
    const negated =
      Object.keys(schema).length === 1 && names.get(JSON.stringify(schema.not));
    if (negated)
      return `z.unknown().refine((value) => !${negated}.safeParse(value).success, "Invalid input: Should NOT be valid against schema")`;
    return undefined;
  }
  // Preserve existing enum declaration order, including unused definitions.
  for (const key of Object.keys(input.$defs ?? {})) definition(input, key);
  const schema = resolve(input, input);
  return {
    schema,
    declarations: declarations.join('\n'),
    parserOverride,
  };
}
