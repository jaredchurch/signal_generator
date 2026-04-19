#!/usr/bin/bash
# Post-start script: runs each time the container starts
set -e

# Install npm dependencies if not already present
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start the development server
# npm run dev