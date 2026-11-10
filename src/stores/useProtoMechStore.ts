import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  addGeneratedMountedEquipment,
  clearMountedEquipment,
  linkMountedAmmo,
  removeMountedEquipment,
  updateMountedEquipment,
} from '@/stores/equipmentStoreActions';
import {
  createUnitStorePersistOptions,
  createUnitIdentityActions,
  modificationPatch,
} from '@/stores/unitStoreIdentityActions';
import { IEquipmentItem } from '@/types/equipment';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  allocateProtoArmor,
  setProtoArmorEquipment,
  computeProtoEngineRating,
  computeRunMP,
  computeProtoStructure,
  computeProtoWalkMPForRating,
  clampProtoMovement,
  getProtoWeightClass,
  PROTO_JUMP_JET_TYPE,
  PROTO_MAX_TONNAGE,
  PROTO_MIN_TONNAGE,
  protoChassisCanJump,
  protoJumpLimit,
  protoMaxJumpMP,
  protoTonnageChangeError,
  readProtoJumpJetType,
  reconcileProtoJumpMounts,
  setProtoJumpMounts,
} from '@/utils/construction/protomech';
import { generateUnitId } from '@/utils/uuid';

import { BV_AFFECTING_KEYS } from './protoMechBvKeys';
import {
  ProtoMechState,
  ProtoMechStore,
  CreateProtoMechOptions,
  computeProtoMechBVFromState,
  createDefaultProtoMechState,
  createProtoMechMountedEquipment,
  createEmptyProtoMechArmorAllocation,
} from './protoMechState';
import {
  pickPersistedProtoMechState,
  withUnitLibraryReceipt,
} from './unitDraftPersistence';

export type { ProtoMechStore } from './protoMechState';

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
/**
 * One tonnage range, 2–15 t, for every motive: MegaMekLab's spinner is
 * `SpinnerNumberModel(2, 2, 15, 1)` (PMChassisView.java:79). Ultraheavy is a mass above
 * TestProtoMek.MAX_STD_TONNAGE (9), not a chassis (PMChassisView.java:205-207), so the
 * range does not depend on the motive.
 */
function clampProtoTonnage(tonnage: number): number {
  return Math.max(PROTO_MIN_TONNAGE, Math.min(PROTO_MAX_TONNAGE, tonnage));
}

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

          ...createUnitIdentityActions<ProtoMechStore>(set),

          // =================================================================
          // Classification Actions
          // =================================================================

          // MML keeps the walk on a tonnage edit and refuses the edit when the engine
          // rating would be invalid (PMStructureTab.java:446-456); like setEngineRating,
          // a refusal throws with the reason and leaves the store untouched.
          setTonnage: (tonnage) =>
            set((state) => {
              const clampedTonnage = clampProtoTonnage(tonnage);
              const refusal = protoTonnageChangeError(
                clampedTonnage,
                state.walkMP,
                state.chassisType,
              );
              if (refusal !== undefined) throw new RangeError(refusal);
              return {
                tonnage: clampedTonnage,
                // The stored class is persisted and written into the saved record.
                weightClass: getProtoWeightClass(clampedTonnage),
                structureByLocation: computeProtoStructure(
                  clampedTonnage,
                  state.chassisType,
                  state.hasMainGun,
                ),
                engineRating: computeProtoEngineRating(
                  clampedTonnage,
                  state.walkMP,
                  state.chassisType,
                ),
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

          setChassisType: (chassisType) =>
            set((state) => {
              // The tonnage range is the same for every motive, so it is kept.
              const tonnage = state.tonnage;
              // MML refreshes the movement spinners on a motive change: walk to the
              // motive's minimum, jump to its limit (a glider's is 0).
              const { walk: walkMP, jump } = clampProtoMovement({
                walk: state.walkMP,
                jump: state.jumpMP,
                tonnage,
                chassis: chassisType,
                equipment: state.equipment,
              });
              const glidingWings =
                chassisType === ProtoChassis.GLIDER
                  ? state.glidingWings
                  : false;
              return {
                chassisType,
                tonnage,
                structureByLocation: computeProtoStructure(
                  tonnage,
                  chassisType,
                  state.hasMainGun,
                ),
                walkMP,
                cruiseMP: walkMP,
                flankMP: computeRunMP(walkMP, state.hasMyomerBooster),
                engineRating: computeProtoEngineRating(
                  tonnage,
                  walkMP,
                  chassisType,
                ),
                jumpMP: jump,
                equipment: reconcileProtoJumpMounts(
                  state.equipment,
                  state.jumpMP,
                  jump,
                  generateUnitId,
                ),
                glidingWings,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          // =================================================================
          // Movement Actions
          // =================================================================

          setEngineRating: (engineRating) =>
            set((state) => {
              const walkMP = computeProtoWalkMPForRating(
                state.tonnage,
                engineRating,
                state.chassisType,
                state.walkMP,
              );
              return {
                engineRating,
                walkMP,
                cruiseMP: walkMP,
                flankMP: computeRunMP(walkMP, state.hasMyomerBooster),
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          setCruiseMP: (cruiseMP) =>
            set((state) => {
              const walkMP = Math.max(1, cruiseMP);
              return {
                walkMP,
                cruiseMP: walkMP,
                flankMP: computeRunMP(walkMP, state.hasMyomerBooster),
                engineRating: computeProtoEngineRating(
                  state.tonnage,
                  walkMP,
                  state.chassisType,
                ),
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          setWalkMP: (mp) =>
            set((state) => {
              // MML limits walk to the motive minimum and the engine, and snaps jump
              // down when walk drops below it (MovementView.java:370-371).
              const { walk: walkMP, jump: jumpMP } = clampProtoMovement({
                walk: mp,
                jump: state.jumpMP,
                tonnage: state.tonnage,
                chassis: state.chassisType,
                equipment: state.equipment,
              });
              return {
                walkMP,
                jumpMP,
                equipment: reconcileProtoJumpMounts(
                  state.equipment,
                  state.jumpMP,
                  jumpMP,
                  generateUnitId,
                ),
                cruiseMP: walkMP,
                flankMP: computeRunMP(walkMP, state.hasMyomerBooster),
                engineRating: computeProtoEngineRating(
                  state.tonnage,
                  walkMP,
                  state.chassisType,
                ),
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          // The jump MP is the number of jump-jet mounts (PMStructureTab.jumpChanged
          // :584-624): a change makes the mounts of the current type match. A UMU
          // loadout is shown, not edited, until Battle Value has a UMU input.
          setJumpMP: (count) =>
            set((state) => {
              if (
                readProtoJumpJetType(state.equipment) ===
                PROTO_JUMP_JET_TYPE.UMU
              )
                return {};
              const jumpMP = Math.max(
                0,
                Math.min(
                  count,
                  protoJumpLimit(
                    state.walkMP,
                    state.chassisType,
                    state.equipment,
                  ),
                ),
              );
              return {
                jumpMP,
                equipment: reconcileProtoJumpMounts(
                  state.equipment,
                  state.jumpMP,
                  jumpMP,
                  generateUnitId,
                ),
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          // The Jump Type combo and spinner together (PMStructureTab.jumpTypeChanged
          // :627-637): other types' mounts go, then the jump is re-created as `type`
          // and clamped to that type's limit (a glider's is 0).
          setJumpJets: ({ type, count }) =>
            set((state) => {
              if (
                readProtoJumpJetType(state.equipment) ===
                PROTO_JUMP_JET_TYPE.UMU
              )
                return {};
              const limit = protoChassisCanJump(state.chassisType)
                ? protoMaxJumpMP(
                    state.walkMP,
                    type === PROTO_JUMP_JET_TYPE.EXTENDED,
                  )
                : 0;
              const jumpMP = Math.max(0, Math.min(count, limit));
              return {
                jumpMP,
                equipment: setProtoJumpMounts(
                  state.equipment,
                  type,
                  jumpMP,
                  generateUnitId,
                ),
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          // =================================================================
          // Structure & Armor Actions
          // =================================================================

          setArmorType: (armorType) =>
            set((state) => ({
              armorType,
              equipment: setProtoArmorEquipment(
                armorType,
                state.equipment,
                `${state.id}-edp-armor`,
              ),
              ...modificationPatch(),
            })),

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
              return {
                armorByLocation: allocateProtoArmor(
                  state.tonnage,
                  state.hasMainGun,
                  state.chassisType,
                  state.structureByLocation,
                ),
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          clearAllArmor: () =>
            set({
              armorByLocation: createEmptyProtoMechArmorAllocation(),
              ...modificationPatch(),
            }),

          // =================================================================
          // Main Gun Actions
          // =================================================================

          setMainGun: (hasMainGun) =>
            set((state) => ({
              hasMainGun,
              structureByLocation: computeProtoStructure(
                state.tonnage,
                state.chassisType,
                hasMainGun,
              ),
              // Clear the weapon ID when disabling the main gun mount
              mainGunWeaponId: hasMainGun ? undefined : undefined,
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

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
              return {
                hasMyomerBooster,
                flankMP: computeRunMP(state.walkMP, hasMyomerBooster),
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

          addEquipment: (item: IEquipmentItem, location?) =>
            addGeneratedMountedEquipment(set, (instanceId) =>
              createProtoMechMountedEquipment(item, instanceId, location),
            ),

          removeEquipment: (instanceId: string) =>
            set((state) =>
              removeMountedEquipment(state, instanceId, (e) => e.id),
            ),

          updateEquipmentLocation: (instanceId: string, location) =>
            set((state) =>
              updateMountedEquipment(
                state,
                instanceId,
                (e) => e.id,
                (e) => ({
                  ...e,
                  location,
                }),
              ),
            ),

          linkAmmo: (
            weaponInstanceId: string,
            ammoInstanceId: string | undefined,
          ) =>
            set((state) =>
              linkMountedAmmo(
                state,
                weaponInstanceId,
                ammoInstanceId,
                (e) => e.id,
              ),
            ),

          clearAllEquipment: () => set(clearMountedEquipment()),

          // =================================================================
          // Metadata Actions
          // =================================================================

          markModified: (modified = true) => set(modificationPatch(modified)),

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
      createUnitStorePersistOptions(
        `megamek-protomech-${initialState.id}`,
        withUnitLibraryReceipt((state: ProtoMechStore) =>
          pickPersistedProtoMechState(state),
        ),
      ),
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
    throw new Error('Missing ProtoMechStoreContext provider.');
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire ProtoMech store API
 */
export function useProtoMechStoreApi(): StoreApi<ProtoMechStore> {
  const store = useContext(ProtoMechStoreContext);

  if (!store) {
    throw new Error('Missing ProtoMechStoreContext provider.');
  }

  return store;
}
