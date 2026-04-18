export { healingProcessor } from "./healingProcessor";
export { contractProcessor } from "./contractProcessor";
export {
  postBattleProcessor,
  applyPostBattle,
  registerPostBattleProcessor,
} from "./postBattleProcessor";
export type {
  IPostBattleApplied,
  IPostBattleCampaignExtensions,
  ICampaignWithBattleState,
} from "./postBattleProcessor";
export { dailyCostsProcessor } from "./dailyCostsProcessor";
export { registerAcquisitionProcessor } from "./acquisitionProcessor";
export { autoAwardsProcessor } from "./autoAwardsProcessor";
export { randomEventsProcessor } from "./randomEventsProcessor";
export {
  unitMarketProcessor,
  personnelMarketProcessor,
  contractMarketProcessor,
} from "./marketProcessors";
export {
  registerBuiltinProcessors,
  _resetBuiltinRegistration,
} from "./processorRegistration";
