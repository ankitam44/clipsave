const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some dependencies (e.g. zustand) ship an ESM build behind the "import"
// exports condition that uses raw `import.meta`, which breaks Metro's
// non-module web bundle. Falling back to "main"/"browser" field
// resolution avoids picking that build up.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
