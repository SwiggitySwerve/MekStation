# Implementation Tasks: Contract Types Expansion

## 1. Contract Type Definitions

- [ ] 1.1 Define AtBContractType enum (19 values)
- [ ] 1.2 Define ContractGroup type (garrison, raid, guerrilla, special)
- [ ] 1.3 Define IContractTypeDefinition interface
- [ ] 1.4 Create CONTRACT_TYPE_DEFINITIONS constant with all 19 types
- [ ] 1.5 Import CombatRole from Plan 11

## 2. Variable Contract Length

- [ ] 2.1 Implement calculateVariableLength formula
- [ ] 2.2 Test length ranges for all 19 types
- [ ] 2.3 Ensure deterministic with seeded random

## 3. Contract Negotiation

- [ ] 3.1 Define 4 clause types (Command, Salvage, Support, Transport)
- [ ] 3.2 Implement negotiation roll with skill modifier
- [ ] 3.3 Implement faction standing modifier integration
- [ ] 3.4 Calculate final contract terms

## 4. Contract Events

- [ ] 4.1 Define 10 event types
- [ ] 4.2 Implement monthly event checking
- [ ] 4.3 Apply event effects (morale, logistics, scenarios)
- [ ] 4.4 Integrate with Plan 16 random events

## 5. Contract Market Update

- [ ] 5.1 Update contract generation for 19 types
- [ ] 5.2 Apply type-specific modifiers
- [ ] 5.3 Integrate ops tempo with scenario generation

## 6. Campaign Integration

- [ ] 6.1 Extend IContract interface
- [ ] 6.2 Update contract factory functions
- [ ] 6.3 Add backward compatibility for legacy contracts

## 7. UI Updates

- [ ] 7.1 Update contract selection UI for 19 types
- [ ] 7.2 Display type-specific information
- [ ] 7.3 Show negotiation interface

## 8. Testing

- [ ] 8.1 Test all 19 contract types
- [ ] 8.2 Test variable length calculation
- [ ] 8.3 Test negotiation mechanics
- [ ] 8.4 Test contract events
