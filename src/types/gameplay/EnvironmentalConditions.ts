export type LightCondition = 'daylight' | 'dusk' | 'dawn' | 'night';

export type PrecipitationCondition =
  | 'none'
  | 'light_rain'
  | 'heavy_rain'
  | 'snow';

export type FogCondition = 'none' | 'light_fog' | 'heavy_fog';

export type WindCondition = 'none' | 'moderate' | 'strong';

export type AtmosphereCondition = 'standard' | 'thin' | 'trace' | 'vacuum';

export type TemperatureCondition = 'extreme_cold' | 'normal' | 'extreme_heat';

export interface IEnvironmentalConditions {
  readonly light: LightCondition;
  readonly precipitation: PrecipitationCondition;
  readonly fog: FogCondition;
  readonly wind: WindCondition;
  readonly gravity: number;
  readonly atmosphere: AtmosphereCondition;
  readonly temperature: TemperatureCondition;
}
