#!/bin/bash
# ==============================================================================
# mm-data Asset Sync Script
# 
# Syncs assets from the mm-data repository to MekStation's public folder.
# Supports both development (sibling repo) and CI (environment variable) paths.
#
# Usage:
#   npm run sync:mm-data
#   ./scripts/sync-mm-data-assets.sh [--verbose] [--dry-run]
#
# @spec openspec/changes/integrate-mm-data-assets/proposal.md
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script options
VERBOSE=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

log() {
    if [ "$VERBOSE" = true ]; then
        echo -e "$1"
    fi
}

# Determine mm-data source path
# Priority: 1) MM_DATA_PATH env var, 2) Sibling directory, 3) npm package (future)
if [ -n "$MM_DATA_PATH" ]; then
    MM_DATA_SOURCE="$MM_DATA_PATH"
    log "${GREEN}Using MM_DATA_PATH: $MM_DATA_SOURCE${NC}"
elif [ -d "../mm-data/data/images/recordsheets" ]; then
    MM_DATA_SOURCE="../mm-data/data/images/recordsheets"
    log "${GREEN}Found mm-data at sibling path${NC}"
else
    echo -e "${RED}Error: mm-data repository not found${NC}"
    echo "Please either:"
    echo "  1. Clone mm-data as a sibling directory: git clone https://github.com/MegaMek/mm-data.git ../mm-data"
    echo "  2. Set MM_DATA_PATH environment variable to the recordsheets directory"
    exit 1
fi

# Destination path
DEST="public/record-sheets"

# Verify source exists
if [ ! -d "$MM_DATA_SOURCE" ]; then
    echo -e "${RED}Error: Source directory does not exist: $MM_DATA_SOURCE${NC}"
    exit 1
fi

echo -e "${GREEN}Syncing mm-data assets...${NC}"
echo "  Source: $MM_DATA_SOURCE"
echo "  Destination: $DEST"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] No files will be modified${NC}"
fi

# Create destination directories
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$DEST/templates_us"
    mkdir -p "$DEST/templates_iso"
    mkdir -p "$DEST/templates"
fi

# ==============================================================================
# Sync Record Sheet Templates
# ==============================================================================
echo ""
echo "Syncing record sheet templates..."

# Mech templates (US Letter size)
MECH_TEMPLATES=(
    "mek_biped_default.svg"
    "mek_biped_toheat.svg"
    "mek_quad_default.svg"
    "mek_quad_toheat.svg"
    "mek_tripod_default.svg"
    "mek_tripod_toheat.svg"
    "mek_lam_default.svg"
    "mek_lam_toheat.svg"
    "mek_quadvee_default.svg"
    "mek_quadvee_toheat.svg"
)

for template in "${MECH_TEMPLATES[@]}"; do
    if [ -f "$MM_DATA_SOURCE/templates_us/$template" ]; then
        if [ "$DRY_RUN" = false ]; then
            cp "$MM_DATA_SOURCE/templates_us/$template" "$DEST/templates_us/"
            # Also copy default template to legacy templates/ folder for compatibility
            if [[ "$template" == *"_default.svg" ]]; then
                cp "$MM_DATA_SOURCE/templates_us/$template" "$DEST/templates/"
            fi
        fi
        log "  ${GREEN}✓${NC} $template"
    else
        log "  ${YELLOW}!${NC} $template (not found)"
    fi
done

# ISO A4 templates
for template in "${MECH_TEMPLATES[@]}"; do
    if [ -f "$MM_DATA_SOURCE/templates_iso/$template" ]; then
        if [ "$DRY_RUN" = false ]; then
            cp "$MM_DATA_SOURCE/templates_iso/$template" "$DEST/templates_iso/"
        fi
        log "  ${GREEN}✓${NC} templates_iso/$template"
    fi
done

# ==============================================================================
# Sync Biped Pips
# ==============================================================================
echo ""
echo "Syncing biped armor and structure pips..."

if [ -d "$MM_DATA_SOURCE/biped_pips" ]; then
    # Count files
    FILE_COUNT=$(find "$MM_DATA_SOURCE/biped_pips" -name "*.svg" | wc -l)
    
    if [ "$DRY_RUN" = false ]; then
        # Copy all pip SVGs, replacing any existing
        cp -r "$MM_DATA_SOURCE/biped_pips/"*.svg "$DEST/biped_pips/" 2>/dev/null || true
    fi
    
    echo -e "  ${GREEN}✓${NC} Synced $FILE_COUNT biped pip files"
else
    echo -e "  ${YELLOW}!${NC} biped_pips directory not found"
fi

# ==============================================================================
# Sync Quad Pips (if available)
# ==============================================================================
if [ -d "$MM_DATA_SOURCE/quad_pips" ]; then
    echo ""
    echo "Syncing quad armor and structure pips..."
    
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$DEST/quad_pips"
        cp -r "$MM_DATA_SOURCE/quad_pips/"*.svg "$DEST/quad_pips/" 2>/dev/null || true
    fi
    
    FILE_COUNT=$(find "$MM_DATA_SOURCE/quad_pips" -name "*.svg" 2>/dev/null | wc -l)
    echo -e "  ${GREEN}✓${NC} Synced $FILE_COUNT quad pip files"
fi

# ==============================================================================
# Create version manifest
# ==============================================================================
echo ""
echo "Creating version manifest..."

if [ "$DRY_RUN" = false ]; then
    # Get mm-data git info if available
    MM_DATA_VERSION="unknown"
    MM_DATA_COMMIT="unknown"
    MM_DATA_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [ -d "../mm-data/.git" ]; then
        pushd "../mm-data" > /dev/null
        MM_DATA_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        MM_DATA_DATE=$(git log -1 --format=%cI 2>/dev/null || echo "$MM_DATA_DATE")
        popd > /dev/null
    fi
    
    cat > "$DEST/mm-data-version.json" << EOF
{
  "syncedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "mmDataCommit": "$MM_DATA_COMMIT",
  "mmDataDate": "$MM_DATA_DATE",
  "syncScript": "scripts/sync-mm-data-assets.sh"
}
EOF
    echo -e "  ${GREEN}✓${NC} Created mm-data-version.json"
fi

# ==============================================================================
# Summary
# ==============================================================================
echo ""
echo -e "${GREEN}Asset sync complete!${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This was a dry run. Run without --dry-run to apply changes.${NC}"
fi
