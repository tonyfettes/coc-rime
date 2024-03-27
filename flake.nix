{
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        with nixpkgs.legacyPackages.${system};
        {
          formatter = nixpkgs-fmt;
          packages.default = stdenv.mkDerivation rec {
            name = "rime-cli-server";
            src = self;
            buildInputs = [
              pkg-config
              json_c.dev
              librime
              nodejs
              (
                python3.withPackages (
                  p: with p; [
                    gyp
                  ]
                )
              )
            ];
            # FIXME: don't use `npm rebuild` due to
            # https://discourse.nixos.org/t/npm-build-will-call-node-gyp-install-which-install-files-to-cache-and-nixos-dont-allow-it/42272
            buildPhase = ''
              gyp binding.gyp --depth=. --generator-output=build
              make -Cbuild
            '';
            installPhase = ''
              install -D build/out/Default/rime_cli -t $out/bin
            '';
          };
        }
      );
}
