# Change: Add Force Management System

## Why

Players need to organize units and pilots into forces (lances, companies) for gameplay. This proposal establishes force roster management, pilot-mech assignment, and hierarchical force organization.

## What Changes

- Add Force entity with hierarchical structure
- Add pilot-to-mech assignment
- Add force creation and editing
- Add force BV/tonnage calculation
- Add saved force configurations

## Dependencies

- **Requires**: `add-pilot-system` (pilots in forces)
- **Required By**: `add-encounter-system`

## Force Model

```
Force
├── id, name, affiliation
├── parent (optional, for hierarchy)
├── children (sub-forces)
├── assignments (pilot + mech pairs)
└── totalBV, totalTonnage (calculated)

Assignment
├── pilotId (persistent or statblock)
├── mechId (unit build reference)
└── position (e.g., Lance Lead)
```

## Force Hierarchy

```
Battalion (optional)
├── Company A
│   ├── 1st Lance (4 mechs)
│   ├── 2nd Lance (4 mechs)
│   └── 3rd Lance (4 mechs)
└── Company B
    └── ...
```

## Impact

- Affected specs: None (new capability)
- New specs: `force-management`
- Affected code: New `src/gameplay/forces/` directory
- Database: New `forces` table
- New pages: `/gameplay/forces`, `/gameplay/forces/create`, `/gameplay/forces/[id]`
