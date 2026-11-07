#!/bin/bash
# Apre Blender con il ponte in tempo reale verso Claude (comandi in blender/comandi/)
cd "$(dirname "$0")" && open -a /Applications/Blender.app --args --python "$(pwd)/ponte.py"
