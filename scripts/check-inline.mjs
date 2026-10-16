import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1].trim())
  .filter(Boolean);

for (const source of scripts) new vm.Script(source);
console.log(`Parsed ${scripts.length} inline script${scripts.length === 1 ? '' : 's'}.`);
