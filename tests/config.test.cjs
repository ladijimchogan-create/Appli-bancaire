// Version FINALE (docs/index.html) : vierge, lit la date du téléphone, accepte un texte de configuration.
// Le texte de configuration utilisé ici est INVENTÉ. Les vraies données ne doivent jamais entrer dans ce dépôt.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const { FINAL } = require('./helpers.cjs');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/scrollTo/.test(e.message)) errors.push(e.detail || e.message); });
let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { (cond ? ok++ : ko++); console.log((cond ? 'OK  ' : 'FAIL'), name, cond ? '' : ('  -> ' + extra)); };

const SAMPLE = {
  config: true,
  settings: { min: 200, goal: 900 },
  incomes: [{ name: 'Allocation', amount: 100 }],
  expenses: [
    { name: 'Loyer', amount: 800, cat: 'fixe' },
    { name: 'Assurance', amount: 60, cat: 'fixe' },
    { name: 'Essence', amount: 50, cat: 'courante' },
    { name: 'Streaming', amount: 20, cat: 'plaisir' }
  ],
  clients: ['Mme Test', 'M. Essai', 'mme test']
};

// ouvre la version finale en faisant croire au navigateur qu'on est à une date donnée (la « date du téléphone »)
async function openAt(iso) {
  return JSDOM.fromFile(FINAL, {
    runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const R = w.Date, fixed = new R(iso).getTime();
      w.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } };
    }
  });
}
const tools = (dom) => {
  const w = dom.window, d = w.document;
  return {
    w, d, $: (s) => d.querySelector(s), $$: (s) => [...d.querySelectorAll(s)],
    txt: (el) => (el ? el.textContent.replace(/\s+/g, ' ').replace(/[\u202f\u00a0]/g, ' ').trim() : null),
    click: (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }))
  };
};

(async () => {
  // 1. la version finale est vierge
  const html = fs.readFileSync(FINAL, 'utf8');
  check('la version finale ne contient aucune donnée ni code de démonstration', !/Mme Durand|Allocation \(exemple\)|demo-date|DEMO:BEGIN|Simuler la première/.test(html));
  let dom = await openAt('2026-10-20T10:00:00'), t = tools(dom);
  check('au départ : écran de bienvenue, rien d\'autre', !!t.$('.welcome') && t.$('.tabs').style.display === 'none');
  check('aucun bandeau de démonstration', !t.$('#demo'));
  check('aucune donnée dans le stockage du téléphone avant la première utilisation', !t.w.localStorage.getItem('ma-tirelire-v2') || JSON.parse(t.w.localStorage.getItem('ma-tirelire-v2')).payments.length === 0);
  t.$('#w-bal').value = '300';   // le solde tapé à l'accueil ne doit pas être perdu quand on applique la configuration
  t.click(t.$('[data-act=config-open]'));
  t.$('#bk-in').value = JSON.stringify(SAMPLE); t.click(t.$('[data-act=config-apply]'));
  check('configuration d\'exemple appliquée : période du jour', t.txt(t.$('.mt b')) === 'Octobre 2026', t.txt(t.$('.mt b')));
  const big = t.$$('.big').map(t.txt);
  check('total des dépenses = 930 €', big[1] === '930 €', big.join(' | '));
  const groups = t.$$('.catblk').map((g) => g.querySelector('.gname').firstChild.textContent + ' ' + t.txt(g.querySelector('.gtot')));
  check('blocs : 860 € / 50 € / 20 €', groups.join('|') === 'Obligatoires 860 €|Du quotidien 50 €|Plaisir 20 €', groups.join('|'));
  check('revenu fixe de 100 € là, aucun paiement', /Allocation/.test(t.txt(t.$$('.card')[1])) && big[0] === '0 €', big[0]);
  check('4 lignes de dépenses', t.$$('.xrow').length === 4, String(t.$$('.xrow').length));
  t.click(t.$('[data-act=toggle-clients]'));
  check('clients importés sans doublon (2)', t.$$('.tile').length === 2, String(t.$$('.tile').length));
  t.click(t.$$('[data-tab]')[1]);
  check('le solde du livret A tapé à l\'accueil est conservé : 300 €', t.txt(t.$('.bal')) === '300 €', t.txt(t.$('.bal')));
  t.click(t.$$('[data-tab]')[0]);
  check('phrase de départ : rien reçu', /Rien reçu pour l’instant/.test(t.txt(t.$('.bubble'))), t.txt(t.$('.bubble')));

  // 2. la date du téléphone décide de la période de départ
  for (const [label, iso, titre, dates] of [
    ['5 octobre (avant le 16)', '2026-10-05T10:00:00', 'Septembre 2026', '16 sept. → 15 oct.'],
    ['20 octobre', '2026-10-20T10:00:00', 'Octobre 2026', '16 oct. → 15 nov.'],
    ['16 novembre', '2026-11-16T09:00:00', 'Novembre 2026', '16 nov. → 15 déc.'],
    ['3 janvier (changement d\'année)', '2027-01-03T09:00:00', 'Décembre 2026', '16 déc. → 15 janv.']
  ]) {
    dom = await openAt(iso); t = tools(dom);
    t.click(t.$('[data-act=start]'));
    check('date du téléphone ' + label + ' : début dans « ' + titre + ' »', t.txt(t.$('.mt b')) === titre && t.txt(t.$('.mt small')) === dates, t.txt(t.$('.mt b')) + ' / ' + t.txt(t.$('.mt small')));
  }

  // 3. rien de rempli (ni dépense, ni paiement) : la jauge est vide
  dom = await openAt('2026-10-05T10:00:00'); t = tools(dom);
  t.click(t.$('[data-act=start]'));
  const widths = t.$$('.seg i').map((i) => i.style.width);
  check('rien de rempli : les 3 segments de la jauge sont vides', widths.length === 3 && widths.every((x) => x === '0%'), widths.join(' | '));

  console.log('\nRésultat:', ok, 'OK,', ko, 'échecs');
  console.log('Erreurs JS:', errors.length ? errors : 'aucune');
  process.exitCode = (ko || errors.length) ? 1 : 0;
})();
