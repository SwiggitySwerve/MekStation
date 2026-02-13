import os
from pathlib import Path
from collections import defaultdict

# Comprehensive mapping
mappings = {
    # STORES
    'src/stores/useAppSettingsStore.ts': ('COVERED', 'app-settings'),
    'src/stores/useThemeStore.ts': ('COVERED', 'color-system'),
    'src/stores/useNavigationStore.ts': ('COVERED', 'app-navigation'),
    'src/stores/useUnitStore.ts': ('COVERED', 'unit-store-architecture'),
    'src/stores/useCustomizerStore.ts': ('COVERED', 'customizer-tabs'),
    'src/stores/useCustomizerSettingsStore.ts': ('COVERED', 'customizer-responsive-layout'),
    'src/stores/useEquipmentStore.ts': ('COVERED', 'equipment-database'),
    'src/stores/useGameplayStore.ts': ('COVERED', 'game-state-management'),
    'src/stores/useEncounterStore.ts': ('COVERED', 'game-session-management'),
    'src/stores/useQuickGameStore.ts': ('COVERED', 'quick-session'),
    'src/stores/useRepairStore.ts': ('COVERED', 'repair-maintenance'),
    'src/stores/useAwardStore.ts': ('COVERED', 'awards'),
    'src/stores/usePilotStore.ts': ('COVERED', 'personnel-management'),
    'src/stores/useForceStore.ts': ('COVERED', 'force-management'),
    'src/stores/useMultiUnitStore.ts': ('COVERED', 'multi-unit-tabs'),
    'src/stores/useTabManagerStore.ts': ('COVERED', 'multi-unit-tabs'),
    'src/stores/useUIBehaviorStore.ts': ('COVERED', 'desktop-experience'),
    'src/stores/useAccessibilityStore.ts': ('UNCOVERED', 'NO SPEC'),
    'src/stores/useAppearanceStore.ts': ('COVERED', 'color-system'),
    'src/stores/useIdentityStore.ts': ('COVERED', 'vault-sync'),
    'src/stores/useVehicleStore.ts': ('UNCOVERED', 'NO SPEC'),
    'src/stores/useAerospaceStore.ts': ('UNCOVERED', 'NO SPEC'),
    'src/stores/useBattleArmorStore.ts': ('UNCOVERED', 'NO SPEC'),
    'src/stores/useInfantryStore.ts': ('UNCOVERED', 'NO SPEC'),
    'src/stores/useProtoMechStore.ts': ('UNCOVERED', 'NO SPEC'),
}

status_counts = defaultdict(int)
for status, spec in mappings.values():
    status_counts[status] += 1

print("COVERAGE SUMMARY:")
print(f"  COVERED:   {status_counts['COVERED']}")
print(f"  UNCOVERED: {status_counts['UNCOVERED']}")
