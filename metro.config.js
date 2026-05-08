const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList =
  /.*\/android\/(?:app\/)?\.cxx\/.*|.*\/node_modules\/.*\/android\/\.cxx\/.*|.*\/android\/build\/.*|.*\/node_modules\/.*\/android\/build\/.*/;

module.exports = config;
