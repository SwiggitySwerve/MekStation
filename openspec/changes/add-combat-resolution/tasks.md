# Tasks: Combat Resolution System

## 1. Attack Declaration
- [ ] 1.1 Define IAttackDeclaration interface
- [ ] 1.2 Implement weapon selection validation
- [ ] 1.3 Implement target selection validation
- [ ] 1.4 Implement range validation
- [ ] 1.5 Implement arc validation
- [ ] 1.6 Implement ammo tracking
- [ ] 1.7 Write tests for declaration validation

## 2. To-Hit Calculation
- [ ] 2.1 Define IToHitModifier interface
- [ ] 2.2 Implement base to-hit (gunnery skill)
- [ ] 2.3 Implement range modifier
- [ ] 2.4 Implement attacker movement modifier
- [ ] 2.5 Implement target movement modifier (TMM)
- [ ] 2.6 Implement heat modifier
- [ ] 2.7 Implement modifier aggregation
- [ ] 2.8 Write tests for to-hit calculation

## 3. Attack Resolution
- [ ] 3.1 Implement 2d6 roll
- [ ] 3.2 Implement hit/miss determination
- [ ] 3.3 Implement critical hit on natural 12
- [ ] 3.4 Implement automatic miss on natural 2
- [ ] 3.5 Write tests for resolution

## 4. Hit Location
- [ ] 4.1 Define hit location tables (front, side, rear)
- [ ] 4.2 Implement hit location roll (2d6)
- [ ] 4.3 Implement location lookup by arc
- [ ] 4.4 Handle punch/kick location tables (future)
- [ ] 4.5 Write tests for hit location

## 5. Damage Application
- [ ] 5.1 Implement armor damage
- [ ] 5.2 Implement structure damage (armor depleted)
- [ ] 5.3 Implement damage transfer (arm → torso, leg → torso)
- [ ] 5.4 Implement location destruction
- [ ] 5.5 Write tests for damage application

## 6. Critical Hits
- [ ] 6.1 Define critical hit tables
- [ ] 6.2 Implement critical hit roll trigger
- [ ] 6.3 Implement critical slot selection
- [ ] 6.4 Implement equipment destruction effects
- [ ] 6.5 Implement ammo explosion
- [ ] 6.6 Implement engine hit effects
- [ ] 6.7 Write tests for critical hits

## 7. Pilot Damage
- [ ] 7.1 Implement pilot hit trigger (head hit, ammo explosion, etc.)
- [ ] 7.2 Implement wound application
- [ ] 7.3 Implement consciousness check
- [ ] 7.4 Implement pilot death
- [ ] 7.5 Write tests for pilot damage

## 8. Cluster Weapons
- [ ] 8.1 Implement cluster hit table
- [ ] 8.2 Implement cluster damage distribution
- [ ] 8.3 Implement LRM/SRM special handling
- [ ] 8.4 Write tests for cluster weapons

## 9. Combat Service
- [ ] 9.1 Create CombatService
- [ ] 9.2 Implement declare attack
- [ ] 9.3 Implement calculate to-hit
- [ ] 9.4 Implement resolve attack
- [ ] 9.5 Implement apply damage
- [ ] 9.6 Write integration tests
