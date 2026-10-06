const { PREVIEW, FINAL } = require('./helpers.cjs');
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/scrollTo/.test(e.message)) errors.push('jsdomError: ' + (e.detail || e.message)); });
let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { (cond ? ok++ : ko++); console.log((cond ? 'OK  ' : 'FAIL'), name, cond ? '' : ('  -> ' + extra)); };
(async () => {
  const dom = await JSDOM.fromFile(PREVIEW, { runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc });
  const w = dom.window, d = w.document;
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const txt = el => (el ? el.textContent.replace(/\s+/g, ' ').replace(/[\u202f\u00a0]/g, ' ').trim() : null);
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles:true })); el.dispatchEvent(new w.Event('change', { bubbles:true })); };
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  const act = a => click($(`[data-act="${a}"]`));
  const rows = () => $$('.xrow .nm b').map(txt);
  const amtOf = n => { const r = $$('.xrow').find(x => txt(x.querySelector('b')) === n); return r ? txt(r.querySelector('.am')) : null; };
  const month = () => txt($('.mt b'));
  const openRow = n => click($$('.xrow').find(x => txt(x.querySelector('b')) === n));
  const prev = () => click($('[data-act=prev]')), next = () => click($('[data-act=next]'));
  const setToday = v => type($('#demo-date'), v);

  // une dépense automatique créée en Octobre
  click($$('[data-act=add-exp]').find(x => !x.dataset.inc)); type($('#f-name'), 'Coiffeur'); type($('#f-amt'), '35'); act('exp-add');
  check('R1 « Coiffeur » chaque mois ajouté en Octobre', rows().includes('Coiffeur'));
  setToday('2026-12-17');
  check('R2 on est en Décembre, la dépense continue', month() === 'Décembre 2026' && rows().includes('Coiffeur'), month());
  prev(); check('R3 Novembre : présente', rows().includes('Coiffeur'));
  prev(); check('R4 Octobre : présente', rows().includes('Coiffeur'));
  // créée plus tard : jamais dans les mois d'avant
  next(); next();
  click($$('[data-act=add-exp]').find(x => !x.dataset.inc)); type($('#f-name'), 'Salle de sport'); type($('#f-amt'), '25'); act('exp-add');
  check('R5 « Salle de sport » créée en Décembre : présente en Décembre', rows().includes('Salle de sport'));
  prev(); check('R6 … absente de Novembre', !rows().includes('Salle de sport'), rows().join(','));
  prev(); check('R7 … absente d\'Octobre', !rows().includes('Salle de sport'), rows().join(','));
  next(); next();
  // changement de montant
  openRow('Carburant'); type($('#f-amt'), '70'); act('exp-save');
  check('R8 Carburant 70 € ce mois seulement (Décembre)', amtOf('Carburant') === '70 €', amtOf('Carburant'));
  prev(); check('R9 Novembre inchangé (58 €)', amtOf('Carburant') === '50 €', amtOf('Carburant'));
  next(); openRow('Carburant'); type($('#f-amt'), '65'); click($('[data-act=scope][data-scope=future]')); act('exp-save');
  check('R10 Carburant 65 € à partir de Décembre', amtOf('Carburant') === '65 €', amtOf('Carburant'));
  prev(); prev(); check('R11 Octobre inchangé (58 €)', amtOf('Carburant') === '50 €', amtOf('Carburant'));
  next(); next();
  // arrêter, retirer
  openRow('Coiffeur'); const stop = $('[data-act=exp-stop]'); click(stop); click(stop);
  check('R12 « Coiffeur » arrêté à partir de Décembre', !rows().includes('Coiffeur'), rows().join(','));
  prev(); check('R13 … toujours en Novembre', rows().includes('Coiffeur'));
  openRow('Streaming'); act('exp-remove');
  check('R14 « Streaming » retiré de Novembre seulement', !rows().includes('Streaming'));
  prev(); check('R15 … toujours en Octobre', rows().includes('Streaming'));
  next(); next(); check('R16 … et en Décembre', rows().includes('Streaming'));

  // annuler une validation
  setToday('2026-11-17'); click($('[data-act=goto]')); act('reveal'); act('move');
  check('R17 Octobre clôturé', /Noté dans ta tirelire/.test(txt($('.card'))));
  act('undo');
  check('R18 validation annulée : le mois se rouvre', !!$('[data-act=add-pay]') && !!$('[data-act=validate]'), txt($('.card')).slice(0, 140));
  act('validate');
  check('R19 on peut le valider de nouveau', /Noté dans ta tirelire/.test(txt($('.card'))));
  next();
  check('R20 Novembre ne peut pas se clôturer avant d\'avoir fini', !$('[data-act=validate]') && !$('[data-act=reveal]'));
  console.log('\nRésultat:', ok, 'OK,', ko, 'échecs');
  console.log('Erreurs JS:', errors.length ? errors : 'aucune');
  process.exitCode = (ko || errors.length) ? 1 : 0;
})();
