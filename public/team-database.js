(function (root, factory) {
  const database = factory();
  if (typeof module === 'object' && module.exports) module.exports = database;
  else root.WUWA_TEAM_DATABASE = database;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    schemaVersion: 1,
    gameVersion: '3.7',
    lastReviewed: '2026-10-15',
    methodology: 'Small, manually reviewed records only. Missing boss evidence is reported as Insufficient Data.',
    sources: [
      { id: 'wuwawiki-team-builder', name: 'WuWa Wiki Team Builder', url: 'https://wuwawiki.com/team-builder/', reviewed: '2026-10-15' },
      { id: 'game8-wuwa', name: 'Game8 Wuthering Waves', url: 'https://game8.co/games/Wuthering-Waves', reviewed: '2026-10-15' },
      { id: 'prydwen-wuwa', name: 'Prydwen Wuthering Waves', url: 'https://www.prydwen.gg/wuthering-waves/', reviewed: '2026-10-15' },
      { id: 'wutheringlab', name: 'WutheringLab', url: 'https://wutheringlab.com/', reviewed: '2026-10-15' }
    ],
    teams: [
      {
        id: 'team-yangyang-xuanling-chisa-suisui',
        characters: ['Yangyang: Xuanling', 'Chisa', 'Suisui'],
        roles: ['Main DPS', 'Sub DPS', 'Support'],
        classification: 'Optimal',
        confidence: 'High',
        synergy: 'A documented Havoc-led core with Chisa providing secondary damage and Suisui filling the sustain slot.',
        evidence: 'Listed as an SS-tier composition with support from multiple linked guides.',
        sources: ['https://wuwawiki.com/team-builder/'],
        lastReviewed: '2026-10-15',
        substitutes: {
          1: [
            { character: 'Mortefi', confidence: 'Medium', explanation: 'Documented alternative for the Chisa slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Lucilla', confidence: 'Medium', explanation: 'Documented alternative for the Chisa slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Iuno', confidence: 'Medium', explanation: 'Documented alternative for the Chisa slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Rebecca', confidence: 'Medium', explanation: 'Documented alternative for the Chisa slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Phrolova', confidence: 'Medium', explanation: 'Documented alternative for the Chisa slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Lynae', confidence: 'Medium', explanation: 'Documented alternative for the Chisa slot.', source: 'https://wuwawiki.com/team-builder/' }
          ],
          2: [
            { character: 'Shorekeeper', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Ciaccona', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Mornye', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' }
          ]
        },
        bossCompatibility: {}
      },
      {
        id: 'team-hiyuki-lucilla-suisui',
        characters: ['Hiyuki', 'Lucilla', 'Suisui'],
        roles: ['Main DPS', 'Sub DPS', 'Support'],
        classification: 'Optimal',
        confidence: 'High',
        synergy: 'A documented Glacio-focused lineup with Lucilla supporting Hiyuki and Suisui covering sustain.',
        evidence: 'Listed as an SS-tier composition with support from multiple linked guides.',
        sources: ['https://wuwawiki.com/team-builder/'],
        lastReviewed: '2026-10-15',
        substitutes: {
          1: [
            { character: 'Lynae', confidence: 'Medium', explanation: 'Documented alternative for the Lucilla slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Chisa', confidence: 'Medium', explanation: 'Documented alternative for the Lucilla slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Zhezhi', confidence: 'Medium', explanation: 'Documented alternative for the Lucilla slot.', source: 'https://wuwawiki.com/team-builder/' }
          ],
          2: [
            { character: 'Chisa', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Shorekeeper', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Mornye', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' },
            { character: 'Verina', confidence: 'Medium', explanation: 'Documented alternative for the Suisui slot.', source: 'https://wuwawiki.com/team-builder/' }
          ]
        },
        bossCompatibility: {}
      }
    ]
  };
});
