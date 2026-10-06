// Construit l'app à partir de src/index.src.html.
//   node scripts/build.mjs final    -> docs/  (VERSION VIERGE, à publier : aucune donnée, aucun code de démonstration)
//   node scripts/build.mjs preview  -> dist/preview.html  (avec données d'EXEMPLE inventées, pour essayer et pour les tests)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'final';
if (!['final', 'preview'].includes(mode)) { console.error('Usage : node scripts/build.mjs final|preview'); process.exit(1); }

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64');
const face = (family, weight, file) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64('src/fonts/' + file)}) format('woff2')}`;
const fonts = [
  face('Fredoka', '600', 'fredoka-latin-600-normal.woff2'),
  face('Fredoka', '700', 'fredoka-latin-700-normal.woff2'),
  face('Nunito', '200 1000', 'nunito-latin-wght-normal.woff2')
].join('\n');

// retire un bloc balisé /*NOM:BEGIN*/ ... /*NOM:END*/ (le remplacement passe par une fonction pour éviter les motifs spéciaux de $)
const strip = (h, name, replacement = '') => h.replace(new RegExp(`/\\*${name}:BEGIN\\*/[\\s\\S]*?/\\*${name}:END\\*/`, 'g'), () => replacement);

let html = read('src/index.src.html').replace('/*FONTS*/', () => fonts);

if (mode === 'preview') {
  html = html.replace('__DEMO__', 'true').replace('<!--HEAD_EXTRA-->', '').replace('/*SW*/', '');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/preview.html'), html);
  console.log('dist/preview.html', Math.round(html.length / 1024), 'Ko (aperçu avec données d\'exemple)');
} else {
  html = html.replace('__DEMO__', 'false');
  html = strip(html, 'DEMO', 'function demoData() { return emptyData(); }');
  html = strip(html, 'DEMOBAR', "$('#demo').remove();");
  html = strip(html, 'DEMOCASE');
  html = strip(html, 'DEMOIN');
  html = html.replace('<!--HEAD_EXTRA-->', () => '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png" type="image/png">\n<link rel="apple-touch-icon" href="icon-192.png">');
  html = html.replace('/*SW*/', () => "if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) { navigator.serviceWorker.register('sw.js').catch(() => {}); }");
  if (/\/\*DEMO|__DEMO__|Mme Durand|Allocation \(exemple\)/.test(html)) { console.error('ERREUR : du code ou des données de démonstration restent dans la version finale.'); process.exit(1); }

  const out = path.join(root, 'docs');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  for (const f of fs.readdirSync(path.join(root, 'public'))) fs.copyFileSync(path.join(root, 'public', f), path.join(out, f));
  const version = 'tirelire-' + crypto.createHash('sha256').update(html).digest('hex').slice(0, 10);
  fs.writeFileSync(path.join(out, 'sw.js'), read('src/sw.template.js').replace('__VERSION__', version));
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  console.log('docs/ prêt :', Math.round(html.length / 1024), 'Ko, version', version, '(app vierge)');
}
