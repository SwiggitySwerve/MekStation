# Tasks: Hex Grid System

## 1. Coordinate System

- [x] 1.1 Define HexCoordinate type (q, r axial)
- [x] 1.2 Implement coordinate arithmetic (add, subtract)
- [x] 1.3 Implement distance calculation
- [x] 1.4 Implement neighbor calculation
- [x] 1.5 Write tests for coordinate math

## 2. Hex Grid

- [x] 2.1 Define IHexGrid interface
- [x] 2.2 Implement grid creation (size, bounds)
- [x] 2.3 Implement hex lookup by coordinate
- [x] 2.4 Implement bounds checking
- [x] 2.5 Write tests for grid operations

## 3. Unit Positioning

- [x] 3.1 Define IUnitPosition interface
- [x] 3.2 Implement position assignment
- [x] 3.3 Implement facing (0-5)
- [x] 3.4 Implement prone state
- [x] 3.5 Write tests for positioning

## 4. Facing and Arcs

- [x] 4.1 Define facing directions (N, NE, SE, S, SW, NW)
- [x] 4.2 Implement front arc calculation (3 hexes)
- [x] 4.3 Implement side arc calculation (2 hexes each)
- [x] 4.4 Implement rear arc calculation (3 hexes)
- [x] 4.5 Implement target arc determination
- [x] 4.6 Write tests for arc calculations

## 5. Movement

- [x] 5.1 Implement movement cost (1 MP per hex)
- [x] 5.2 Implement running movement (+50% MP)
- [x] 5.3 Implement jump movement (any hex in range)
- [x] 5.4 Implement facing changes (free)
- [x] 5.5 Implement backward movement
- [x] 5.6 Write tests for movement calculations

## 6. Path Finding

- [x] 6.1 Implement valid destination calculation
- [x] 6.2 Implement shortest path (for display)
- [x] 6.3 Calculate MP cost for path
- [x] 6.4 Write tests for path finding

## 7. Range Calculation

- [x] 7.1 Implement range between units
- [x] 7.2 Implement range bracket determination (short/medium/long)
- [x] 7.3 Implement line-of-sight (basic, no terrain)
- [x] 7.4 Write tests for range calculations

## 8. Map Rendering (Basic)

- [ ] 8.1 Create HexMapRenderer component
- [ ] 8.2 Implement hex drawing (SVG)
- [ ] 8.3 Implement unit token rendering
- [ ] 8.4 Implement facing indicator
- [ ] 8.5 Implement selection highlight
- [ ] 8.6 Implement movement range overlay

Note: Section 8 (Map Rendering) deferred to add-gameplay-ui as it is a UI component.
