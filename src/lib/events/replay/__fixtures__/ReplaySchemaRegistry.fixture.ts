import { z } from 'zod';

import { type IReplayEventSchemaRegistration } from '../ReplaySchemaRegistry';

const syntheticV1 = z
  .object({ label: z.string(), tags: z.array(z.string()) })
  .strict();
const syntheticV2 = syntheticV1.extend({ count: z.number() });
const syntheticV3 = syntheticV2.extend({ active: z.boolean() });
const SYNTHETIC_SCHEMAS: IReplayEventSchemaRegistration['schemas'] = [
  {
    schemaVersion: 1,
    schemaId: 'synthetic.unit-added.v1',
    parse: (payload) => syntheticV1.parse(payload),
  },
  {
    schemaVersion: 2,
    schemaId: 'synthetic.unit-added.v2',
    parse: (payload) => syntheticV2.parse(payload),
  },
  {
    schemaVersion: 3,
    schemaId: 'synthetic.unit-added.v3',
    parse: (payload) => syntheticV3.parse(payload),
  },
];
export const SYNTHETIC_EVENT: IReplayEventSchemaRegistration = {
  eventType: 'synthetic.unit-added',
  targetSchemaVersion: 3,
  schemas: SYNTHETIC_SCHEMAS,
  transitions: [
    {
      fromVersion: 1,
      toVersion: 2,
      transitionId: 'synthetic.unit-added.1-to-2',
      upcast: (payload) => ({
        ...(payload as z.infer<typeof syntheticV1>),
        count: 0,
      }),
    },
    {
      fromVersion: 2,
      toVersion: 3,
      transitionId: 'synthetic.unit-added.2-to-3',
      upcast: (payload) => ({
        ...(payload as z.infer<typeof syntheticV2>),
        active: true,
      }),
    },
  ],
};
