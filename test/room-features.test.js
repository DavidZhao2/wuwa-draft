const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_FEATURES, sanitizeFeatures, isClassic, settingsLocked, canConfigure } = require('../lib/room-features');
const { featureCombinations } = require('../public/intelligence');

test('new and backward-compatible rooms default all features on', () => {
  assert.deepEqual(sanitizeFeatures(), DEFAULT_FEATURES);
  assert.deepEqual(sanitizeFeatures({}), DEFAULT_FEATURES);
});

test('all eight independent feature combinations survive normalization', () => {
  const combinations = featureCombinations();
  assert.equal(combinations.length, 8);
  for (const combination of combinations) assert.deepEqual(sanitizeFeatures(combination), combination);
  assert.equal(combinations.filter(isClassic).length, 1);
});

test('only the host can configure settings before the draft locks', () => {
  const lobby = { ready: false, countdownEndsAt: null, coinFlipEndsAt: null, history: [] };
  assert.equal(canConfigure('A', lobby), true);
  assert.equal(canConfigure('B', lobby), false);
  assert.equal(canConfigure('spectator', lobby), false);
  for (const room of [
    { ...lobby, countdownEndsAt: 1 },
    { ...lobby, coinFlipEndsAt: 1 },
    { ...lobby, ready: true },
    { ...lobby, history: [{}] }
  ]) {
    assert.equal(settingsLocked(room), true);
    assert.equal(canConfigure('A', room), false);
  }
});
