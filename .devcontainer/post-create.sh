#!/usr/bin/bash
# Post-create script: runs once when the container is first created
set -e

# Install opencode CLI
curl -fsSL https://opencode.ai/install | bash

# Configure opencode with the big-pickle model
# mkdir -p ~/.config/opencode
# printf '%s\n' '{' '  "$schema": "https://opencode.ai/config.json",' '  "model": "opencode/big-pickle"' '}' > ~/.config/opencode/opencode.json

# Install GitHub CLI if not already present
if ! command -v gh &> /dev/null; then
    echo "Installing GitHub CLI..."
    sudo mkdir -p /var/lib/apt/lists/partial
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y gh
fi

# Install npm dependencies if not already present
if [ ! -d "node_modules" ]; then
    npm install
fi


### End of File
