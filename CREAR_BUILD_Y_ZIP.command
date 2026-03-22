#!/bin/bash
# Double-click this file to create the build and a zip on your Desktop.
# No need to open Terminal yourself.

cd "$(dirname "$0")/frontend" || exit 1

echo "Removing old install (so ajv fix applies)..."
rm -rf node_modules package-lock.json 2>/dev/null || true

echo "Installing dependencies..."
echo "(First time can take 5-15 min. You will see package names below.)"
echo ""
npm install --legacy-peer-deps --loglevel=info

echo "Building..."
npm run build

if [ ! -d "build" ]; then
  echo "Build failed. Check the messages above."
  read -p "Press Enter to close."
  exit 1
fi

ZIP_NAME="XamoxFlow-build.zip"
ZIP_PATH="$HOME/Desktop/$ZIP_NAME"
rm -f "$ZIP_PATH"
cd build && zip -r "$ZIP_PATH" . && cd ..

echo ""
echo "Done! $ZIP_NAME is on your Desktop."
open "$HOME/Desktop"
read -p "Press Enter to close."
