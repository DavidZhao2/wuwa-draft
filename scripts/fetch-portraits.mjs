import fs from 'node:fs/promises';
import path from 'node:path';

const characters = [
  'Aalto','Aemeath','Augusta','Baizhi','Brant','Buling','Calcharo','Camellya','Cantarella','Carlotta','Cartethyia','Changli','Chisa','Chixia','Ciaccona','Danjin','Denia','Encore','Galbrena','Hiyuki','Hsin','Iuno','Jianxin','Jingran','Jinhsi','Jiyan','Lingyang','Lucilla','Lucy','Lumi','Luuk Herssen','Lupa','Lynae','Mornye','Mortefi','Phoebe','Phrolova','Qingxiao','Qiuyuan','Rebecca','Roccia','Rover','Sanhua','Shorekeeper','Sigrika','Suisui','Suoming','Taoqi','Verina','Xiangli Yao','Yangyang','Yangyang: Xuanling','Yinlin','Youhu','Yuanwu','Zani','Zhezhi'
];

const outputDir = path.resolve('public/images/characters');
await fs.mkdir(outputDir, { recursive: true });
const manifest = {};
const missing = [];

const normalize = name => name === 'Yangyang: Xuanling' ? 'Yangyang Xuanling' : name;
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

for (const character of characters) {
  const name = normalize(character);
  const candidates = [
    `${name} Card.jpg`, `${name} Card.png`, `Resonator ${name}.png`,
    `${name} Splash Art.png`, `${name} Full Sprite.png`, `${name} Convene Draw.png`
  ];
  const params = new URLSearchParams({
    action: 'query',
    titles: candidates.map(file => `File:${file}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*'
  });
  const response = await fetch(`https://wutheringwaves.fandom.com/api.php?${params}`);
  if (!response.ok) throw new Error(`Metadata request failed for ${character}: ${response.status}`);
  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  const page = candidates.map(candidate => pages.find(item => item.title === `File:${candidate}` && item.imageinfo?.[0]?.url)).find(Boolean);
  if (!page) {
    missing.push(character);
    continue;
  }
  const source = page.imageinfo[0].url;
  const extension = /\.png(?:\/|\?|$)/i.test(source) ? 'png' : /\.webp(?:\/|\?|$)/i.test(source) ? 'webp' : 'jpg';
  const fileName = `${slug(character)}.${extension}`;
  const imageResponse = await fetch(source);
  if (!imageResponse.ok) throw new Error(`Image request failed for ${character}: ${imageResponse.status}`);
  await fs.writeFile(path.join(outputDir, fileName), Buffer.from(await imageResponse.arrayBuffer()));
  manifest[character] = `/images/characters/${fileName}`;
  process.stdout.write(`✓ ${character}\n`);
}

await fs.writeFile(
  path.resolve('public/portraits.js'),
  `window.WUWA_PORTRAITS=${JSON.stringify(manifest, null, 2)};\n`
);
console.log(`Downloaded ${Object.keys(manifest).length}/${characters.length} portraits.`);
if (missing.length) console.log(`Missing: ${missing.join(', ')}`);
