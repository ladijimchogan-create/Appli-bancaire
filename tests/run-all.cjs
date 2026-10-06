// Lance tous les fichiers *.test.cjs un par un et résume. Code de sortie 1 si au moins un échec.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.cjs')).sort();
let failed = 0;
for (const f of files) {
  console.log('\n=== ' + f + ' ===');
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  console.log(out.split('\n').filter((l) => !/^OK /.test(l)).join('\n').trim());
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} fichier(s) de tests en échec` : '\nTous les tests passent.');
process.exit(failed ? 1 : 0);
