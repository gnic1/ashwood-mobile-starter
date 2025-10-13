/**
 * app.config.js — local dev config that disables OTA updates.
 * Keeps everything else from app.json (if present).
 */
const fs = require("fs");

function readJsonIfExists(path) {
  try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch { return {}; }
}

module.exports = ({ config }) => {
  // Merge with app.json if it exists so we don't lose fields
  const base = Object.assign({}, readJsonIfExists("./app.json"), config || {});

  return {
    ...base,
    updates: {
      ...(base.updates || {}),
      // The important bits for local dev:
      enabled: false,                 // ignore OTA entirely in dev
      checkAutomatically: "NEVER",    // don't check on app load
      fallbackToCacheTimeout: 0,      // don't wait for remote
    },
  };
};
