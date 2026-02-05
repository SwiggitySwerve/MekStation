# Tasks: Combat Resolution System

## 1. Attack Declaration

- [x] 1.1 Define IAttackDeclaration interface
- [x] 1.2 Implement weapon selection validation (IWeaponAttack interface)
- [x] 1.3 Implement target selection validation (IAttackValidation)
- [x] 1.4 Implement range validation (RangeBracket checks)
- [x] 1.5 Implement arc validation (FiringArc types)
- [ ] 1.6 Implement ammo tracking (DEFERRED - needs equipment integration)
- [x] 1.7 Write tests for declaration validation

## 2. To-Hit Calculation

- [x] 2.1 Define IToHitModifier interface
- [x] 2.2 Implement base to-hit (gunnery skill)
- [x] 2.3 Implement range modifier
- [x] 2.4 Implement attacker movement modifier
- [x] 2.5 Implement target movement modifier (TMM)
- [x] 2.6 Implement heat modifier
- [x] 2.7 Implement modifier aggregation
- [x] 2.8 Write tests for to-hit calculation

## 3. Attack Resolution

- [x] 3.1 Implement 2d6 roll (roll2d6, createDiceRoll)
- [x] 3.2 Implement hit/miss determination (via to-hit calculation)
- [x] 3.3 Implement critical hit on natural 12 (isBoxcars flag)
- [x] 3.4 Implement automatic miss on natural 2 (isSnakeEyes flag)
- [x] 3.5 Write tests for resolution

## 4. Hit Location

- [x] 4.1 Define hit location tables (front, side, rear)
- [x] 4.2 Implement hit location roll (2d6)
- [x] 4.3 Implement location lookup by arc
- [x] 4.4 Handle punch/kick location tables
- [x] 4.5 Write tests for hit location

## 5. Damage Application

- [x] 5.1 Implement armor damage
- [x] 5.2 Implement structure damage (armor depleted)
- [x] 5.3 Implement damage transfer (arm → torso, leg → torso)
- [x] 5.4 Implement location destruction
- [x] 5.5 Write tests for damage application

## 6. Critical Hits

- [x] 6.1 Define critical hit types (CriticalSeverity, CriticalEffectType)
- [x] 6.2 Implement critical hit roll trigger (checkCriticalHitTrigger)
- [x] 6.3 Implement critical hit count (getCriticalHitCount)
- [ ] 6.4 Implement equipment destruction effects (DEFERRED - needs equipment integration)
- [ ] 6.5 Implement ammo explosion (DEFERRED - needs ammo tracking)
- [ ] 6.6 Implement engine hit effects (DEFERRED - needs equipment integration)
- [x] 6.7 Write tests for critical hit basics

## 7. Pilot Damage

- [x] 7.1 Implement pilot hit trigger (head hit, ammo explosion, etc.)
- [x] 7.2 Implement wound application
- [x] 7.3 Implement consciousness check
- [x] 7.4 Implement pilot death
- [x] 7.5 Write tests for pilot damage

## 8. Cluster Weapons

- [x] 8.1 Implement cluster hit table
- [x] 8.2 Implement cluster damage distribution
- [x] 8.3 Implement LRM/SRM special handling (cluster sizes defined)
- [x] 8.4 Write tests for cluster weapons

## 9. Combat Service (DEFERRED - uses direct functions for MVP)

- [ ] 9.1 Create CombatService
- [ ] 9.2 Implement declare attack
- [ ] 9.3 Implement calculate to-hit
- [ ] 9.4 Implement resolve attack
- [ ] 9.5 Implement apply damage
- [ ] 9.6 Write integration tests
