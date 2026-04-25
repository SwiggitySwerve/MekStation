/**
 * Quad ProtoMech hit-location remap tests.
 *
 * Quad protos replace the standard biped arms with front legs and replace the
 * standard `Legs` location with rear legs. This suite locks in the canonical
 * mapping at the `mapSlotToLocation` boundary so a future refactor cannot
 * silently change the chassis-aware behavior.
 *
 * @spec openspec/changes/tier5-audit-cleanup/specs/protomech-unit-system/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { mapSlotToLocation } from '../hitLocation';

describe('mapSlotToLocation — Quad ProtoMech remapping', () => {
  describe('Quad chassis', () => {
    it('remaps right_arm slot to FRONT_LEGS', () => {
      // Quad protos have no arms; arm hit-rolls become front-leg hits.
      expect(mapSlotToLocation('right_arm', ProtoChassis.QUAD, false)).toBe(
        ProtoLocation.FRONT_LEGS,
      );
    });

    it('also remaps left_arm slot to FRONT_LEGS (intentional non-distinction)', () => {
      // Both arm slots collapse to FRONT_LEGS at the slot-mapping layer.
      // This intentionally matches the right-arm remap — quad protos do not
      // distinguish left vs. right front-leg hits at this layer (callers can
      // inspect the original slot if they need attribution).
      expect(mapSlotToLocation('left_arm', ProtoChassis.QUAD, false)).toBe(
        ProtoLocation.FRONT_LEGS,
      );
    });

    it('remaps legs slot to REAR_LEGS', () => {
      // The biped `LEGS` location becomes `REAR_LEGS` on a quad proto.
      expect(mapSlotToLocation('legs', ProtoChassis.QUAD, false)).toBe(
        ProtoLocation.REAR_LEGS,
      );
    });

    it('preserves head and torso slots regardless of chassis', () => {
      // Non-arm/leg slots are unaffected by the quad remap.
      expect(mapSlotToLocation('head', ProtoChassis.QUAD, false)).toBe(
        ProtoLocation.HEAD,
      );
      expect(mapSlotToLocation('torso', ProtoChassis.QUAD, false)).toBe(
        ProtoLocation.TORSO,
      );
    });

    it('falls back main_gun → TORSO when proto has no main gun', () => {
      // Independent of chassis — applies equally to quads and bipeds.
      expect(mapSlotToLocation('main_gun', ProtoChassis.QUAD, false)).toBe(
        ProtoLocation.TORSO,
      );
    });

    it('returns MAIN_GUN slot for quad with main gun installed', () => {
      expect(mapSlotToLocation('main_gun', ProtoChassis.QUAD, true)).toBe(
        ProtoLocation.MAIN_GUN,
      );
    });
  });

  describe('Biped chassis (control group — no remap)', () => {
    it('preserves right_arm slot as RIGHT_ARM', () => {
      expect(mapSlotToLocation('right_arm', ProtoChassis.BIPED, false)).toBe(
        ProtoLocation.RIGHT_ARM,
      );
    });

    it('preserves left_arm slot as LEFT_ARM', () => {
      expect(mapSlotToLocation('left_arm', ProtoChassis.BIPED, false)).toBe(
        ProtoLocation.LEFT_ARM,
      );
    });

    it('preserves legs slot as LEGS (not REAR_LEGS)', () => {
      expect(mapSlotToLocation('legs', ProtoChassis.BIPED, false)).toBe(
        ProtoLocation.LEGS,
      );
    });
  });

  describe('Glider chassis (control group — biped-style mapping)', () => {
    it('preserves arm slots without quad remapping', () => {
      // Per JSDoc: Biped/Glider/Ultraheavy share biped-style mapping.
      expect(mapSlotToLocation('right_arm', ProtoChassis.GLIDER, false)).toBe(
        ProtoLocation.RIGHT_ARM,
      );
      expect(mapSlotToLocation('left_arm', ProtoChassis.GLIDER, false)).toBe(
        ProtoLocation.LEFT_ARM,
      );
      expect(mapSlotToLocation('legs', ProtoChassis.GLIDER, false)).toBe(
        ProtoLocation.LEGS,
      );
    });
  });
});
