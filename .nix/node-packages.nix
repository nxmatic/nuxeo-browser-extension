# This file has been generated by node2nix 1.11.1. Do not edit!

{nodeEnv, fetchurl, fetchgit, nix-gitignore, stdenv, lib, globalBuildInputs ? []}:

let
  sources = {
    "pnpm-8.15.4" = {
      name = "pnpm";
      packageName = "pnpm";
      version = "8.15.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/pnpm/-/pnpm-8.15.4.tgz";
        sha512 = "C9Opvp6w6aaSZ23uwAowO6IYuiedmSQUdWFrOY267t0RFG+SwoQ0WPVXsdEn4J1MFx4QW9zWthACs5aFqAFrng==";
      };
    };
  };
  args = {
    name = "mypackage";
    packageName = "mypackage";
    version = "1.0.0";
    src = ./.;
    dependencies = [
      sources."pnpm-8.15.4"
    ];
    buildInputs = globalBuildInputs;
    meta = {
    };
    production = true;
    bypassCache = true;
    reconstructLock = true;
  };
in
{
  args = args;
  sources = sources;
  tarball = nodeEnv.buildNodeSourceDist args;
  package = nodeEnv.buildNodePackage args;
  shell = nodeEnv.buildNodeShell args;
  nodeDependencies = nodeEnv.buildNodeDependencies (lib.overrideExisting args {
    src = stdenv.mkDerivation {
      name = args.name + "-package-json";
      src = nix-gitignore.gitignoreSourcePure [
        "*"
        "!package.json"
        "!package-lock.json"
      ] args.src;
      dontBuild = true;
      installPhase = "mkdir -p $out; cp -r ./* $out;";
    };
  });
}
