#!/bin/bash
# BattleTech Editor - Post-installation script for Linux

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

# Update mime database
if command -v update-mime-database &> /dev/null; then
    update-mime-database /usr/share/mime || true
fi

echo "BattleTech Editor installed successfully!"
