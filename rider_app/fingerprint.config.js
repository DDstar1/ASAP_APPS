const { SourceSkips } = require("expo/fingerprint");

// extra holds the Rust URL and keys, read by JS at runtime; leaving it out
// means a new tunnel URL ships as an update instead of needing a rebuild
/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips:
    SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun |
    SourceSkips.ExpoConfigExtraSection,
};
