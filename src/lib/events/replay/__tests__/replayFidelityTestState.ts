import { deserialize, serialize } from 'node:v8';

/** D8_DIAG_UNDEFINED_OWN_PROPERTY_AS_ABSENT. Preserve the strict V8 image
 * except own properties whose value is exactly undefined, on either side. */
export function replayFidelityState(value: unknown): unknown {
  const cloned: unknown = deserialize(serialize(value));
  function visit(current: unknown): void {
    if (current === null || typeof current !== 'object') return;
    for (const key of Reflect.ownKeys(current)) {
      const child: unknown = Reflect.get(current, key);
      if (child === undefined) Reflect.deleteProperty(current, key);
      else visit(child);
    }
  }
  visit(cloned);
  return cloned;
}
