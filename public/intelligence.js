(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WUWA_INTELLIGENCE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CLASSIFICATION_RANK = { Optimal: 4, Viable: 3, Experimental: 2, Unrated: 1 };
  const COMPATIBILITY_RANK = { favored: 3, neutral: 2, unfavorable: 1 };

  const unique = values => [...new Set(values || [])];
  const keyOf = team => [...team].sort().join('|');
  const choose3 = count => count < 3 ? 0 : count * (count - 1) * (count - 2) / 6;

  function isLegalTeam(team, roster, banned = []) {
    const members = unique(team);
    const available = new Set((roster || []).filter(name => !(banned || []).includes(name)));
    return members.length === 3 && members.every(name => available.has(name));
  }

  function generateTemplateVariants(template, roster, banned = []) {
    if (!template?.characters || template.characters.length !== 3) return [];
    const available = new Set((roster || []).filter(name => !(banned || []).includes(name)));
    const choices = template.characters.map((character, index) => {
      const originals = [{ character, substituted: false, slot: index }];
      const alternatives = (template.substitutes?.[index] || []).map(item => ({ ...item, substituted: true, slot: index, replaces: character }));
      return [...originals, ...alternatives].filter(item => available.has(item.character));
    });
    if (choices.some(slot => !slot.length)) return [];
    const variants = [];
    for (const first of choices[0]) for (const second of choices[1]) for (const third of choices[2]) {
      const selected = [first, second, third];
      const characters = selected.map(item => item.character);
      if (unique(characters).length !== 3) continue;
      variants.push({
        templateId: template.id,
        characters,
        roles: template.roles,
        classification: template.classification || 'Unrated',
        confidence: selected.some(item => item.substituted) ? 'Medium' : template.confidence || 'Unrated',
        synergy: template.synergy,
        evidence: template.evidence,
        sources: template.sources || [],
        original: !selected.some(item => item.substituted),
        replacements: selected.filter(item => item.substituted).map(item => ({ slot: item.slot, from: item.replaces, to: item.character, explanation: item.explanation, source: item.source })),
        bossCompatibility: template.bossCompatibility || {}
      });
    }
    const deduped = new Map();
    for (const variant of variants) {
      const key = keyOf(variant.characters);
      const current = deduped.get(key);
      if (!current || (variant.original && !current.original)) deduped.set(key, variant);
    }
    return [...deduped.values()];
  }

  function eligibleTeams(database, roster, banned = []) {
    return (database?.teams || []).flatMap(template => generateTemplateVariants(template, roster, banned)).sort((a, b) =>
      (CLASSIFICATION_RANK[b.classification] || 0) - (CLASSIFICATION_RANK[a.classification] || 0) ||
      Number(b.original) - Number(a.original) ||
      a.characters.join('|').localeCompare(b.characters.join('|'))
    );
  }

  function applyTeamLocks(existing, locks, recommendations) {
    const current = Array.isArray(existing) ? existing : [];
    const suggested = Array.isArray(recommendations) ? recommendations : [];
    let nextSuggestion = 0;
    return current.map((team, index) => {
      if (locks?.[index]) return [...team];
      const recommendation = suggested[nextSuggestion++];
      return recommendation?.characters?.length === 3 ? [...recommendation.characters] : [];
    });
  }

  function evaluateBossTeams(database, roster, boss, banned = []) {
    const teams = eligibleTeams(database, roster, banned);
    const rated = teams.filter(team => team.bossCompatibility?.[boss]?.rating);
    rated.sort((a, b) => {
      const bossDiff = (COMPATIBILITY_RANK[b.bossCompatibility[boss].rating] || 0) - (COMPATIBILITY_RANK[a.bossCompatibility[boss].rating] || 0);
      return bossDiff || (CLASSIFICATION_RANK[b.classification] || 0) - (CLASSIFICATION_RANK[a.classification] || 0);
    });
    return { status: rated.length ? 'rated' : 'insufficient-data', boss, teams: rated, allEligible: teams.length };
  }

  function analyzeRoster(database, roster, bosses = [], banned = []) {
    const available = unique((roster || []).filter(name => !(banned || []).includes(name)));
    const teams = eligibleTeams(database, available);
    const original = teams.filter(team => team.original);
    const coverage = (bosses || []).filter(boss => evaluateBossTeams(database, available, boss).status === 'rated');
    return {
      totalCombinations: choose3(available.length),
      verifiedCompositions: teams.length,
      optimalCompositions: teams.filter(team => team.classification === 'Optimal').length,
      viableCompositions: teams.filter(team => team.classification === 'Viable').length,
      substitutedCompositions: teams.filter(team => !team.original).length,
      originalCompositions: original.length,
      bossCoverage: { covered: coverage.length, total: (bosses || []).length },
      flexibility: teams.length ? unique(teams.flatMap(team => team.characters)).length : 0,
      teams
    };
  }

  function recommendPicks(database, roster, legalCharacters, bosses = [], banned = []) {
    const baseline = analyzeRoster(database, roster, bosses, banned);
    return unique(legalCharacters).filter(character => !roster.includes(character) && !banned.includes(character)).map(character => {
      const next = analyzeRoster(database, [...roster, character], bosses, banned);
      return { character, unlocked: next.verifiedCompositions - baseline.verifiedCompositions, bossCoverageGain: next.bossCoverage.covered - baseline.bossCoverage.covered };
    }).filter(item => item.unlocked > 0 || item.bossCoverageGain > 0).sort((a, b) => b.bossCoverageGain - a.bossCoverageGain || b.unlocked - a.unlocked || a.character.localeCompare(b.character));
  }

  function rankBanImpact(database, opponentRoster, legalTargets, bosses = [], alreadyBanned = []) {
    const baseline = analyzeRoster(database, opponentRoster, bosses, alreadyBanned);
    return unique(legalTargets).filter(character => opponentRoster.includes(character) && !alreadyBanned.includes(character)).map(character => {
      const next = analyzeRoster(database, opponentRoster, bosses, [...alreadyBanned, character]);
      return { character, lostCompositions: baseline.verifiedCompositions - next.verifiedCompositions, bossCoverageLost: baseline.bossCoverage.covered - next.bossCoverage.covered };
    }).sort((a, b) => b.bossCoverageLost - a.bossCoverageLost || b.lostCompositions - a.lostCompositions || a.character.localeCompare(b.character));
  }

  function bestOfFive(probabilities) {
    if (!Array.isArray(probabilities) || probabilities.length !== 5 || probabilities.some(value => !Number.isFinite(value) || value < 0 || value > 1)) return null;
    let distribution = [1, 0, 0, 0, 0, 0];
    for (const probability of probabilities) {
      const next = [0, 0, 0, 0, 0, 0];
      for (let wins = 0; wins <= 5; wins++) {
        next[wins] += distribution[wins] * (1 - probability);
        if (wins < 5) next[wins + 1] += distribution[wins] * probability;
      }
      distribution = next;
    }
    const teamA = distribution.slice(3).reduce((sum, value) => sum + value, 0);
    return { distribution, teamA, teamB: 1 - teamA };
  }

  function projectedFirstToThree(probabilities) {
    if (!Array.isArray(probabilities) || probabilities.length !== 5) return null;
    let a = 0, b = 0;
    for (const probability of probabilities) {
      if (a === 3 || b === 3) break;
      probability >= 0.5 ? a++ : b++;
    }
    return a === 3 || b === 3 ? { winner: a === 3 ? 'A' : 'B', score: `${Math.max(a, b)}–${Math.min(a, b)}` } : null;
  }

  function featureCombinations() {
    return Array.from({ length: 8 }, (_, mask) => ({ autoBuild: Boolean(mask & 1), analyzer: Boolean(mask & 2), winProbability: Boolean(mask & 4) }));
  }

  return { choose3, isLegalTeam, generateTemplateVariants, eligibleTeams, applyTeamLocks, evaluateBossTeams, analyzeRoster, recommendPicks, rankBanImpact, bestOfFive, projectedFirstToThree, featureCombinations };
});
