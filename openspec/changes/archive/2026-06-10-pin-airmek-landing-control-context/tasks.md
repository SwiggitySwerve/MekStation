# Tasks: Pin AirMek Landing Control Context

## 1. Runtime State

- [x] 1.1 Add selected-session optional-rule context to tactical commands.
- [x] 1.2 Attach clean or damaged AirMek landing-control metadata to final
      AirMek Descend runtime movement events.
- [x] 1.3 Preserve existing altitude-control MP reserve behavior.

## 2. Player Explanation

- [x] 2.1 Render AirMek landing-control outcomes in the event log.
- [x] 2.2 Carry readable modifier details for damaged landings.

## 3. Coverage

- [x] 3.1 Add command tests for clean, damaged, heavy-duty gyro, and TacOps hip
      landing-control cases.
- [x] 3.2 Add runtime event replay coverage proving metadata remains on the
      event while altitude state still updates normally.
- [x] 3.3 Add event-log coverage for the player-facing explanation.

## 4. Documentation

- [x] 4.1 Add this OpenSpec delta.
- [x] 4.2 Update tactical-map source matrix and PR coverage audit notes.
