# Tab Scrolling Solution

## Standardized Implementation

The tab-based interface uses a consistent, reliable approach combining proven scrolling patterns with reusable components.

## Core Components

### 1. Layout Constants (`utils/layout/constants.ts`)

```typescript
export const LAYOUT_HEIGHTS = {
  HEADER: 70,      // Unit information banner height
  NAVIGATION: 70,  // Tab navigation bar height  
  get TOTAL_FIXED() {
    return this.HEADER + this.NAVIGATION;
  }
} as const;

export const TAB_CONTENT_HEIGHT = `calc(100vh - ${LAYOUT_HEIGHTS.TOTAL_FIXED}px)`;
export const SCROLLBAR_CLASSES = 'scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800';
```

### 2. TabContentWrapper Component (`components/common/TabContentWrapper.tsx`)

```typescript
import { TAB_CONTENT_HEIGHT, SCROLLBAR_CLASSES } from '../../utils/layout/constants';

export const TabContentWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div 
      className={`bg-slate-900 overflow-auto ${SCROLLBAR_CLASSES} ${className}`}
      style={{ height: TAB_CONTENT_HEIGHT }}
    >
      {children}
    </div>
  );
};
```

## Implementation Patterns

### Standardized Layout Pattern

```tsx
import { TabContentWrapper } from '../../components/common/TabContentWrapper';

return (
  <div className="min-h-screen bg-slate-900 flex flex-col">
    {/* Header */}
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex-shrink-0">
      {/* Header content */}
    </div>

    {/* Tab Navigation */}
    <div className="flex border-b border-slate-700 bg-slate-800 flex-shrink-0">
      {/* Tab buttons */}
    </div>

    {/* Tab Content - Standardized wrapper */}
    <TabContentWrapper>
      <ActiveTabComponent />
    </TabContentWrapper>
  </div>
);
```

### Individual Tab Components

```tsx
const MyTabComponent: React.FC = () => {
  return (
    <div className="p-4">
      {/* Tab content that may exceed viewport height */}
      <div>Long content that scrolls...</div>
    </div>
  );
};
```

## Benefits

### ✅ **Consistency**
- All tabs use identical scrolling infrastructure
- Centralized height calculations prevent inconsistencies
- Standard scrollbar styling across all components

### ✅ **Maintainability**  
- Layout changes require updating only `LAYOUT_HEIGHTS` constants
- No hardcoded values scattered throughout codebase
- Easy to update header/navigation dimensions

### ✅ **Developer Experience**
- Simple component API with clear intent
- TypeScript provides auto-completion and type safety
- ESLint rules prevent regression to manual patterns

### ✅ **Performance**
- Optimized scrolling implementation
- No unnecessary re-renders from manual calculations
- Consistent browser behavior across different tab content

## ESLint Integration

### Automatic Enforcement

Custom ESLint rules prevent common anti-patterns:

```javascript
// ❌ ESLint will flag this
<div style={{ height: 'calc(100vh - 140px)' }}>
  <TabContent />
</div>

// ✅ ESLint recommends this instead
<TabContentWrapper>
  <TabContent />
</TabContentWrapper>
```

### Rules Configuration (`.eslintrc-custom.js`)

```javascript
module.exports = {
  plugins: ['@battletech-editor/layout-standards'],
  rules: {
    '@battletech-editor/layout-standards/no-hardcoded-tab-height': 'warn',
    '@battletech-editor/layout-standards/use-layout-constants': 'warn', 
    '@battletech-editor/layout-standards/prefer-tab-wrapper': 'warn'
  }
};
```

## Migration Guide

### From Manual Pattern

```tsx
// Old: Manual implementation
<div 
  className="bg-slate-900 overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
  style={{ height: 'calc(100vh - 140px)' }}
>
  <TabContent />
</div>

// New: Standardized implementation  
<TabContentWrapper>
  <TabContent />
</TabContentWrapper>
```

### Update Steps

1. **Import the wrapper**: `import { TabContentWrapper } from '../../components/common/TabContentWrapper';`
2. **Replace manual containers**: Wrap tab content in `<TabContentWrapper>`
3. **Remove hardcoded styles**: Delete manual height calculations
4. **Test scrolling**: Verify behavior across all tabs

## Height Calculation Reference

| Component | Height | Purpose |
|-----------|--------|---------|
| Header Banner | 70px | Unit information display |
| Tab Navigation | 70px | Tab selection interface |
| **Total Fixed** | **140px** | **Combined header space** |
| **Content Area** | **`calc(100vh - 140px)`** | **Available scrolling space** |

## Troubleshooting

### Issue: Tab content doesn't scroll
**Solution**: Ensure you're using `TabContentWrapper` and the main container uses proper flexbox layout (`flex flex-col`).

### Issue: Dead space appears  
**Solution**: Check that header/navigation use `flex-shrink-0` and heights match `LAYOUT_HEIGHTS` constants.

### Issue: Inconsistent scrollbar styling
**Solution**: Use `TabContentWrapper` instead of custom scrolling implementations.

### Issue: Height calculation is wrong
**Solution**: Verify `LAYOUT_HEIGHTS` constants match actual header and navigation heights. Update constants if layout changes.

## Advanced Usage

### Custom Height Calculations

```typescript
import { calculateTabHeight } from '../../utils/layout/constants';

// For components with additional fixed elements
const customHeight = calculateTabHeight(30); // Extra 30px offset
```

### Conditional Styling

```tsx
<TabContentWrapper className={isCompact ? 'p-2' : 'p-4'}>
  <TabContent />
</TabContentWrapper>
```

## Maintenance Guidelines

### When Updating Layout Dimensions

1. **Update constants**: Modify `LAYOUT_HEIGHTS` in `utils/layout/constants.ts`
2. **Verify components**: Ensure all tabs use `TabContentWrapper`
3. **Test scrolling**: Check behavior across all tabs and screen sizes
4. **Update documentation**: Document any breaking changes

### Adding New Tabs

1. **Use TabContentWrapper**: Wrap all new tab content
2. **Follow patterns**: Use established component structure
3. **Test thoroughly**: Verify scrolling with various content lengths
4. **Check ESLint**: Ensure no rule violations

This standardized approach ensures consistent user experience while preventing layout regression issues.
