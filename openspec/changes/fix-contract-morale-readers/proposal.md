## Why

Nothing has ever written `contract.moraleLevel`, so every contract has sat at STALEMATE and its readers have never been exercised. The monthly check (M2) will be the first writer, so each reader was audited against the pinned MekHQ (e7adc2c) first.

* Scenario generation ignored ROUTED. The pin generates no random scenario against a routed enemy: `StratConRulesManager.calculateScenarioOdds` returns -1 (`StratConRulesManager.java:4492-4495`).
* The scenario-type roll carried a MekStation-only morale modifier, `1 + (STALEMATE - level) * 5`, from +16 (ROUTED) to -14 (OVERWHELMING). The pin has no such modifier: the weekly AtB generator that had one is retired (`CampaignNewDayManager.java:2292-2293`), and its only effect of enemy morale on ordinary scenarios is the ROUTED case above. The modifier also behaved oddly at the table edges (a ROUTED enemy made every Frontline scenario one the player defends; OVERWHELMING and DOMINATING did the same).
* `getMoraleDisplayInfo` had no caller and labelled enemy morale "Company morale".

## What Changes

A ROUTED contract is skipped by scenario generation. `calculateBattleTypeMod` is removed; the scenario-type roll gets the fixed offset of 1 that STALEMATE always gave (`SCENARIO_TYPE_ROLL_OFFSET`), so every existing run is unchanged, and `selectScenarioType` no longer takes a morale level. `getMoraleDisplayInfo` is deleted.

This is partial ROUTED behaviour. The pin also ends a non-garrison contract at once and re-spikes a garrison one after a rout end date (`MHQMorale.java:646-675`); that lifecycle (early end, payout, rout end date) is held with the payout packets. Until it exists, a routed contract has no battles until a monthly check rallies it, or it expires.

## Impact

Affected capabilities: scenario-generation, combat-resolution. No persisted field, wire shape or schema changes. No run that exists today changes: no contract has been anything but STALEMATE, so the skip never fires and the offset equals the old modifier at STALEMATE.

Recorded as OPEN, not implemented: the pin's reinforcement-scenario odds modifiers (CRITICAL -10, WEAKENED -5, ADVANCING +5, DOMINATING +20, OVERWHELMING +50, `StratConRulesManager.java:4499-4506`), because MekStation has no StratCon reinforcement model to apply them to.
