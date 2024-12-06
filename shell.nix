{ pkgs ? import <nixpkgs> { } }:

with pkgs;
mkShell {
  name = "coc-rime";
  buildInputs = [
    librime
    nodejs
    pkg-config
    xmake
    stdenv.cc
  ];
  # https://github.com/NixOS/nixpkgs/issues/314313#issuecomment-2134252094
  shellHook = ''
    LD="$CC"
  '';
}
