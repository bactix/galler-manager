const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Drizzle migrations import .sql files.
config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./global.css" });
