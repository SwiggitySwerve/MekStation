# Implementation Tasks: Validation Rules Master

## 1. Validation Rule Registry
- [ ] 1.1 Create IValidationRule interface
- [ ] 1.2 Create ValidationRuleRegistry class
- [ ] 1.3 Implement rule registration mechanism
- [ ] 1.4 Implement rule categorization
- [ ] 1.5 Implement rule priority ordering
- [ ] 1.6 Write registry tests

## 2. Weight Validation Rules
- [ ] 2.1 Implement total weight validation
- [ ] 2.2 Implement component weight validation
- [ ] 2.3 Implement weight rounding validation
- [ ] 2.4 Implement weight budget warnings
- [ ] 2.5 Write weight validation tests

## 3. Slot Validation Rules
- [ ] 3.1 Implement total slots validation (78 max)
- [ ] 3.2 Implement per-location slot validation
- [ ] 3.3 Implement fixed slot validation (engine, gyro, actuators)
- [ ] 3.4 Implement contiguous placement validation
- [ ] 3.5 Write slot validation tests

## 4. Tech Base Validation Rules
- [ ] 4.1 Implement component tech base compatibility
- [ ] 4.2 Implement mixed tech validation
- [ ] 4.3 Implement structural component restrictions
- [ ] 4.4 Write tech base validation tests

## 5. Era Validation Rules
- [ ] 5.1 Implement era availability checking
- [ ] 5.2 Implement introduction year validation
- [ ] 5.3 Implement extinction year validation
- [ ] 5.4 Write era validation tests

## 6. Construction Sequence Rules
- [ ] 6.1 Implement minimum heat sink validation (10+)
- [ ] 6.2 Implement armor maximum validation
- [ ] 6.3 Implement actuator requirement validation
- [ ] 6.4 Implement cockpit/gyro compatibility validation
- [ ] 6.5 Write construction sequence tests

## 7. Validation Orchestrator
- [ ] 7.1 Implement ValidationOrchestrator class
- [ ] 7.2 Implement validation execution order
- [ ] 7.3 Implement validation result aggregation
- [ ] 7.4 Implement validation caching
- [ ] 7.5 Write orchestrator tests

## 8. Error Reporting
- [ ] 8.1 Create ValidationError interface
- [ ] 8.2 Implement severity levels (Error, Warning, Info)
- [ ] 8.3 Implement error message formatting
- [ ] 8.4 Implement error location tracking
- [ ] 8.5 Write error reporting tests

