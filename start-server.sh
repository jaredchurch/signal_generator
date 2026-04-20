#!/bin/bash

PORT=${1:-3005}
cd "$(dirname "$0")"
npx serve -l "$PORT" .