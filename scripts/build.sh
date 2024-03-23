#!/usr/bin/env bash
set -e
cd "$(dirname "$(readlink -f "$0")")/.."

gyp binding.gyp --depth=. --generator-output=build
make -Cbuild
mkdir -p build/Release
ln -sf ../out/Default/rime_cli build/Release
