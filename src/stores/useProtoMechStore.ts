/**
 * ProtoMech Store Factory
 *
 * Creates isolated Zustand stores for individual ProtoMech units.
 * Each ProtoMech has its own store instance with independent persistence.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  effectiveWalkMP,
  getProtoMPCaps,
  getProtoWeightClass,
} from '@/utils/construction/protomech';
import { generateUnitId } from '@/utils/uuid';

import {
  ProtoMechState,
  ProtoMechStore,
  CreateProtoMechOptions,
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
  createProtoMechMountedEquipment,
  createEmptyProtoMechArmorAllocation,
} from './protoMechState';

// Re-export types for convenience
export type { ProtoMechStore } from './protoMechState';

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Fields whose mutation invalidates a ProtoMech's BV breakdown. Any setter
 * that changes one of these will trigger a recomputeBV refresh after the
 * base `set` completes. Listed explicitly so that non-BV changes (e.g.
 * `setName`) do not pay the BV recalculation cost.
 */
const BV_AFFECTING_KEYS: ReadonlyArray<keyof ProtoMechState> = [
  'tonnage',
  'weightClass',
  'chassisType',
  'pointSize',
  'walkMP',
  'cruiseMP',
  'flankMP',
  'jumpMP',
  'engineRating',
  'armorByLocation',
  'structureByLocation',
  'armorType',
  'hasMainGun',
  'mainGunWeaponId',
  'hasMyomerBooster',
  'glidingWings',
  'equipment',
];

/**
 * Create an isolated Zustand store for a single ProtoMech unit.
 *
 * This factory installs a BV-aware `set` wrapper that refreshes
 * `state.bvBreakdown` whenever a BV-affecting field changes. The recompute
 * is intentionally synchronous so the breakdown is always consistent with
 * the latest state — force-level tools and the parity harness depend on it.
 *
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 *       — Requirement: ProtoMech BV Breakdown on Unit State
 */
export function createProtoMechStore(
  initialState: ProtoMechState,
): StoreApi<ProtoMechStore> {
  // Seed the breakdown from the initial state so the store ships a valid BV
  // from construction time — consumers never see an `undefined` breakdown
  // during the first render.
  const seededInitialState: ProtoMechState = {
    ...initialState,
    bvBreakdown:
      initialState.bvBreakdown ?? computeProtoMechBVFromState(initialState),
  };

  return create<ProtoMechStore>()(
    persist(
      (baseSet, _get) => {
        /**
         * BV-aware set: after delegating to zustand's `baseSet`, if the post-
         * update state differs on any BV-affecting field, recompute and store
         * a fresh breakdown in the SAME tick. This keeps `bvBreakdown` as a
         * derived-but-persisted field: callers can either read it directly
         * from state or selector-subscribe to it and it stays in sync.
         */
        const set: typeof baseSet = ((partial, replace) => {
          // Snapshot the relevant fields before the update.
          const before = _get();
          // Delegate to the real zustand setter first.
          (baseSet as (p: unknown, r?: boolean) => void)(partial, replace);
          const after = _get();

          let bvDirty = false;
          for (const key of BV_AFFECTING_KEYS) {
            if (before[key] !== after[key]) {
              bvDirty = true;
              break;
            }
          }

          if (bvDirty) {
            const nextBreakdown = computeProtoMechBVFromState(after);
            (baseSet as (p: Partial<ProtoMechState>) => void)({
              bvBreakdown: nextBreakdown,
            });
          }
        }) as typeof baseSet;

        return {
          // Spread seeded initial state (includes a computed bvBreakdown)
          ...seededInitialState,

          // =================================================================
          // Identity Actions
          // =================================================================

          setName: (name) =>
            set({
              name,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setChassis: (chassis) =>
            set((state) => ({
              chassis,
              name: `${chassis}${state.model ? ' ' + state.model : ''}`,
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          setModel: (model) =>
            set((state) => ({
              model,
              name: `${state.chassis}${model ? ' ' + model : ''}`,
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          setMulId: (mulId) =>
            set({
              mulId,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setYear: (year) =>
            set({
              year,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setRulesLevel: (rulesLevel) =>
            set({
              rulesLevel,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Classification Actions
          // =================================================================

          setTonnage: (tonnage) =>
            set((_state) => {
              const clampedTonnage = Math.max(2, Math.min(9, tonnage));
              const newCruiseMP = Math.max(1, 10 - clampedTonnage);
              return {
                tonnage: clampedTonnage,
                cruiseMP: newCruiseMP,
                flankMP: Math.floor(newCruiseMP * 1.5),
                engineRating: clampedTonnage * newCruiseMP,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          setPointSize: (pointSize) =>
            set({
              pointSize: Math.max(1, Math.min(5, pointSize)),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setQuad: (isQuad) =>
            set({
              isQuad,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setGlider: (isGlider) =>
            set({
              isGlider,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setChassisType: (chassisType) =>
            set((state) => {
              const weightClass = getProtoWeightClass(state.tonnage);
              const caps = getProtoMPCaps(weightClass);
              // Clamp walk MP to new caps
              const walkMP = Math.min(state.walkMP, caps.walkMax);
              const effWalk = effectiveWalkMP(walkMP, state.hasMyomerBooster);
              // Ultraheavy cannot jump; Glider gains +2 via effectiveJumpMP at display time
              const jumpMP =
                chassisType === ProtoChassis.ULTRAHEAVY ? 0 : state.jumpMP;
              // Gliding wings only valid on Glider chassis
              const glidingWings =
                chassisType === ProtoChassis.GLIDER
                  ? state.glidingWings
                  : false;
              return {
                chassisType,
                isQuad: chassisType === ProtoChassis.QUAD,
                isGlider: chassisType === ProtoChassis.GLIDER,
                walkMP,
                cruiseMP: walkMP,
                flankMP: effWalk + 1,
                engineRating: state.tonnage * walkMP,
                jumpMP,
                glidingWings,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          // =================================================================
          // Movement Actions
          // =================================================================

          setEngineRating: (engineRating) =>
            set((state) => ({
              engineRating,
              cruiseMP: Math.floor(engineRating / state.tonnage),
              flankMP: Math.floor((engineRating / state.tonnage) * 1.5),
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          setCruiseMP: (cruiseMP) =>
            set((state) => ({
              cruiseMP: Math.max(1, cruiseMP),
              flankMP: Math.floor(cruiseMP * 1.5),
              engineRating: state.tonnage * cruiseMP,
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          setWalkMP: (mp) =>
            set((state) => {
              const weightClass = getProtoWeightClass(state.tonnage);
              const caps = getProtoMPCaps(weightClass);
              // Clamp to [1, cap]
              const walkMP = Math.max(1, Math.min(mp, caps.walkMax));
              const effWalk = effectiveWalkMP(walkMP, state.hasMyomerBooster);
              return {
                walkMP,
                cruiseMP: walkMP,
                flankMP: effWalk + 1,
                engineRating: state.tonnage * walkMP,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          setJumpMP: (jumpMP) =>
            set({
              jumpMP: Math.max(0, jumpMP),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Structure & Armor Actions
          // =================================================================

          setArmorType: (armorType) =>
            set({
              armorType,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setLocationArmor: (location, points) =>
            set((state) => ({
              armorByLocation: {
                ...state.armorByLocation,
                [location]: Math.max(0, points),
              },
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          setLocationStructure: (location, points) =>
            set((state) => ({
              structureByLocation: {
                ...state.structureByLocation,
                [location]: Math.max(0, points),
              },
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          autoAllocateArmor: () =>
            set((state) => {
              // ProtoMechs get armor based on tonnage
              const maxArmor = state.tonnage * 6; // Simplified calculation
              const torsoPercent = 0.35;
              const legsPercent = 0.25;
              const armPercent = 0.1;
              const headPercent = 0.1;

              return {
                armorByLocation: {
                  [ProtoMechLocation.HEAD]: Math.floor(maxArmor * headPercent),
                  [ProtoMechLocation.TORSO]: Math.floor(
                    maxArmor * torsoPercent,
                  ),
                  [ProtoMechLocation.LEFT_ARM]: Math.floor(
                    maxArmor * armPercent,
                  ),
                  [ProtoMechLocation.RIGHT_ARM]: Math.floor(
                    maxArmor * armPercent,
                  ),
                  [ProtoMechLocation.LEGS]: Math.floor(maxArmor * legsPercent),
                  [ProtoMechLocation.MAIN_GUN]: state.hasMainGun ? 2 : 0,
                },
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          clearAllArmor: () =>
            set({
              armorByLocation: createEmptyProtoMechArmorAllocation(),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Main Gun Actions
          // =================================================================

          setMainGun: (hasMainGun) =>
            set({
              hasMainGun,
              // Clear the weapon ID when disabling the main gun mount
              mainGunWeaponId: hasMainGun ? undefined : undefined,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setMainGunWeaponId: (weaponId) =>
            set({
              // null means "clear"; store as undefined for JSON cleanliness
              mainGunWeaponId: weaponId ?? undefined,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Special System Actions
          // =================================================================

          setMyomerBooster: (hasMyomerBooster) =>
            set((state) => {
              // Recompute flank MP because the booster changes effective walk
              const effWalk = effectiveWalkMP(state.walkMP, hasMyomerBooster);
              return {
                hasMyomerBooster,
                flankMP: effWalk + 1,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          setMagneticClamps: (hasMagneticClamps) =>
            set({
              hasMagneticClamps,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setExtendedTorsoTwist: (hasExtendedTorsoTwist) =>
            set({
              hasExtendedTorsoTwist,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setGlidingWings: (glidingWings) =>
            set({
              glidingWings,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Equipment Actions
          // =================================================================

          addEquipment: (item: IEquipmentItem, location?) => {
            const instanceId = generateUnitId();
            const mountedEquipment = createProtoMechMountedEquipment(
              item,
              instanceId,
              location,
            );

            set((state) => ({
              equipment: [...state.equipment, mountedEquipment],
              isModified: true,
              lastModifiedAt: Date.now(),
            }));

            return instanceId;
          },

          removeEquipment: (instanceId: string) =>
            set((state) => ({
              equipment: state.equipment.filter((e) => e.id !== instanceId),
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          updateEquipmentLocation: (instanceId: string, location) =>
            set((state) => ({
              equipment: state.equipment.map((e) =>
                e.id === instanceId ? { ...e, location } : e,
              ),
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          linkAmmo: (
            weaponInstanceId: string,
            ammoInstanceId: string | undefined,
          ) =>
            set((state) => ({
              equipment: state.equipment.map((e) =>
                e.id === weaponInstanceId
                  ? { ...e, linkedAmmoId: ammoInstanceId }
                  : e,
              ),
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          clearAllEquipment: () =>
            set({
              equipment: [],
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Metadata Actions
          // =================================================================

          markModified: (modified = true) =>
            set({
              isModified: modified,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // BV Actions
          // =================================================================

          // Force a BV recompute from the current state. Useful after bulk
          // updates (e.g. imports) or when a consumer needs a fresh breakdown
          // outside the normal setter flow. Writes through `baseSet` directly
          // to bypass the dirtiness check — the caller is explicitly asking.
          recomputeBV: () => {
            const next = computeProtoMechBVFromState(_get());
            (baseSet as (p: Partial<ProtoMechState>) => void)({
              bvBreakdown: next,
            });
          },
        };
      },
      {
        name: `megamek-protomech-${initialState.id}`,
        storage: createJSONStorage(() => clientSafeStorage),
        skipHydration: true,
        partialize: (state) => ({
          id: state.id,
          name: state.name,
          chassis: state.chassis,
          model: state.model,
          mulId: state.mulId,
          year: state.year,
          rulesLevel: state.rulesLevel,
          techBase: state.techBase,
          unitType: state.unitType,
          tonnage: state.tonnage,
          weightClass: state.weightClass,
          chassisType: state.chassisType,
          pointSize: state.pointSize,
          isQuad: state.isQuad,
          isGlider: state.isGlider,
          engineRating: state.engineRating,
          walkMP: state.walkMP,
          cruiseMP: state.cruiseMP,
          flankMP: state.flankMP,
          jumpMP: state.jumpMP,
          structureByLocation: state.structureByLocation,
          armorByLocation: state.armorByLocation,
          armorType: state.armorType,
          hasMainGun: state.hasMainGun,
          mainGunWeaponId: state.mainGunWeaponId,
          hasMyomerBooster: state.hasMyomerBooster,
          glidingWings: state.glidingWings,
          hasMagneticClamps: state.hasMagneticClamps,
          hasExtendedTorsoTwist: state.hasExtendedTorsoTwist,
          equipment: state.equipment,
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
          // Persist the last-computed BV breakdown so hydrated sessions read
          // the same value the parity harness would produce. Stale copies are
          // rewritten on the first BV-affecting mutation.
          bvBreakdown: state.bvBreakdown,
        }),
      },
    ),
  );
}

/**
 * Create a new ProtoMech store from options
 */
export function createNewProtoMechStore(
  options: CreateProtoMechOptions,
): StoreApi<ProtoMechStore> {
  const initialState = createDefaultProtoMechState(options);
  return createProtoMechStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active ProtoMech's store
 */
export const ProtoMechStoreContext =
  createContext<StoreApi<ProtoMechStore> | null>(null);

/**
 * Hook to access the ProtoMech store from context
 */
export function useProtoMechStore<T>(
  selector: (state: ProtoMechStore) => T,
): T {
  const store = useContext(ProtoMechStoreContext);

  if (!store) {
    throw new Error(
      'useProtoMechStore must be used within a ProtoMechStoreProvider. ' +
        'Wrap your component tree with <ProtoMechStoreContext.Provider>.',
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire ProtoMech store API
 */
export function useProtoMechStoreApi(): StoreApi<ProtoMechStore> {
  const store = useContext(ProtoMechStoreContext);

  if (!store) {
    throw new Error(
      'useProtoMechStoreApi must be used within a ProtoMechStoreProvider.',
    );
  }

  return store;
}
