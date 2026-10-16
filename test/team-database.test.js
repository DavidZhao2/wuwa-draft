const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const database = require('../public/team-database');

function serverCharacters() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const match = source.match(/const characters = \[([\s\S]*?)\];\nconst characterSet/);
  assert.ok(match, 'server character list is readable');
  return new Set(Function(`"use strict"; return [${match[1]}]`)());
}

test('expanded team database uses unique IDs and only existing draft characters', () => {
  const characters = serverCharacters();
  const ids = new Set();
  assert.ok(database.teams.length >= 60);
  for (const team of database.teams) {
    assert.equal(ids.has(team.id), false, `duplicate team id: ${team.id}`);
    ids.add(team.id);
    assert.equal(team.characters.length, 3, `${team.id} must have three slots`);
    assert.equal(new Set(team.characters).size, 3, `${team.id} repeats a character`);
    for (const character of team.characters) assert.ok(characters.has(character), `${team.id} uses unknown character ${character}`);
    for (const [slot, alternatives] of Object.entries(team.substitutes || {})) {
      assert.ok([0, 1, 2].includes(Number(slot)), `${team.id} has invalid substitute slot`);
      for (const alternative of alternatives) {
        assert.ok(characters.has(alternative.character), `${team.id} uses unknown substitute ${alternative.character}`);
        assert.ok(alternative.explanation && alternative.source);
      }
    }
  }
});

test('boss evidence remains empty until a matchup source is reviewed', () => {
  for (const team of database.teams) assert.deepEqual(team.bossCompatibility, {});
});
