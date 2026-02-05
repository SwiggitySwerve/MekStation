# Change: Repair & Quality Cascade System

## Why

MekStation needs equipment quality grades (A-F) and maintenance checks to create meaningful feedback loops: poor maintenance degrades quality, making future maintenance harder. Without this system, maintenance is cosmetic rather than strategic.

## What Changes

- Add PartQuality enum (A=worst to F=best) with TN modifiers (+3 to -2)
- Implement maintenance check system (2d6 vs TN with tech skill)
- Quality degradation on failure (move toward A), improvement on high success (move toward F)
- Add Tech skill type to personnel system
- Day processor for configurable maintenance cycles (weekly/monthly/quarterly/annually)
- Quality indicators in repair UI
- Maintenance history tracking per unit

## Impact

- Affected specs: `repair-maintenance` (ADDED), `personnel-management` (MODIFIED), `day-progression` (MODIFIED)
- Affected code:
  - `src/types/campaign/quality/` (NEW) - Quality types and enums
  - `src/lib/campaign/maintenance/` (NEW) - Maintenance check logic
  - `src/lib/campaign/processors/maintenanceProcessor.ts` (NEW) - Day pipeline integration
  - `src/types/campaign/skills/` (MODIFIED) - Add Tech skill type
  - `src/types/repair/` (MODIFIED) - Extend with quality fields
  - `src/components/repair/` (MODIFIED) - Quality indicators
- Dependencies: Plan 7 (Skills) for skill system
- Breaking changes: None (quality optional, defaults to D standard)
