# Dismiss anomaly alerts once

## Why

Repeated activation of Dismiss schedules duplicate callbacks during the alert's fade.

## What Changes

- Guard dismissal synchronously before starting the existing 300 ms fade.
- Verify repeated pointer and keyboard activation invokes the callback once.

## Impact

- Affected spec: `combat-analytics`.
- Affected code: `AnomalyAlertCard` and its existing interaction tests.
- Analysis pages retain their current callback and keyed-card contracts.

## Non-goals

No changes to anomaly detection, threshold rules, persistence, gameplay events, technology availability, or tech bases.
