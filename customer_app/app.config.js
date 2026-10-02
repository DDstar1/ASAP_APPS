// Values come from the repo-root .env locally, or from EAS environment
// variables in cloud builds (.env is gitignored and never uploaded).
// Only public values belong here — everything in `extra` ships inside the app.
const fs = require("fs");
const path = require("path");

function loadRootEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const [, key, raw = ""] = match;
    if (process.env[key] === undefined) {
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

loadRootEnv();

// Firebase config for Android push (FCM). In EAS, upload it as a "file"
// environment variable named GOOGLE_SERVICES_JSON; locally, drop the file
// next to this one. Without it the build works but Android gets no pushes.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  (fs.existsSync(path.resolve(__dirname, "google-services.json"))
    ? "./google-services.json"
    : undefined);

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      // Google Maps SDK for iOS (MapView uses PROVIDER_GOOGLE on both platforms)
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
    },
  },
  android: {
    ...config.android,
    ...(googleServicesFile && { googleServicesFile }),
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_API_KEY },
    },
  },
  extra: {
    ...config.extra,
    googleMapsApiKey: process.env.GOOGLE_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    rustApiUrl: process.env.RUST_API_URL || undefined,
    websiteUrl: process.env.WEBSITE_URL || undefined,
  },
});
