/**
 * Emit closed Git variants instead of a closed-object/partial-object
 * intersection: Zod 4 drops unknown-key errors reported by only one side.
 * Derive every constraint from the canonical schema; reject unhandled merges.
 */
export function expandSourceProvenanceVariants(schema) {
  const result = structuredClone(schema);
  const source = result.properties.sources.items.properties.source;
  source.anyOf = source.anyOf.flatMap((variant) => {
    if (!variant.anyOf) return [variant];
    if (variant.type !== 'object' || variant.additionalProperties !== false)
      throw new Error('Expected closed provenance variant');
    const { anyOf, ...base } = variant;
    return anyOf.map((constraint) => {
      if (
        constraint.type !== 'object' ||
        Object.keys(constraint).some(
          (key) => !['type', 'required', 'properties'].includes(key),
        )
      )
        throw new Error('Unsupported provenance variant constraint');
      const branch = structuredClone(base);
      branch.required = [
        ...new Set([...(base.required ?? []), ...(constraint.required ?? [])]),
      ];
      for (const [key, rules] of Object.entries(constraint.properties ?? {})) {
        const existing = branch.properties[key];
        if (!existing)
          throw new Error('Provenance constraint has no base property: ' + key);
        for (const [rule, value] of Object.entries(rules)) {
          if (
            rule in existing &&
            JSON.stringify(existing[rule]) !== JSON.stringify(value)
          )
            throw new Error(
              'Conflicting provenance constraint: ' + key + '.' + rule,
            );
          existing[rule] = value;
        }
      }
      return branch;
    });
  });
  return result;
}
