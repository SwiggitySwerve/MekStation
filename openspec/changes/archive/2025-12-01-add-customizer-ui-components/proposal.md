# Change: Add Customizer UI Components

## Why

The BattleMech customizer requires a complete set of interactive UI components to enable users to configure units. These components provide visual feedback, drag-and-drop interactions, and multi-unit management capabilities that are essential for the editing experience.

## What Changes

### New Capabilities

- **armor-diagram**: SVG-based interactive armor allocation visualization
- **color-system**: Unified color scheme for equipment types, tech bases, and states
- **confirmation-dialogs**: Modal dialogs for destructive actions with progress tracking
- **critical-slots-display**: Drag-and-drop critical slot management interface
- **customizer-tabs**: Tabbed navigation for unit configuration sections
- **equipment-browser**: Searchable, filterable equipment catalog
- **equipment-tray**: Persistent sidebar for managing unit equipment
- **multi-unit-tabs**: Browser-like tabs for editing multiple units
- **unit-info-banner**: At-a-glance unit statistics display
- **component-configuration**: Component selection persistence and tech base filtering
- **unit-store-architecture**: Isolated Zustand stores with selection memory
- **tech-base-integration**: Tech base validation, filtering, and auto-correction

### Dependencies on Existing Specs

- armor-system (armor calculations)
- equipment-database (equipment data)
- critical-slot-allocation (slot data structures)
- movement-system (movement calculations)
- heat-management-system (heat calculations)
- validation-patterns (unit validation)
- persistence-services (state storage)
- core-enumerations (TechBase, RulesLevel, etc.)

## Impact

- Affected specs: None (all new capabilities)
- Affected code: `src/components/customizer/`, `src/pages/customizer/`, `src/hooks/`, `src/stores/`
- New dependencies: React DnD, Zustand (for state management)
