(function (root, factory) {
  const database = factory();
  if (typeof module === 'object' && module.exports) module.exports = database;
  else root.WUWA_TEAM_DATABASE = database;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TEAM_BUILDER = 'https://wuwawiki.com/team-builder/';
  const HEALERS = new Set(['Suisui', 'Shorekeeper', 'Mornye', 'Verina', 'Buling', 'Baizhi']);
  const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const substituteMap = (characters, slots = {}) => Object.fromEntries(Object.entries(slots).map(([slot, alternatives]) => [slot,
    alternatives.map(character => ({
      character,
      confidence: 'Medium',
      explanation: `Documented alternative for the ${characters[Number(slot)]} slot in this composition.`,
      source: TEAM_BUILDER
    }))
  ]));
  const team = (tier, characters, substitutes = {}, confidence = 'Medium') => ({
    id: `team-${characters.map(slug).join('-')}`,
    characters,
    roles: ['Main DPS', 'Sub DPS', HEALERS.has(characters[2]) ? 'Healer' : 'Support'],
    classification: tier === 'SS' ? 'Optimal' : 'Viable',
    sourceTier: tier,
    confidence,
    synergy: `${characters[0]} leads the documented core, with ${characters[1]} in the secondary slot and ${characters[2]} in the ${HEALERS.has(characters[2]) ? 'sustain' : 'support'} slot.`,
    evidence: `Listed as a ${tier}-tier Version 3.7 composition by the reviewed team builder. Unlisted teams are not treated as weaker.`,
    sources: [TEAM_BUILDER],
    lastReviewed: '2026-10-15',
    substitutes: substituteMap(characters, substitutes),
    bossCompatibility: {}
  });

  const teams = [
    team('SS', ['Yangyang: Xuanling', 'Chisa', 'Suisui'], { 1: ['Mortefi', 'Lucilla', 'Iuno', 'Rebecca', 'Phrolova', 'Lynae'], 2: ['Shorekeeper', 'Ciaccona', 'Mornye'] }, 'High'),
    team('SS', ['Hiyuki', 'Lucilla', 'Suisui'], { 1: ['Lynae', 'Chisa', 'Zhezhi'], 2: ['Chisa', 'Shorekeeper', 'Mornye', 'Verina'] }, 'High'),
    team('SS', ['Qingxiao', 'Denia', 'Mornye'], { 1: ['Lynae', 'Ciaccona', 'Sanhua'], 2: ['Shorekeeper'] }, 'High'),
    team('SS', ['Jingran', 'Iuno', 'Shorekeeper'], { 1: ['Mortefi', 'Lupa', 'Rebecca', 'Brant'], 2: ['Mornye', 'Lupa', 'Brant', 'Lynae', 'Verina'] }, 'High'),
    team('SS', ['Hiyuki', 'Lucilla', 'Chisa'], {}, 'High'),
    team('SS', ['Hiyuki', 'Lynae', 'Mornye']),
    team('SS', ['Qingxiao', 'Lynae', 'Mornye']),
    team('SS', ['Yangyang: Xuanling', 'Rebecca', 'Chisa'], { 2: ['Mornye', 'Shorekeeper', 'Verina'] }),
    team('SS', ['Yangyang: Xuanling', 'Rebecca', 'Suisui']),
    team('SS', ['Hiyuki', 'Lynae', 'Chisa'], { 1: ['Changli', 'Jianxin', 'Yinlin', 'Zhezhi'], 2: ['Baizhi', 'Buling', 'Mornye', 'Shorekeeper', 'Verina'] }),
    team('S', ['Aemeath', 'Denia', 'Chisa'], { 2: ['Mornye', 'Lupa', 'Buling', 'Shorekeeper', 'Suisui', 'Verina'] }, 'High'),
    team('S', ['Aemeath', 'Lynae', 'Mornye'], { 1: ['Denia', 'Lupa'], 2: ['Shorekeeper', 'Chisa', 'Verina'] }, 'High'),
    team('S', ['Sigrika', 'Qiuyuan', 'Shorekeeper'], { 1: ['Lynae', 'Cantarella', 'Ciaccona', 'Lucilla'], 2: ['Mornye', 'Cantarella', 'Ciaccona', 'Iuno'] }, 'High'),
    team('S', ['Luuk Herssen', 'Denia', 'Mornye'], { 1: ['Lynae', 'Sanhua'], 2: ['Shorekeeper', 'Verina', 'Buling'] }, 'High'),
    team('S', ['Sigrika', 'Qiuyuan', 'Ciaccona'], { 1: ['Lucilla'], 2: ['Shorekeeper'] }),
    team('S', ['Jingran', 'Lupa', 'Mornye'], { 2: ['Brant', 'Denia', 'Mortefi'] }),
    team('S', ['Qingxiao', 'Denia', 'Ciaccona'], { 1: ['Lynae', 'Mornye'] }),
    team('S', ['Qingxiao', 'Lynae', 'Shorekeeper']),
    team('S', ['Qingxiao', 'Sanhua', 'Mornye'], { 1: ['Changli', 'Iuno', 'Mortefi', 'Rebecca', 'Yinlin'] }),
    team('S', ['Yangyang: Xuanling', 'Mortefi', 'Chisa'], { 2: ['Mornye', 'Shorekeeper', 'Suisui', 'Verina'] }),
    team('S', ['Hiyuki', 'Chisa', 'Shorekeeper']),
    team('S', ['Qingxiao', 'Ciaccona', 'Shorekeeper'], { 2: ['Mornye', 'Verina'] }),
    team('S', ['Yangyang: Xuanling', 'Lynae', 'Mornye']),
    team('S', ['Yangyang: Xuanling', 'Phrolova', 'Shorekeeper']),
    team('S', ['Luuk Herssen', 'Lynae', 'Mornye']),
    team('S', ['Sigrika', 'Lucilla', 'Shorekeeper']),
    team('S', ['Cartethyia', 'Ciaccona', 'Chisa'], { 1: ['Sanhua'], 2: ['Shorekeeper'] }, 'High'),
    team('A', ['Aemeath', 'Lupa', 'Mornye'], { 1: ['Changli'], 2: ['Brant', 'Changli'] }),
    team('A', ['Iuno', 'Lynae', 'Mornye'], { 2: ['Ciaccona', 'Shorekeeper', 'Verina'] }),
    team('A', ['Phrolova', 'Cantarella', 'Shorekeeper'], { 1: ['Danjin', 'Roccia', 'Taoqi'], 2: ['Verina', 'Buling'] }),
    team('A', ['Hsin', 'Chisa', 'Suisui']),
    team('A', ['Augusta', 'Iuno', 'Shorekeeper'], { 1: ['Mortefi', 'Yinlin', 'Lynae', 'Phrolova', 'Rebecca'], 2: ['Verina', 'Buling', 'Ciaccona', 'Mornye'] }, 'High'),
    team('A', ['Galbrena', 'Lupa', 'Mornye'], { 1: ['Lucilla', 'Qiuyuan'], 2: ['Shorekeeper', 'Verina'] }),
    team('A', ['Sigrika', 'Phrolova', 'Qiuyuan'], { 2: ['Cantarella', 'Lucilla'] }),
    team('A', ['Lucy', 'Rebecca', 'Mornye'], { 1: ['Iuno', 'Mortefi', 'Phrolova'], 2: ['Shorekeeper', 'Verina'] }, 'High'),
    team('A', ['Phrolova', 'Roccia', 'Cantarella'], { 1: ['Shorekeeper', 'Verina', 'Camellya'], 2: ['Qiuyuan', 'Lumi', 'Taoqi'] }, 'High'),
    team('A', ['Phrolova', 'Cantarella', 'Qiuyuan'], { 2: ['Lucilla', 'Roccia'] }),
    team('A', ['Hsin', 'Jinhsi', 'Shorekeeper'], { 2: ['Buling', 'Suisui', 'Verina'] }),
    team('A', ['Augusta', 'Mortefi', 'Shorekeeper'], { 1: ['Yinlin', 'Phrolova'], 2: ['Verina', 'Baizhi', 'Buling', 'Mornye', 'Phrolova'] }, 'High'),
    team('A', ['Galbrena', 'Qiuyuan', 'Shorekeeper'], { 1: ['Lupa', 'Cantarella', 'Iuno', 'Lucilla'], 2: ['Cantarella', 'Verina', 'Brant', 'Iuno', 'Lupa', 'Phrolova'] }, 'High'),
    team('A', ['Iuno', 'Yinlin', 'Shorekeeper'], { 2: ['Buling', 'Mornye', 'Verina', 'Youhu'] }),
    team('A', ['Iuno', 'Jianxin', 'Shorekeeper']),
    team('A', ['Phrolova', 'Cantarella', 'Buling'], { 1: ['Zhezhi'] }),
    team('A', ['Phrolova', 'Danjin', 'Buling'], { 2: ['Verina'] }),
    team('A', ['Phrolova', 'Qiuyuan', 'Shorekeeper'], { 1: ['Cantarella'], 2: ['Verina'] }),
    team('A', ['Phrolova', 'Danjin', 'Cantarella']),
    team('A', ['Augusta', 'Rebecca', 'Shorekeeper']),
    team('B', ['Carlotta', 'Lynae', 'Mornye'], { 1: ['Zhezhi'], 2: ['Shorekeeper', 'Verina'] }),
    team('B', ['Carlotta', 'Zhezhi', 'Shorekeeper'], { 1: ['Sanhua', 'Taoqi', 'Cantarella', 'Lumi', 'Brant', 'Camellya', 'Yangyang'], 2: ['Verina', 'Baizhi', 'Buling', 'Mornye', 'Phrolova'] }, 'High'),
    team('B', ['Brant', 'Lupa', 'Shorekeeper'], { 2: ['Verina'] }),
    team('B', ['Jiyan', 'Iuno', 'Ciaccona']),
    team('B', ['Sanhua', 'Cantarella', 'Shorekeeper'], { 2: ['Verina'] }),
    team('B', ['Carlotta', 'Lumi', 'Shorekeeper'], { 2: ['Verina'] }),
    team('C', ['Jiyan', 'Mortefi', 'Shorekeeper'], { 1: ['Aalto', 'Ciaccona', 'Sanhua'], 2: ['Verina', 'Baizhi', 'Buling', 'Jianxin', 'Mornye'] }, 'High'),
    team('C', ['Changli', 'Brant', 'Shorekeeper'], { 1: ['Encore', 'Jinhsi', 'Xiangli Yao', 'Aemeath', 'Chixia', 'Galbrena', 'Lupa'], 2: ['Verina', 'Baizhi', 'Buling', 'Mornye', 'Sanhua'] }, 'High'),
    team('C', ['Jiyan', 'Aalto', 'Shorekeeper'], { 2: ['Verina', 'Baizhi', 'Buling', 'Mornye'] }),
    team('C', ['Camellya', 'Roccia', 'Shorekeeper'], { 1: ['Sanhua', 'Danjin', 'Calcharo', 'Cantarella'], 2: ['Verina', 'Baizhi', 'Buling', 'Cantarella'] }, 'High'),
    team('C', ['Xiangli Yao', 'Lynae', 'Mornye'], { 1: ['Yinlin'], 2: ['Shorekeeper', 'Verina'] }),
    team('C', ['Encore', 'Lupa', 'Mornye'], { 2: ['Brant', 'Shorekeeper'] }),
    team('C', ['Jinhsi', 'Zhezhi', 'Shorekeeper'], { 1: ['Cantarella', 'Changli', 'Mortefi', 'Taoqi', 'Yinlin'], 2: ['Verina', 'Baizhi', 'Buling', 'Cantarella', 'Youhu'] }, 'High'),
    team('C', ['Xiangli Yao', 'Yinlin', 'Verina'], { 2: ['Shorekeeper'] }),
    team('C', ['Jinhsi', 'Yuanwu', 'Shorekeeper']),
    team('C', ['Danjin', 'Sanhua', 'Shorekeeper'], { 1: ['Roccia'], 2: ['Verina'] }),
    team('C', ['Chixia', 'Lupa', 'Mornye'], { 2: ['Brant'] }),
    team('C', ['Danjin', 'Mortefi', 'Baizhi']),
    team('C', ['Chixia', 'Yangyang', 'Baizhi'])
  ];

  return {
    schemaVersion: 2,
    gameVersion: '3.7',
    lastReviewed: '2026-10-15',
    methodology: 'Manually curated composition and slot-substitute records. Unsupported Rover variants and missing boss evidence are omitted.',
    sources: [
      { id: 'wuwawiki-team-builder', name: 'WuWa Wiki Team Builder', url: TEAM_BUILDER, reviewed: '2026-10-15' },
      { id: 'game8-wuwa', name: 'Game8 Wuthering Waves', url: 'https://game8.co/games/Wuthering-Waves', reviewed: '2026-10-15' },
      { id: 'prydwen-wuwa', name: 'Prydwen Wuthering Waves', url: 'https://www.prydwen.gg/wuthering-waves/', reviewed: '2026-10-15' },
      { id: 'wutheringlab', name: 'WutheringLab', url: 'https://wutheringlab.com/', reviewed: '2026-10-15' }
    ],
    teams
  };
});
