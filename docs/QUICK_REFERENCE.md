# 🚀 Quick Reference Guide - BattleTech Editor

**Last Updated:** January 2025

Quick reference for common tasks and information.

---

## 🎯 **Priority Work**

See **[PRIORITIZED_WORK.md](./PRIORITIZED_WORK.md)** for detailed prioritized work items.

### **Critical (Do First)**
1. Fix type errors blocking build
2. Remove console.log statements
3. Decompose UnitCriticalManager.ts (2,084 lines)

### **High Priority (Next Sprint)**
1. Migrate calculation utilities
2. Remove ComponentDatabaseService.ts
3. Improve test coverage

---

## 📁 **Key File Locations**

### **Type Definitions**
- `types/core/` - Core type definitions
- `types/criticalSlots.ts` - Critical slot types
- `types/editor.ts` - Editor types

### **Services**
- `services/systemComponents/` - System components gateway
- `services/validation/` - Validation services
- `services/equipment/` - Equipment services

### **Components**
- `components/editor/` - Editor components
- `components/criticalSlots/` - Critical slot components
- `components/armor/` - Armor components

### **Utilities**
- `utils/criticalSlots/` - Critical slot utilities
- `utils/armorAllocation.ts` - Armor allocation
- `utils/techBaseMemory.ts` - Tech base memory

---

## 🔧 **Common Tasks**

### **Adding a New Component**
1. Define types in `types/core/`
2. Create service in `services/`
3. Create component in `components/`
4. Add tests in `__tests__/`
5. Update documentation

### **Fixing Type Errors**
1. Check `types/core/` for existing types
2. Use `ICompleteUnitConfiguration` for unit configs
3. Use `IEquipmentInstance` for equipment
4. Avoid `as any` - use proper types

### **Refactoring Large Files**
1. Identify responsibilities
2. Extract focused services
3. Create interfaces
4. Update imports
5. Add tests

---

## 📚 **Documentation Quick Links**

### **Architecture**
- **[TECHNICAL_ARCHITECTURE.md](./technical/TECHNICAL_ARCHITECTURE.md)** - System architecture
- **[HANDOFF_REFACTOR_2025.md](./HANDOFF_REFACTOR_2025.md)** - Type system refactor

### **Development**
- **[DEVELOPER_GUIDE.md](./implementation/DEVELOPER_GUIDE.md)** - Developer guide
- **[troubleshooting-guide.md](./troubleshooting-guide.md)** - Troubleshooting

### **Refactoring**
- **[SOLID_REFACTORING_ANALYSIS.md](./refactoring/SOLID_REFACTORING_ANALYSIS.md)** - SOLID analysis
- **[CLEANUP_CANDIDATES.md](./project-history/CLEANUP_CANDIDATES.md)** - Cleanup tasks

### **BattleTech Rules**
- **[battletech_construction_guide.md](./battletech/battletech_construction_guide.md)** - Construction guide
- **[battletech_validation_rules.md](./battletech/battletech_validation_rules.md)** - Validation rules

---

## 🐛 **Common Issues**

### **Build Failing**
- Check `StructureTabV2.tsx` for type errors
- Verify all imports are correct
- Run `npm run lint` to find issues

### **Type Errors**
- Use proper types from `types/core/`
- Avoid `as any` casts
- Check `HANDOFF_REFACTOR_2025.md` for type system details

### **Test Failures**
- Check `TEST_REPAIR_CHECKLIST.md`
- Verify test data matches current structure
- Check for outdated mocks

---

## 📊 **Code Quality Metrics**

### **Current State**
- Type Safety: ~60% (target: 100%)
- SOLID Compliance: ~40% (target: 95%)
- Test Coverage: 57% (target: 95%)
- Files with `any`: 151 files

### **Target State**
- Type Safety: 100%
- SOLID Compliance: 95%
- Test Coverage: 95%
- Files with `any`: 0 files

---

## 🔗 **Useful Commands**

```bash
# Build
npm run build

# Test
npm run test

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Find type errors
npm run lint | grep "any"
```

---

## 📝 **Code Patterns**

### **Service Pattern**
```typescript
interface IServiceName {
  method(): ReturnType;
}

class ServiceName implements IServiceName {
  method(): ReturnType {
    // Implementation
  }
}
```

### **Component Pattern**
```typescript
interface ComponentProps {
  // Props
}

export function ComponentName({ props }: ComponentProps) {
  // Implementation
}
```

### **Type Safety Pattern**
```typescript
// ❌ Bad
const value = (config as any).property;

// ✅ Good
interface Config {
  property: string;
}
const value = (config as Config).property;
```

---

**For more details, see the full documentation in [README.md](./README.md)**

