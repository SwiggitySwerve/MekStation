# Tasks: Hex Grid System

## 1. Coordinate System
- [ ] 1.1 Define HexCoordinate type (q, r axial)
- [ ] 1.2 Implement coordinate arithmetic (add, subtract)
- [ ] 1.3 Implement distance calculation
- [ ] 1.4 Implement neighbor calculation
- [ ] 1.5 Write tests for coordinate math

## 2. Hex Grid
- [ ] 2.1 Define IHexGrid interface
- [ ] 2.2 Implement grid creation (size, bounds)
- [ ] 2.3 Implement hex lookup by coordinate
- [ ] 2.4 Implement bounds checking
- [ ] 2.5 Write tests for grid operations

## 3. Unit Positioning
- [ ] 3.1 Define IUnitPosition interface
- [ ] 3.2 Implement position assignment
- [ ] 3.3 Implement facing (0-5)
- [ ] 3.4 Implement prone state
- [ ] 3.5 Write tests for positioning

## 4. Facing and Arcs
- [ ] 4.1 Define facing directions (N, NE, SE, S, SW, NW)
- [ ] 4.2 Implement front arc calculation (3 hexes)
- [ ] 4.3 Implement side arc calculation (2 hexes each)
- [ ] 4.4 Implement rear arc calculation (3 hexes)
- [ ] 4.5 Implement target arc determination
- [ ] 4.6 Write tests for arc calculations

## 5. Movement
- [ ] 5.1 Implement movement cost (1 MP per hex)
- [ ] 5.2 Implement running movement (+50% MP)
- [ ] 5.3 Implement jump movement (any hex in range)
- [ ] 5.4 Implement facing changes (free)
- [ ] 5.5 Implement backward movement
- [ ] 5.6 Write tests for movement calculations

## 6. Path Finding
- [ ] 6.1 Implement valid destination calculation
- [ ] 6.2 Implement shortest path (for display)
- [ ] 6.3 Calculate MP cost for path
- [ ] 6.4 Write tests for path finding

## 7. Range Calculation
- [ ] 7.1 Implement range between units
- [ ] 7.2 Implement range bracket determination (short/medium/long)
- [ ] 7.3 Implement line-of-sight (basic, no terrain)
- [ ] 7.4 Write tests for range calculations

## 8. Map Rendering (Basic)
- [ ] 8.1 Create HexMapRenderer component
- [ ] 8.2 Implement hex drawing (SVG)
- [ ] 8.3 Implement unit token rendering
- [ ] 8.4 Implement facing indicator
- [ ] 8.5 Implement selection highlight
- [ ] 8.6 Implement movement range overlay
