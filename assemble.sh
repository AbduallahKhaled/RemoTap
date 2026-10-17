#!/bin/sh
# Old entry point, kept for habit: builds the upload package. Usage: ./assemble.sh --domain=yourdomain.com
set -e
node scripts/package.mjs "$@"
