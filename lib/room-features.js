const DEFAULT_FEATURES = Object.freeze({ autoBuild: true, analyzer: true, winProbability: true });

function sanitizeFeatures(value) {
  const source = value && typeof value === 'object' ? value : DEFAULT_FEATURES;
  return {
    autoBuild: source.autoBuild !== false,
    analyzer: source.analyzer !== false,
    winProbability: source.winProbability !== false
  };
}

function isClassic(features) {
  const normalized = sanitizeFeatures(features);
  return !normalized.autoBuild && !normalized.analyzer && !normalized.winProbability;
}

function settingsLocked(room) {
  return Boolean(room.ready || room.countdownEndsAt || room.coinFlipEndsAt || room.history?.length);
}

function canConfigure(role, room) {
  return role === 'A' && !settingsLocked(room);
}

module.exports = { DEFAULT_FEATURES, sanitizeFeatures, isClassic, settingsLocked, canConfigure };
