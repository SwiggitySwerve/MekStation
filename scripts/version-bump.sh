#!/bin/bash
# version-bump.sh - Manual version bump script
# Usage: ./scripts/version-bump.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default bump type
BUMP_TYPE=${1:-patch}

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid bump type '$BUMP_TYPE'${NC}"
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

echo -e "${BLUE}🔍 Fetching tags...${NC}"
git fetch --tags

# Get the latest version tag (excluding pre-release)
LATEST_TAG=$(git tag -l "v*" --sort=-version:refname | grep -E "^v[0-9]+\.[0-9]+\.[0-9]+$" | head -n 1)

if [ -z "$LATEST_TAG" ]; then
    echo -e "${YELLOW}No previous version tag found, starting at v0.0.0${NC}"
    LATEST_TAG="v0.0.0"
fi

echo -e "${BLUE}📌 Latest version: ${GREEN}$LATEST_TAG${NC}"

# Parse version components
VERSION=${LATEST_TAG#v}
MAJOR=$(echo $VERSION | cut -d. -f1)
MINOR=$(echo $VERSION | cut -d. -f2)
PATCH=$(echo $VERSION | cut -d. -f3)

# Calculate new version
case $BUMP_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"

echo -e "${BLUE}📦 Bump type: ${YELLOW}$BUMP_TYPE${NC}"
echo -e "${BLUE}🆕 New version: ${GREEN}$NEW_VERSION${NC}"

# Check if tag already exists
if git rev-parse "$NEW_VERSION" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag $NEW_VERSION already exists!${NC}"
    exit 1
fi

# Confirm with user
echo ""
read -p "Create and push tag $NEW_VERSION? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Make sure we're on main and up to date
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo -e "${YELLOW}⚠️  Warning: You're not on main branch (current: $CURRENT_BRANCH)${NC}"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Aborted.${NC}"
            exit 1
        fi
    fi
    
    # Pull latest changes
    echo -e "${BLUE}📥 Pulling latest changes...${NC}"
    git pull origin $CURRENT_BRANCH
    
    # Create annotated tag
    echo -e "${BLUE}🏷️  Creating tag...${NC}"
    git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
    
    # Push tag
    echo -e "${BLUE}🚀 Pushing tag...${NC}"
    git push origin "$NEW_VERSION"
    
    echo ""
    echo -e "${GREEN}✅ Successfully created and pushed $NEW_VERSION${NC}"
    echo -e "${BLUE}📋 The release workflow will now build and publish artifacts.${NC}"
    echo -e "${BLUE}🔗 Check progress at: https://github.com/\$(git remote get-url origin | sed 's/.*github.com[:/]//;s/.git$//')/actions${NC}"
else
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

