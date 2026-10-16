const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../public/intelligence');

const template = (id, characters, classification = 'Viable', bossCompatibility = {}, substitutes = {}) => ({
  id, characters, classification, confidence: 'High', bossCompatibility, substitutes,
  roles: ['Main DPS', 'Sub DPS', 'Support'], sources: ['https://example.test/source']
});

test('team generation validates three unique available characters', () => {
  assert.equal(engine.isLegalTeam(['A', 'B', 'C'], ['A', 'B', 'C']), true);
  assert.equal(engine.isLegalTeam(['A', 'A', 'C'], ['A', 'C']), false);
  assert.equal(engine.isLegalTeam(['A', 'B', 'C'], ['A', 'B', 'C'], ['C']), false);
});

test('slot substitutes are generated, explained, availability-filtered, and deduplicated', () => {
  const record = template('one', ['A', 'B', 'C'], 'Optimal', {}, {
    1: [
      { character: 'D', explanation: 'Verified slot alternative.', source: 'https://example.test/source' },
      { character: 'D', explanation: 'Duplicate entry.', source: 'https://example.test/source' }
    ]
  });
  const variants = engine.generateTemplateVariants(record, ['A', 'B', 'C', 'D']);
  assert.equal(variants.length, 2);
  assert.deepEqual(variants.find(item => !item.original).characters, ['A', 'D', 'C']);
  assert.equal(variants.find(item => !item.original).replacements[0].explanation, 'Verified slot alternative.');
  assert.deepEqual(engine.generateTemplateVariants(record, ['A', 'C']), []);
});

test('invalid templates and unlisted compositions remain unrated instead of guessed', () => {
  assert.deepEqual(engine.generateTemplateVariants({ id: 'bad', characters: ['A', 'B'] }, ['A', 'B', 'C']), []);
  const result = engine.evaluateBossTeams({ teams: [template('one', ['A', 'B', 'C'])] }, ['A', 'B', 'C'], 'Unknown Boss');
  assert.equal(result.status, 'insufficient-data');
  assert.deepEqual(result.teams, []);
});

test('boss evidence can rank a viable alternative above a general optimal team', () => {
  const database = { teams: [
    template('premium', ['A', 'B', 'C'], 'Optimal', { Boss: { rating: 'unfavorable' } }),
    template('alternative', ['D', 'E', 'F'], 'Viable', { Boss: { rating: 'favored' } })
  ] };
  const result = engine.evaluateBossTeams(database, ['A', 'B', 'C', 'D', 'E', 'F'], 'Boss');
  assert.equal(result.teams[0].templateId, 'alternative');
});

test('boss optimization is independent and permits character reuse', () => {
  const database = { teams: [
    template('first', ['A', 'B', 'C'], 'Optimal', { One: { rating: 'favored' }, Two: { rating: 'neutral' } }),
    template('second', ['A', 'D', 'E'], 'Viable', { One: { rating: 'neutral' }, Two: { rating: 'favored' } })
  ] };
  const roster = ['A', 'B', 'C', 'D', 'E'];
  assert.equal(engine.evaluateBossTeams(database, roster, 'One').teams[0].templateId, 'first');
  assert.equal(engine.evaluateBossTeams(database, roster, 'Two').teams[0].templateId, 'second');
  assert.equal(engine.evaluateBossTeams(database, roster, 'One').teams[0].characters.includes('A'), true);
  assert.equal(engine.evaluateBossTeams(database, roster, 'Two').teams[0].characters.includes('A'), true);
});

test('auto build preserves locked teams and leaves missing recommendations empty', () => {
  const existing = [['A', 'B', 'C'], ['D'], ['E']];
  const result = engine.applyTeamLocks(existing, [true, false, false], [{ characters: ['F', 'G', 'H'] }]);
  assert.deepEqual(result, [['A', 'B', 'C'], ['F', 'G', 'H'], []]);
  assert.notEqual(result[0], existing[0]);
});

test('pick and ban analysis respects legal inputs, substitutes, and does not mutate state', () => {
  const database = { teams: [template('one', ['A', 'B', 'C'], 'Optimal', {}, {
    1: [{ character: 'D', explanation: 'Alternative', source: 'https://example.test/source' }]
  })] };
  const roster = ['A', 'B', 'D'];
  const rosterBefore = structuredClone(roster);
  const picks = engine.recommendPicks(database, roster, ['C', 'X'], []);
  assert.deepEqual(picks.map(item => item.character), ['C']);
  const bans = engine.rankBanImpact(database, ['A', 'B', 'C', 'D'], ['A', 'B', 'X']);
  assert.equal(bans.some(item => item.character === 'X'), false);
  assert.ok(bans.find(item => item.character === 'B').lostCompositions < bans.find(item => item.character === 'A').lostCompositions);
  assert.deepEqual(roster, rosterBefore);
});

test('exact best-of-five probability handles boundaries and complements', () => {
  assert.ok(Math.abs(engine.bestOfFive([.5, .5, .5, .5, .5]).teamA - .5) < 1e-12);
  assert.equal(engine.bestOfFive([1, 1, 1, 1, 1]).teamA, 1);
  assert.equal(engine.bestOfFive([0, 0, 0, 0, 0]).teamA, 0);
  const values = [.15, .3, .55, .7, .9];
  const original = engine.bestOfFive(values).teamA;
  const swapped = engine.bestOfFive(values.map(value => 1 - value)).teamA;
  assert.ok(Math.abs(original + swapped - 1) < 1e-12);
  assert.ok(original >= 0 && original <= 1);
  assert.equal(engine.bestOfFive([.5, .5]), null);
  assert.equal(engine.bestOfFive([.5, .5, .5, .5, null]), null);
});

test('projected first-to-three stops at a valid match score', () => {
  assert.deepEqual(engine.projectedFirstToThree([.9, .8, .7, .1, .1]), { winner: 'A', score: '3–0' });
  assert.deepEqual(engine.projectedFirstToThree([.9, .1, .8, .2, .7]), { winner: 'A', score: '3–2' });
  assert.equal(engine.projectedFirstToThree([.5]), null);
});
