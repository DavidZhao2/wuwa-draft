const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('new feature surfaces start hidden and Classic rendering hides every addition', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  assert.match(html, /id="featureStrip" hidden/);
  assert.match(html, /id="intelligencePanel" hidden/);
  assert.match(html, /id="autoBuildBar" hidden/);
  assert.match(html, /\$\('featureStrip'\)\.hidden=!state\|\|!labels\.length/);
  assert.match(html, /\$\('intelligencePanel'\)\.hidden=!visible/);
  assert.match(html, /\$\('autoBuildBar'\)\.hidden=!autoEnabled/);
});

test('Classic mode does not render lock controls or analyzer tabs', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  assert.match(html, /const lockControl=autoEnabled\?/);
  assert.match(html, /if\(features\.analyzer\)tabs\.push/);
  assert.match(html, /if\(features\.winProbability\)tabs\.push/);
});
