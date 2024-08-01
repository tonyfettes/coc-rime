{ pkgs ? import <nixpkgs> { } }:

with pkgs;
mkShell {
  name = "coc-rime";
  buildInputs = [
    librime
    nodejs
    pkg-config
    python3
    stdenv.cc
  ];
}
