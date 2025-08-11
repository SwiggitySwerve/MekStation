# BattleTech Editor App

A Next.js application for editing and managing BattleTech units and equipment data.

## Docker Setup with SQLite Database

The application has been configured to use SQLite as the database backend with automatic initialization from MekFiles JSON data.

### Key Features

- **Automatic Database Initialization**: On first container startup, the database is automatically created and populated from MekFiles JSON data
- **Persistent Data**: Database is stored in Docker volumes for data persistence
- **One-time Setup**: Database population only happens once when the database doesn't exist
- **Health Checks**: Built-in health checks to verify database connectivity
- **Development & Production Ready**: Works in both development and production environments

### Quick Start

1. **Build and start the application:**
   ```bash
   docker-compose up --build
   ```

2. **The container will automatically:**
   - Check if the SQLite database exists
   - If not found, create the database schema
   - Populate the database with data from MekFiles JSON files
   - Start the Next.js application

3. **Access the application:**
   - Open your browser to `http://localhost:3000`

### Architecture

#### Database Initialization Flow

```
Container Start
     ↓
Check if SQLite DB exists
     ↓
   No ←→ Yes
     ↓      ↓
Create DB   Skip Init
     ↓      ↓
Run populate_db.py
     ↓      ↓
Start Next.js App ←
```

#### Key Files

- **`battletech-editor-app/Dockerfile`**: Multi-stage build with runtime initialization
- **`battletech-editor-app/scripts/init-db.sh`**: Database initialization script
- **`battletech-editor-app/data/populate_db.py`**: Python script to populate SQLite from JSON
- **`battletech-editor-app/services/db.ts`**: Database service with Docker-aware paths
- **`docker-compose.yml`**: Orchestration with SQLite volumes

### Database Schema

The SQLite database includes the following main tables:

- **`equipment`**: All equipment data from derivedEquipment.json
- **`units`**: All unit data from MekFiles JSON files
- **`unit_validation_options`**: Unit validation configuration

### Environment Variables

The following environment variables are available:

- `NODE_ENV`: Set to `production` in Docker
- `DATABASE_URL`: SQLite database connection string
- `DB_PATH`: Path to SQLite database file
- `DB_TYPE`: Database type (set to `sqlite`)

### Development vs Production

#### Development (Local)
```bash
# Database path: ./data/battletech_dev.sqlite
npm run dev
```

#### Production (Docker)
```bash
# Database path: /usr/src/app/battletech_dev.sqlite
docker-compose up
```

### Volumes

The Docker setup uses two volumes for data persistence:

- **`sqlite_data`**: Stores the data directory and related files
- **`battletech_db`**: Stores the SQLite database file directly

### Health Checks

The container includes a health check that runs every 30 seconds:
- Tests database connectivity
- Validates table existence
- Counts records in main tables

### Troubleshooting

#### Database Issues

1. **Check database file exists:**
   ```bash
   docker-compose exec app ls -la /usr/src/app/battletech_dev.sqlite
   ```

2. **Run database test manually:**
   ```bash
   docker-compose exec app node /usr/src/app/scripts/test-db.js
   ```

3. **Check initialization logs:**
   ```bash
   docker-compose logs app
   ```

#### Force Database Reinitialization

To force a complete database rebuild:

1. **Stop the container:**
   ```bash
   docker-compose down
   ```

2. **Remove the database volume:**
   ```bash
   docker volume rm megameklab_battletech_db
   ```

3. **Restart:**
   ```bash
   docker-compose up --build
   ```

### Data Sources

The application populates the database from the following JSON files:

- **`derivedEquipment.json`**: Equipment definitions
- **`UnitVerifierOptions.json`**: Unit validation settings
- **Unit Files**: All `.json` files in the mekfiles directory structure

### Performance

- **Database Size**: Typically 50-200MB depending on data
- **Initialization Time**: 30-120 seconds for full data population
- **Memory Usage**: ~100MB for SQLite operations during initialization

### Security

- **Non-root User**: Container runs as `appuser` (non-root)
- **Read-only Database**: Application can open database in read-only mode
- **Volume Permissions**: Proper file ownership and permissions

## API Endpoints

The application provides REST API endpoints for accessing the database:

- `GET /api/units` - List units with filtering and pagination
- `GET /api/units/[id]` - Get specific unit details
- `GET /api/equipment` - List equipment with filtering
- `GET /api/equipment/[id]` - Get specific equipment details

## Unified Catalog (Equipment + Components)

Use the Catalog Gateway anywhere in the app to search across equipment and construction components with tech-aware composite filters.

```ts
import { CatalogGateway } from '@/services/catalog'

// Optionally set context once
await CatalogGateway.setContext({ techBase: 'Inner Sphere', unitType: 'BattleMech', year: 3068, rulesLevel: 'Standard' })

// Search
const result = await CatalogGateway.search({ text: 'ER Medium', categories: ['Energy Weapons'], page: 1, pageSize: 25 })

// Get by id
const item = await CatalogGateway.getById('medium_laser_is')
```

React hook:

```ts
import { useCatalog } from '@/hooks/catalog/useCatalog'

const { search, getById, setContext } = useCatalog({ techBase: 'Clan', unitType: 'BattleMech' })
```

API endpoint:
- GET `/api/catalog?text=er%20medium&techBase=Inner%20Sphere&unitType=BattleMech&page=1&pageSize=25`

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: SQLite 3
- **Styling**: Tailwind CSS
- **Containerization**: Docker, Docker Compose
- **Data Processing**: Python 3 for database population

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `docker-compose up --build`
5. Submit a pull request

## License

[Add your license information here]
