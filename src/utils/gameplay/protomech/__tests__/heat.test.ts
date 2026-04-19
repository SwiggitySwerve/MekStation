/**
 * ProtoMech heat tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/protomech-unit-system/spec.md
 *   #requirement protomech-heat-rules
 */

import {
  PROTO_BASE_HEAT_SINKS,
  PROTO_SHUTDOWN_THRESHOLD,
  getProtoHeatModel,
  protoHeatTriggersShutdownCheck,
} from '../heat';

describe('constants', () => {
  it('2 base heat sinks', () => {
    expect(PROTO_BASE_HEAT_SINKS).toBe(2);
  });
  it('shutdown threshold 4', () => {
    expect(PROTO_SHUTDOWN_THRESHOLD).toBe(4);
  });
});

describe('getProtoHeatModel', () => {
  it('default (no extras) = 2 total sinks', () => {
    const m = getProtoHeatModel();
    expect(m.baseHeatSinks).toBe(2);
    expect(m.extraHeatSinks).toBe(0);
    expect(m.totalHeatSinks).toBe(2);
    expect(m.shutdownThreshold).toBe(4);
  });

  it('3 extras → 5 total', () => {
    const m = getProtoHeatModel(3);
    expect(m.totalHeatSinks).toBe(5);
    expect(m.extraHeatSinks).toBe(3);
  });

  it('negative extras clamped to 0', () => {
    const m = getProtoHeatModel(-5);
    expect(m.extraHeatSinks).toBe(0);
    expect(m.totalHeatSinks).toBe(2);
  });

  it('fractional extras floored', () => {
    const m = getProtoHeatModel(2.7);
    expect(m.extraHeatSinks).toBe(2);
  });
});

describe('protoHeatTriggersShutdownCheck', () => {
  it('true when heat >= 4', () => {
    expect(protoHeatTriggersShutdownCheck(4)).toBe(true);
    expect(protoHeatTriggersShutdownCheck(5)).toBe(true);
    expect(protoHeatTriggersShutdownCheck(10)).toBe(true);
  });
  it('false when heat < 4', () => {
    expect(protoHeatTriggersShutdownCheck(0)).toBe(false);
    expect(protoHeatTriggersShutdownCheck(3)).toBe(false);
  });
});
