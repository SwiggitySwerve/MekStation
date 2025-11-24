# 👨‍💻 BattleTech Editor App - Developer Guide

## Quick Start

### Prerequisites
```bash
# Required
- Node.js 18+ 
- npm or yarn
- Git

# Optional but recommended
- VS Code with TypeScript extension
- React Developer Tools browser extension
```

### Initial Setup
```bash
# Clone the repository
git clone [repository-url]
cd megameklab/battletech-editor-app

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Key Development URLs
- `/` - Home page with project overview
- `/compendium` - Unit/equipment browser (production system)
- `/customizer` - Main editor interface (start here for development)
- `/equipment` - Equipment database browser
- `/editor-demo` - Editor demonstration and testing
- `/armor-diagram-demo` - Armor system demo
- `/test-editor` - Testing environment for new features

---

## 📁 **Project Structure Quick Reference**

### **Where to Find Things**
```
📁 Key Directories:
├── components/editor/        # All editor components
│   ├── tabs/                # Main editor tabs (Structure, Equipment, etc.)
│   ├── armor/               # Armor allocation components
│   ├── equipment/           # Equipment management
│   └── criticals/           # Critical slot assignment
├── utils/                   # Business logic
│   ├── unitValidation.ts    # Validation rules
│   ├── armorAllocation.ts   # Armor calculations
│   └── equipmentData.ts     # Equipment database
├── types/                   # TypeScript definitions
│   ├── index.ts            # Core types
│   └── editor.ts           # Editor-specific types
├── pages/                  # Next.js routes
│   └── api/                # API endpoints
├── data/                   # Database and data files
└── __tests__/              # Test suite (66 tests)
```

### **Most Important Files for Development**
```typescript
// Core editor system
components/editor/UnitEditor.tsx         // Main editor container
components/editor/tabs/*.tsx             // Individual tab components

// Data models and types
types/index.ts                          // EditableUnit interface & core types
types/editor.ts                         // Editor-specific types

// Business logic
utils/unitValidation.ts                 // Validation rules (comprehensive)
utils/armorAllocation.ts                // Armor auto-allocation algorithms
utils/equipmentData.ts                  // Equipment database (1000+ items)

// API and database
pages/api/units.ts                      // Main API with 9 filter types
data/populate_db.py                     // Database population script
data/schema_sqlite.sql                  // Database schema

// State management
utils/undoRedoManager.ts                // Undo/redo functionality
hooks/useUnitData.tsx                   // Unit data management hook
```

---

## 🛠️ **Common Development Tasks**

### **1. Adding New Equipment**
```typescript
// Step 1: Add to equipmentData.ts
export const weapons: Equipment[] = [
  // ... existing weapons
  {
    id: 'new-weapon-id',
    name: 'New Weapon Name',
    type: 'weapon',
    heat: 5,
    damage: 10,
    slots: 2,
    tons: 5,
    cost: 100000,
    tech_base: 'Inner Sphere', // or 'Clan'
    rules_level: 'standard',   // or 'advanced', 'experimental'
    era: 'Star League',        // Era availability
    location_restrictions: [], // Optional: limit to specific locations
    special_rules: {}          // Optional: special equipment rules
  }
];

// Step 2: Add validation rules in unitValidation.ts (if needed)
const validateNewWeapon = (unit: EditableUnit, errors: ValidationError[]) => {
  // Add specific validation logic for the new weapon
};

// Step 3: Add tests
describe('New Weapon', () => {
  it('should validate correctly', () => {
    // Test new weapon validation
  });
});
```

### **2. Adding a New Quirk**
```typescript
// Step 1: Add to quirks list in types/index.ts
export const POSITIVE_QUIRKS = [
  // ... existing quirks
  'New Quirk Name',
  'Another New Quirk'
];

export const NEGATIVE_QUIRKS = [
  // ... existing quirks
  'New Negative Quirk'
];

// Step 2: Add effects in unitValidation.ts (if quirk affects validation)
const validateQuirkEffects = (unit: EditableUnit, errors: ValidationError[]) => {
  if (unit.selectedQuirks?.includes('New Quirk Name')) {
    // Add validation logic for quirk effects
  }
};

// Step 3: Update equipment compatibility (if needed)
const checkQuirkEquipmentCompatibility = (unit: EditableUnit) => {
  // Check if quirk affects equipment placement or function
};
```

### **3. Modifying Validation Rules**
```typescript
// In utils/unitValidation.ts
export const validateUnit = (unit: EditableUnit): ValidationState => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Add new validation rule
  if (/* your custom condition */) {
    errors.push({
      type: 'CUSTOM_VALIDATION_ERROR',
      severity: 'error',
      message: 'Your descriptive error message',
      field: 'affected_field', // Optional: specific field reference
      location: 'specific_location' // Optional: mech location reference
    });
  }
  
  // Add warning (non-blocking)
  if (/* warning condition */) {
    warnings.push({
      type: 'CUSTOM_WARNING',
      severity: 'warning',
      message: 'Your warning message'
    });
  }
  
  // ... rest of validation
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions: [] // Optional: suggestions for improvement
  };
};

// Test your new validation
describe('Custom Validation', () => {
  it('should detect the new error condition', () => {
    const invalidUnit = createMockUnit(/* with error condition */);
    const result = validateUnit(invalidUnit);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        type: 'CUSTOM_VALIDATION_ERROR'
      })
    );
  });
});
```

### **4. Adding a New Tab to the Editor**
```typescript
// Step 1: Create new tab component
// components/editor/tabs/NewTab.tsx
export const NewTab: React.FC<TabProps> = ({ unit, onUnitChange, readOnly }) => {
  const [localState, setLocalState] = useState<NewTabState>({});
  
  const handleChange = useCallback((field: string, value: any) => {
    setLocalState(prev => ({ ...prev, [field]: value }));
    onUnitChange({ [field]: value });
  }, [onUnitChange]);
  
  return (
    <div className="new-tab p-4">
      <h2 className="text-xl font-bold mb-4">New Tab</h2>
      {/* Your tab content */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tab controls and displays */}
      </div>
    </div>
  );
};

// Step 2: Add to UnitEditor.tsx tabs array
const tabs = [
  { id: 'structure', label: 'Structure/Armor', component: StructureArmorTab },
  { id: 'equipment', label: 'Equipment', component: EquipmentTab },
  { id: 'criticals', label: 'Criticals', component: CriticalsTab },
  { id: 'quirks', label: 'Quirks', component: QuirksTab },
  { id: 'fluff', label: 'Fluff', component: FluffTab },
  { id: 'preview', label: 'Preview', component: PreviewTab },
  { id: 'new', label: 'New Tab', component: NewTab } // Add your new tab
];

// Step 3: Add TypeScript interface for tab state (if needed)
// types/editor.ts
interface NewTabState {
  // Define your tab's local state structure
}
```

### **5. Implementing a New Auto-Allocation Pattern**
```typescript
// In utils/armorAllocation.ts
export const allocateArmorNewPattern = (
  unit: EditableUnit,
  totalPoints: number
): ArmorAllocation => {
  // Your custom allocation algorithm
  const distribution = {
    head: 0.08,         // 8% to head
    center_torso: 0.25, // 25% to center torso
    left_torso: 0.15,   // 15% to left torso
    right_torso: 0.15,  // 15% to right torso
    left_arm: 0.10,     // 10% to left arm
    right_arm: 0.10,    // 10% to right arm
    left_leg: 0.08,     // 8% to left leg
    right_leg: 0.08     // 8% to right leg
  };
  
  return {
    head: { front: Math.floor(totalPoints * distribution.head) },
    center_torso: { 
      front: Math.floor(totalPoints * distribution.center_torso * 0.7),
      rear: Math.floor(totalPoints * distribution.center_torso * 0.3)
    },
    left_torso: { 
      front: Math.floor(totalPoints * distribution.left_torso * 0.7),
      rear: Math.floor(totalPoints * distribution.left_torso * 0.3)
    },
    right_torso: { 
      front: Math.floor(totalPoints * distribution.right_torso * 0.7),
      rear: Math.floor(totalPoints * distribution.right_torso * 0.3)
    },
    left_arm: { front: Math.floor(totalPoints * distribution.left_arm) },
    right_arm: { front: Math.floor(totalPoints * distribution.right_arm) },
    left_leg: { front: Math.floor(totalPoints * distribution.left_leg) },
    right_leg: { front: Math.floor(totalPoints * distribution.right_leg) }
  };
};

// Add to ArmorAllocationPanel.tsx
const allocationPatterns = [
  { id: 'max', label: 'Maximum Protection', fn: allocateMaximumArmor },
  { id: 'balanced', label: 'Balanced', fn: allocateBalancedArmor },
  { id: 'front', label: 'Front Heavy', fn: allocateFrontHeavyArmor },
  { id: 'new', label: 'New Pattern', fn: allocateArmorNewPattern } // Add here
];
```

### **6. Adding New API Filters**
```typescript
// In pages/api/units.ts
app.get('/api/units', async (req, res) => {
  const {
    // ... existing filters
    new_filter, // Your new filter parameter
  } = req.query;
  
  try {
    const queryBuilder = new UnitQueryBuilder();
    const query = queryBuilder
      .filterByTechBase(tech_base)
      .filterByConfig(config)
      // ... existing filters
      .filterByNewCriteria(new_filter) // Add your new filter
      .build();
      
    // ... rest of API logic
  } catch (error) {
    handleAPIError(error, res);
  }
});

// Add filter method to UnitQueryBuilder class
class UnitQueryBuilder {
  // ... existing methods
  
  filterByNewCriteria(criteria: string): this {
    if (criteria && criteria !== 'all') {
      this.conditions.push('new_field = ?');
      this.parameters.push(criteria);
    }
    return this;
  }
}

// Add comprehensive tests
describe('/api/units new filter', () => {
  it('should filter units by new criteria', async () => {
    const response = await request(app)
      .get('/api/units?new_filter=test_value')
      .expect(200);
    
    expect(response.body.units).toHaveLength(expect.any(Number));
    response.body.units.forEach(unit => {
      expect(unit.new_field).toBe('test_value');
    });
  });
});
```

---

## 🐛 **Debugging & Troubleshooting**

### **1. Enable Debug Mode**
```typescript
// In browser console
localStorage.setItem('debug', 'true');
localStorage.setItem('debug_level', 'verbose'); // Options: 'basic', 'verbose', 'trace'

// Now you can access debug information:
window.__UNIT_STATE__      // Current unit state
window.__VALIDATION__      // Current validation results
window.__UNDO_STACK__      // Undo/redo history
window.__PERFORMANCE__     // Performance metrics
window.__API_CACHE__       // API response cache

// Enable performance profiling
localStorage.setItem('profile_performance', 'true');
```

### **2. Common Issues and Solutions**

#### **Equipment Not Showing in Database**
```typescript
// Debugging checklist:
1. Check equipment exists in equipmentData.ts
2. Verify correct tech_base ('Inner Sphere' vs 'Clan')
3. Verify correct rules_level ('standard', 'advanced', 'experimental')
4. Check equipment filters in EquipmentDatabase component
5. Inspect browser console for JavaScript errors
6. Verify equipment passes validation rules

// Debug equipment loading:
console.log('Available weapons:', weapons.length);
console.log('Equipment filters:', currentFilters);
console.log('Filtered equipment:', filteredEquipment.length);
```

#### **Validation Not Working**
```typescript
// Debug validation system:
1. Add console.log statements in validateUnit()
2. Check ValidationState in React DevTools
3. Verify unit structure matches EditableUnit interface
4. Check for TypeScript compilation errors
5. Verify validation functions are being called

// Debug validation:
const debugValidation = (unit: EditableUnit) => {
  console.log('Validating unit:', unit.chassis, unit.model);
  const result = validateUnit(unit);
  console.log('Validation result:', result);
  return result;
};
```

#### **Drag and Drop Issues**
```typescript
// Common fixes for drag/drop problems:
1. Check dataTransfer format matches between drag and drop handlers
2. Verify drop zone has preventDefault() in dragOver handler
3. Check if target location accepts the equipment type
4. Test in different browsers (Chrome vs Firefox behavior differences)
5. Verify drag/drop event handlers are properly bound

// Debug drag and drop:
const handleDragStart = (e: DragEvent, item: Equipment) => {
  console.log('Dragging:', item.name);
  e.dataTransfer.setData('application/equipment', JSON.stringify(item));
};

const handleDrop = (e: DragEvent, location: string) => {
  console.log('Dropping at:', location);
  const data = e.dataTransfer.getData('application/equipment');
  console.log('Drop data:', data);
  // ... rest of drop logic
};
```

#### **Performance Issues**
```typescript
// Performance debugging tools:
1. Use React DevTools Profiler to identify slow components
2. Monitor bundle size with webpack-bundle-analyzer
3. Check for memory leaks with browser dev tools
4. Profile database queries in development
5. Monitor API response times

// Add performance markers:
performance.mark('operation-start');
// ... your code
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// View performance data:
console.table(performance.getEntriesByType('measure'));
```

### **3. State Management Debugging**
```typescript
// Debug state updates
const useDebugState = (stateName: string, state: any) => {
  useEffect(() => {
    console.log(`${stateName} updated:`, state);
  }, [stateName, state]);
};

// Usage in components:
const MyComponent = () => {
  const [unit, setUnit] = useState(initialUnit);
  useDebugState('unit', unit); // Will log all unit state changes
  
  return (/* component JSX */);
};

// Debug undo/redo stack
const debugUndoRedo = (undoStack: EditableUnit[], redoStack: EditableUnit[]) => {
  console.log('Undo stack size:', undoStack.length);
  console.log('Redo stack size:', redoStack.length);
  console.log('Current can undo:', undoStack.length > 0);
  console.log('Current can redo:', redoStack.length > 0);
};
```

---

## 🧪 **Testing Guide**

### **Running Tests**
```bash
# Run all tests (66 comprehensive tests)
npm test

# Run specific test file
npm test ArmorAllocationPanel
npm test api/units

# Run with coverage report
npm test -- --coverage

# Run in watch mode for development
npm test -- --watch

# Run tests silently (CI mode)
npm test -- --silent

# Run only tests related to changed files
npm test -- --onlyChanged
```

### **Writing Tests**

#### **Component Testing Pattern**
```typescript
import { render, fireEvent, waitFor } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  const mockProps = {
    unit: createMockUnit(),
    onUnitChange: jest.fn(),
    readOnly: false
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render correctly', () => {
    const { getByRole, getByText } = render(
      <YourComponent {...mockProps} />
    );
    
    expect(getByText('Expected Text')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Expected Button' })).toBeInTheDocument();
  });
  
  it('should handle user interaction', async () => {
    const { getByRole } = render(
      <YourComponent {...mockProps} />
    );
    
    fireEvent.click(getByRole('button', { name: 'Test Button' }));
    
    await waitFor(() => {
      expect(mockProps.onUnitChange).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedField: 'expectedValue'
        })
      );
    });
  });
  
  it('should handle error states', () => {
    const errorProps = { ...mockProps, unit: createInvalidUnit() };
    const { getByText } = render(
      <YourComponent {...errorProps} />
    );
    
    expect(getByText(/error message/i)).toBeInTheDocument();
  });
});
```

#### **Utility Function Testing**
```typescript
import { yourUtility } from './yourUtility';

describe('yourUtility', () => {
  it('should calculate correctly with valid input', () => {
    const input = { mass: 50, armorType: 'standard' };
    const result = yourUtility(input);
    const expected = { maxArmor: 168, distribution: /* expected */ };
    
    expect(result).toEqual(expected);
  });
  
  it('should handle edge cases', () => {
    const edgeCaseInput = { mass: 0, armorType: 'unknown' };
    const result = yourUtility(edgeCaseInput);
    
    expect(result).toEqual(/* expected edge case result */);
  });
  
  it('should throw error for invalid input', () => {
    expect(() => {
      yourUtility(null);
    }).toThrow('Invalid input');
  });
});
```

#### **API Testing Pattern**
```typescript
import request from 'supertest';
import { app } from '../pages/api/units';

describe('/api/units', () => {
  it('should return units with valid filters', async () => {
    const response = await request(app)
      .get('/api/units?tech_base=Inner%20Sphere&mass_min=50')
      .expect(200);
    
    expect(response.body).toHaveProperty('units');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.units)).toBe(true);
    
    response.body.units.forEach(unit => {
      expect(unit.tech_base).toBe('Inner Sphere');
      expect(unit.mass).toBeGreaterThanOrEqual(50);
    });
  });
  
  it('should handle invalid parameters gracefully', async () => {
    const response = await request(app)
      .get('/api/units?mass_min=invalid')
      .expect(400);
    
    expect(response.body).toHaveProperty('error');
  });
  
  it('should respect pagination', async () => {
    const response = await request(app)
      .get('/api/units?page=1&limit=5')
      .expect(200);
    
    expect(response.body.units).toHaveLength(5);
    expect(response.body.pagination).toMatchObject({
      current_page: 1,
      per_page: 5,
      total: expect.any(Number)
    });
  });
});
```

### **Mock Data Creation**
```typescript
// Test utilities for creating mock data
export const createMockUnit = (overrides: Partial<EditableUnit> = {}): EditableUnit => {
  return {
    id: 'test-unit-id',
    chassis: 'Test Chassis',
    model: 'Test Model',
    mass: 50,
    tech_base: 'Inner Sphere',
    config: 'Biped',
    rules_level: 'standard',
    armorAllocation: createMockArmorAllocation(),
    equipment: [],
    criticalSlots: createMockCriticalSlots(),
    selectedQuirks: [],
    fluffData: createMockFluffData(),
    validationState: { isValid: true, errors: [], warnings: [] },
    ...overrides
  };
};

export const createMockArmorAllocation = (): ArmorAllocation => ({
  head: { front: 9 },
  center_torso: { front: 16, rear: 8 },
  left_torso: { front: 12, rear: 6 },
  right_torso: { front: 12, rear: 6 },
  left_arm: { front: 8 },
  right_arm: { front: 8 },
  left_leg: { front: 10 },
  right_leg: { front: 10 }
});
```

---

## 📋 **Code Style & Standards**

### **TypeScript Best Practices**
```typescript
// ✅ DO: Use explicit types and interfaces
interface ComponentProps {
  unit: EditableUnit;
  onUnitChange: (updates: Partial<EditableUnit>) => void;
  readOnly?: boolean;
}

const MyComponent: React.FC<ComponentProps> = ({ unit, onUnitChange, readOnly = false }) => {
  // Component implementation
};

// ✅ DO: Use proper return types
const calculateWeight = (equipment: Equipment[]): number => {
  return equipment.reduce((sum, item) => sum + item.tons, 0);
};

// ✅ DO: Use union types for constants
type TechBase = 'Inner Sphere' | 'Clan' | 'Mixed (IS Chassis)' | 'Mixed (Clan Chassis)';
type UnitConfig = 'Biped' | 'Biped Omnimech' | 'Quad' | 'Quad Omnimech' | 'Tripod' | 'Tripod Omnimech' | 'LAM';

// ❌ DON'T: Use any type
const badFunction = (data: any) => { // Avoid this
  return data.someProperty;
};

// ✅ DO: Use proper generic types
const goodFunction = <T extends { someProperty: string }>(data: T): string => {
  return data.someProperty;
};
```

### **React Best Practices**
```typescript
// ✅ DO: Use functional components with hooks
export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<StateType>(initialState);
  
  const handleClick = useCallback(() => {
    // Event handler implementation
  }, [/* dependencies */]);
  
  return (/* JSX */);
};

// ✅ DO: Memoize expensive operations
const expensiveValue = useMemo(() => {
  return calculateExpensive(data);
}, [data]);

// ✅ DO: Use proper event handler naming
const handleSubmit = () => {};
const handleInputChange = () => {};
const handleEquipmentSelect = () => {};

// ✅ DO: Destructure props clearly
const MyComponent: React.FC<{ unit: EditableUnit; onChange: Function }> = ({ 
  unit, 
  onChange 
}) => {
  // Component logic
};

// ❌ DON'T: Mutate state directly
unit.armor = newArmor; // Wrong!

// ✅ DO: Update state immutably
onUnitChange({ ...unit, armor: newArmor }); // Correct!
```

### **Styling Guidelines**
```typescript
// ✅ DO: Use Tailwind classes consistently
const StyledComponent = () => (
  <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
    <h2 className="text-xl font-semibold text-gray-900">Title</h2>
    <p className="text-gray-600">Description</p>
  </div>
);

// ✅ DO: Group related classes logically
// Layout -> Spacing -> Typography -> Colors -> Effects
className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"

// ✅ DO: Use consistent spacing scale
// Prefer: gap-2, gap-4, gap-6, gap-8
// Prefer: p-2, p-4, p-6, p-8
// Prefer: m-2, m-4, m-6, m-8
```

---

## 🚀 **Build & Deployment**

### **Development Workflow**
```bash
# Start development with hot reload
npm run dev

# Type checking (run frequently during development)
npm run type-check

# Linting (fix issues before committing)
npm run lint
npm run lint:fix

# Run tests (before pushing changes)
npm run test
npm run test:coverage

# Check bundle size
npm run analyze
```

### **Production Build**
```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Export static site (for deployment)
npm run export

# Analyze bundle for optimization
npm run analyze
```

### **Environment Variables**
```bash
# .env.local (create this file for local development)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_PROFILING=true

# .env.production (for production deployment)
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_PROFILING=false
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

---

## 🔧 **Maintenance & Updates**

### **Adding New MegaMekLab Data**
```bash
# Update the database with new MegaMekLab data
cd data/
python populate_db.py

# Verify data integrity
npm run test -- data

# Check API still functions correctly
npm run test -- api
```

### **Updating Dependencies**
```bash
# Check for outdated packages
npm outdated

# Update specific packages
npm update package-name

# Update all packages (be careful!)
npm update

# After updates, run full test suite
npm run test
npm run build
```

### **Performance Monitoring**
```typescript
// Add performance monitoring to critical operations
const monitorPerformance = async (operationName: string, operation: () => Promise<any>) => {
  const start = performance.now();
  console.time(operationName);
  
  try {
    const result = await operation();
    const duration = performance.now() - start;
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation: ${operationName} took ${duration}ms`);
    }
    
    return result;
  } finally {
    console.timeEnd(operationName);
  }
};

// Use in components
const handleExpensiveOperation = async () => {
  await monitorPerformance('expensive-calculation', async () => {
    return calculateComplexValidation(unit);
  });
};
```

---

## 📚 **Learning Resources**

### **Project-Specific Knowledge**
1. **BattleTech Rules**: Understanding the game mechanics is crucial
   - Construction rules and weight limits
   - Tech base restrictions and compatibility
   - Equipment placement rules
   - Critical hit mechanics

2. **MegaMekLab Compatibility**: Key areas of compatibility
   - File format specifications (.blk, .mtf)
   - Unit validation rules
   - Equipment database structure
   - Auto-allocation algorithms

### **Technical Stack Learning**
- **React 18**: Hooks, context, performance optimization
- **Next.js 13**: App router, API routes, static generation
- **TypeScript**: Advanced types, generics, utility types
- **Tailwind CSS**: Responsive design, component patterns
- **Jest**: Testing patterns, mocking, coverage

### **Debugging Tools**
- **React Developer Tools**: Component inspection and profiling
- **Chrome DevTools**: Performance profiling and memory analysis
- **VS Code Extensions**: TypeScript error checking, auto-formatting
- **Network Tab**: API request monitoring and performance

---

## 📞 **Getting Help**

### **Documentation Hierarchy**
1. **PROJECT_OVERVIEW.md** - Start here for project understanding
2. **TECHNICAL_ARCHITECTURE.md** - System design and patterns
3. **DEVELOPER_GUIDE.md** - This file (development practices)
4. **IMPLEMENTATION_REFERENCE.md** - Detailed implementation patterns
5. **FUTURE_WORK.md** - Planned enhancements and TODOs

### **Key Concepts to Master**
1. **EditableUnit Interface**: Core data structure for all units
2. **Validation System**: Multi-level validation with errors/warnings
3. **State Management**: Immutable updates and undo/redo
4. **Component Props Pattern**: Consistent interface across components
5. **API Filter System**: 9-type comprehensive filtering

### **Where to Look for Examples**
- **Simple Component**: `components/common/Button.tsx`
- **Complex Component**: `components/editor/EquipmentDatabase.tsx`
- **State Management**: `components/editor/UnitEditor.tsx`
- **Validation Logic**: `utils/unitValidation.ts`
- **API Implementation**: `pages/api/units.ts`
- **Test Patterns**: `__tests__/` directory

---

## ✅ **New Developer Checklist**

When picking up this project for the first time:

- [ ] **Setup**: Clone repo, install dependencies, run development server
- [ ] **Explore Interface**: Open `/customizer` and create a test mech
- [ ] **Read Core Types**: Review `EditableUnit` interface in `types/index.ts`
- [ ] **Understand State Flow**: Examine `UnitEditor.tsx` state management
- [ ] **Run Tests**: Execute full test suite and ensure 66/66 pass
- [ ] **Check API**: Test `/api/units` endpoint with various filters
- [ ] **Review Documentation**: Read through all consolidated docs
- [ ] **Debug Mode**: Enable debug mode and explore browser tools
- [ ] **Make Small Change**: Try adding a simple equipment item or
