/**
 * Metro configuration for GymFlow Mobile.
 * Uses expo/metro-config with support for mjs/cjs and custom asset extensions.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support MSW and ESM packages that ship .mjs
config.resolver.sourceExts.push('mjs', 'cjs');

// Explicitly register bundled font, image, and wasm formats
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'ttf', 'otf', 'wasm');

// Ignore native build artifacts from Metro file watching
config.resolver.blockList = [
  /.*[/\\]android[/\\].*[/\\]build[/\\].*/,
  /.*[/\\]ios[/\\].*[/\\]build[/\\].*/,
];

module.exports = config;
