import { z } from 'zod';

import { GM_CORRECTION_LEAF_CARRIERS } from '../GmCorrectionLeafPolicy';
import { gmReplayCorrectionEffectSchema } from '../GmReplayCorrectionSchema';

function leaves(schema: z.ZodType, path: string): string[] {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return leaves(schema.unwrap() as z.ZodType, path);
  if (schema instanceof z.ZodObject)
    return Object.entries(schema.shape).flatMap(([key, member]) => leaves(member as z.ZodType, `${path}.${key}`));
  if (schema instanceof z.ZodRecord)
    return leaves(schema.valueType as z.ZodType, `${path}.*`);
  if (schema instanceof z.ZodArray)
    return leaves(schema.element as z.ZodType, `${path}[]`);
  return [path];
}

describe('R10 closed correction leaf coverage', () => {
  it.each(gmReplayCorrectionEffectSchema.options)(
    'assigns every after leaf and clear key an explicit approved carrier or refusal',
    (effect) => {
      const family = effect.shape.family.value;
      const actual = leaves(effect.shape.after, 'after');
      if ('clear' in effect.shape) {
        const clear = effect.shape.clear.unwrap().element;
        const keys = clear instanceof z.ZodLiteral ? [clear.value] : clear.options;
        actual.push(...keys.map(key => `clear.${key}`));
      }
      const rows = GM_CORRECTION_LEAF_CARRIERS[family];
      expect([...actual].sort()).toStrictEqual(Object.keys(rows).sort());
      expect(Object.values(rows).every(carrier => carrier.length > 0)).toBe(true);
    },
  );
});
