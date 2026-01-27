## ADDED Requirements

### Requirement: Availability Ratings
The system SHALL define 7 availability ratings (A through X) with target number lookup tables for regular and consumable parts.

#### Scenario: Regular parts have correct target numbers
- **GIVEN** availability ratings A through X
- **WHEN** looking up regular part target numbers
- **THEN** A=3, B=4, C=6, D=8, E=10, F=11, X=13

#### Scenario: Consumable parts are easier to acquire
- **GIVEN** availability ratings A through X
- **WHEN** looking up consumable part target numbers
- **THEN** A=2, B=3, C=4, D=6, E=8, F=10, X=13 (2 points easier than regular except X)

### Requirement: Acquisition Roll Calculation
The system SHALL calculate acquisition target numbers using base TN plus modifier stack (negotiator skill, planetary, clan penalty, contract availability).

#### Scenario: Base target number from availability
- **GIVEN** a part with availability rating D and isConsumable false
- **WHEN** calculating target number with no modifiers
- **THEN** target number is 8

#### Scenario: Negotiator skill modifier applies
- **GIVEN** a part with availability D and a negotiator with skill 5
- **WHEN** calculating target number with acquisitionSkillModifier enabled
- **THEN** target number is 8 - 5 = 3

#### Scenario: Planetary modifiers stack
- **GIVEN** a part with availability D on a planet with tech A, industry B, output C
- **WHEN** calculating target number with usePlanetaryModifiers enabled
- **THEN** planetary modifier is -3 (tech A) + -2 (industry B) + -1 (output C) = -6, final TN is 8 - 6 = 2

#### Scenario: Clan parts penalty in era
- **GIVEN** a clan part with availability D in year 3055
- **WHEN** calculating target number with clanPartsPenalty enabled
- **THEN** clan penalty is +3, final TN is 8 + 3 = 11

#### Scenario: 2d6 roll vs target number
- **GIVEN** a target number of 8
- **WHEN** rolling 2d6 and getting 9
- **THEN** acquisition succeeds with margin +1

### Requirement: Planetary Modifiers
The system SHALL apply planetary tech sophistication, industrial capacity, and output ratings as modifiers to acquisition rolls.

#### Scenario: Tech sophistication modifiers
- **GIVEN** planetary tech ratings A through F
- **WHEN** calculating tech modifier
- **THEN** A=-3, B=-2, C=-1, D=0, E=+1, F=+2

#### Scenario: Industrial capacity modifiers
- **GIVEN** planetary industry ratings A through F
- **WHEN** calculating industry modifier
- **THEN** A=-2, B=-1, C=0, D=+1, E=+2, F=impossible (blocks all acquisitions)

#### Scenario: Output rating modifiers
- **GIVEN** planetary output ratings A through F
- **WHEN** calculating output modifier
- **THEN** A=-1, B=0, C=+1, D=+2, E=+3, F=impossible (blocks all acquisitions)

#### Scenario: Impossible conditions block acquisition
- **GIVEN** a planet with industry F or output F
- **WHEN** attempting acquisition
- **THEN** acquisition automatically fails regardless of roll

### Requirement: Delivery Time Calculation
The system SHALL calculate delivery time using formula max(1, (7 + 1d6 + availability_index) / 4) in configurable transit units.

#### Scenario: Delivery time for common part
- **GIVEN** availability A (index 0) and 1d6 roll of 3
- **WHEN** calculating delivery time in months
- **THEN** delivery time is max(1, (7 + 3 + 0) / 4) = max(1, 2.5) = 3 months

#### Scenario: Delivery time for rare part
- **GIVEN** availability F (index 5) and 1d6 roll of 4
- **WHEN** calculating delivery time in months
- **THEN** delivery time is max(1, (7 + 4 + 5) / 4) = max(1, 4) = 4 months

#### Scenario: Minimum delivery time is 1 unit
- **GIVEN** availability A (index 0) and 1d6 roll of 1
- **WHEN** calculating delivery time
- **THEN** delivery time is max(1, (7 + 1 + 0) / 4) = max(1, 2) = 2 units (not less than 1)

#### Scenario: Transit units are configurable
- **GIVEN** acquisitionTransitUnit set to 'week'
- **WHEN** calculating delivery time
- **THEN** result is in weeks instead of months

### Requirement: Shopping List Queue
The system SHALL manage a shopping list queue with add, remove, retry, and cooldown logic.

#### Scenario: Add acquisition request to queue
- **GIVEN** a shopping list
- **WHEN** adding a new acquisition request for part "Autocannon/10" with availability D
- **THEN** request is added with status 'pending', attempts 0, and unique ID

#### Scenario: Remove completed request
- **GIVEN** a shopping list with a delivered request
- **WHEN** removing the request
- **THEN** request is removed from the queue

#### Scenario: Retry failed acquisition
- **GIVEN** a failed acquisition request with attempts 2
- **WHEN** retrying the acquisition
- **THEN** attempts increment to 3 and status changes to 'pending'

#### Scenario: Cooldown prevents immediate retry
- **GIVEN** a failed acquisition with lastAttemptDate today
- **WHEN** checking if retry is allowed
- **THEN** retry is blocked until cooldown period expires

### Requirement: Acquisition Day Processor
The system SHALL process pending acquisitions daily, attempt rolls, update statuses, and deliver arrived items.

#### Scenario: Process pending acquisitions
- **GIVEN** a shopping list with 3 pending requests
- **WHEN** the acquisition processor runs
- **THEN** all 3 requests are attempted, rolls are made, and statuses are updated

#### Scenario: Successful acquisition enters transit
- **GIVEN** a pending request that rolls successfully
- **WHEN** the acquisition processor runs
- **THEN** status changes to 'in_transit', orderedDate is set, deliveryDate is calculated

#### Scenario: Failed acquisition remains pending
- **GIVEN** a pending request that rolls unsuccessfully
- **WHEN** the acquisition processor runs
- **THEN** status remains 'pending', attempts increment, lastAttemptDate is updated

#### Scenario: Deliver arrived items
- **GIVEN** an in_transit request with deliveryDate today
- **WHEN** the acquisition processor runs
- **THEN** status changes to 'delivered', item is added to parts inventory, event is emitted

### Requirement: Auto-Logistics Scanner
The system SHALL scan units for needed parts and auto-queue acquisition requests when useAutoLogistics is enabled.

#### Scenario: Scan units for needed parts
- **GIVEN** a unit with 3 damaged components requiring parts
- **WHEN** the auto-logistics scanner runs
- **THEN** 3 acquisition requests are queued for the needed parts

#### Scenario: Respect stock target percentage
- **GIVEN** autoLogisticsStockTarget set to 100 (100% stock)
- **WHEN** the scanner runs
- **THEN** requests are queued to maintain 100% stock of all parts

#### Scenario: Skip already queued parts
- **GIVEN** a part already in the shopping list
- **WHEN** the scanner runs
- **THEN** no duplicate request is created for that part

#### Scenario: Auto-logistics disabled
- **GIVEN** useAutoLogistics set to false
- **WHEN** the scanner runs
- **THEN** no requests are auto-queued
