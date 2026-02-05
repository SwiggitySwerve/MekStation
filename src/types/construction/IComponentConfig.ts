/**
 * Base interface for component configurations.
 * All component configs share a `type` property that determines the component variant.
 *
 * @template TType - The type enum for this component category
 *
 * @example
 * // Engine configuration extends base with specific properties
 * interface IEngineConfiguration extends IComponentConfig<EngineType> {
 *   readonly rating: number;
 *   readonly integralHeatSinks: number;
 * }
 *
 * @example
 * // Gyro configuration
 * interface IGyroConfiguration extends IComponentConfig<GyroType> {
 *   readonly weight: number;
 * }
 *
 * @example
 * // Heat sink configuration
 * interface IHeatSinkConfiguration extends IComponentConfig<HeatSinkType> {
 *   readonly total: number;
 *   readonly integrated: number;
 *   readonly external: number;
 * }
 */
export interface IComponentConfig<TType extends string = string> {
  /** The type/variant of this component */
  readonly type: TType;
}

/**
 * Component configuration with weight.
 * Many components track their weight for tonnage calculations.
 *
 * @template TType - The type enum for this component category
 *
 * @example
 * // Gyro with weight
 * interface IGyroConfiguration extends IWeightedComponent<GyroType> {
 *   // inherits: type, weight
 * }
 */
export interface IWeightedComponent<
  TType extends string = string,
> extends IComponentConfig<TType> {
  /** Weight of this component in tons */
  readonly weight: number;
}

/**
 * Component configuration with critical slots.
 * Many components occupy critical slots in locations.
 *
 * @template TType - The type enum for this component category
 *
 * @example
 * // Weapon with critical slots
 * interface IWeaponConfiguration extends ISlottedComponent<WeaponType> {
 *   readonly damage: number;
 *   readonly range: number;
 *   // inherits: type, criticalSlots
 * }
 */
export interface ISlottedComponent<
  TType extends string = string,
> extends IComponentConfig<TType> {
  /** Number of critical slots this component occupies */
  readonly criticalSlots: number;
}
