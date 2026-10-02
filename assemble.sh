#!/bin/sh
# Build the Next.js store and put it together with the PHP backend in ./dist
set -e
npm run build
rm -rf dist && mkdir dist
cp -r out/. dist/
cp -r backend/. dist/
rm -rf dist/_not-found dist/_not-found.html dist/_not-found.txt
