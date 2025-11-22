# BattleTech Editor App

A Next.js application for editing and managing BattleTech units and equipment data.

## Features

- **Unit Customization**: Advanced BattleTech unit customization with critical slot management
- **Equipment Management**: Comprehensive equipment browser and allocation system
- **Multi-Unit Support**: Manage multiple unit configurations simultaneously
- **Real-time Validation**: Live validation of unit configurations and equipment placement
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Open your browser to `http://localhost:3000`

## Architecture

The application uses a modern React-based architecture with:

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API with custom hooks
- **Data**: JSON-based mock data for development and testing

## API Endpoints

The application provides REST API endpoints for accessing data:

- `GET /api/units` - List units with filtering and pagination
- `GET /api/equipment` - List equipment with filtering and pagination
- `GET /api/custom-variants` - List custom unit variants
- `GET /api/custom-variants/[id]` - Get specific variant details
- `GET /api/meta/categories` - Get unit categories
- `GET /api/meta/unit_eras` - Get unit eras
- `GET /api/meta/unit_tech_bases` - Get unit tech bases
- `GET /api/meta/equipment_categories` - Get equipment categories
- `GET /api/meta/equipment_eras` - Get equipment eras
- `GET /api/meta/equipment_tech_bases` - Get equipment tech bases

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Project Structure

```
├── components/          # React components
│   ├── common/         # Shared components
│   ├── criticalSlots/  # Critical slot management
│   ├── editor/         # Unit editing components
│   ├── equipment/      # Equipment management
│   ├── multiUnit/      # Multi-unit support
│   └── overview/       # Unit overview
├── pages/              # Next.js pages and API routes
├── services/           # Business logic services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── public/mockdata/    # Mock data for development
```

## Project Documentation & Status

**🚨 CRITICAL REFERENCES (Start Here)**

*   **[🎯 PRIORITIZED WORK](docs/PRIORITIZED_WORK.md)**: Master list of active tasks and priorities.
*   **[⚡ QUICK REFERENCE](docs/QUICK_REFERENCE.md)**: High-level index and cheat sheet.
*   **[🏗️ 2025 REFACTOR HANDOFF](docs/HANDOFF_REFACTOR_2025.md)**: Core architectural reference.
*   **[📅 IMPLEMENTATION PLAN](docs/implementation/2025-hand-off-implementation-plan.md)**: Step-by-step execution plan.

**Additional Active Guides**
*   **[Type System Best Practices](docs/guidelines/TYPE_SYSTEM_BEST_PRACTICES.md)**: 🛡️ Strict typing standards (MANDATORY).
*   **[Naming Conventions](docs/refactoring/NAMING_REFACTORING_PLAN.md)**: Standardized naming guide.
*   **[Cleanup Candidates](docs/project-history/CLEANUP_CANDIDATES.md)**: List of code scheduled for deletion/refactoring.

## BattleTech Rules Documentation

**⚠️ IMPORTANT for Developers and AI Agents**: This project implements official BattleTech construction rules. Always reference the rules documentation when working on BattleTech-related code.

### **Quick Links**
- **[Agent Reference Guide](docs/battletech/AGENTS_README.md)** - Start here for rules documentation
- **[Rules Master Index](docs/battletech/agents/00-INDEX.md)** - Complete rules overview
- **[Quick Reference](docs/battletech/reference/quick-reference.md)** - Common formulas and tables
- **[Rules Reference](docs/battletech/RULES_REFERENCE.md)** - Quick lookup for agents

### **Key Files**
- **Rules Constants**: `constants/BattleTechConstructionRules.ts` - Single source of truth
- **Validation**: `services/ConstructionRulesValidator.ts` - Rule enforcement
- **Documentation**: `docs/battletech/` - Complete rules documentation

### **Before Making Changes**
1. ✅ Read relevant rules documentation
2. ✅ Check `constants/BattleTechConstructionRules.ts`
3. ✅ Review validation services
4. ✅ Ensure changes match official BattleTech rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. **Review BattleTech rules documentation** (see above)
4. Make your changes
5. Add tests if applicable
6. Submit a pull request

## License

This project is licensed under the MIT License.