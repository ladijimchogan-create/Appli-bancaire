const { PREVIEW, FINAL } = require('./helpers.cjs');
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/scrollTo/.test(e.message)) errors.push('jsdomError: ' + (e.detail || e.message)); });
vc.on('error', e => errors.push('console.error: ' + e));
const load = async (seed) => JSDOM.fromFile(PREVIEW, { runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole: vc,
  beforeParse(w) { if (seed) w.localStorage.setItem('ma-tirelire-v2', JSON.stringify(seed)); } });
(async () => {
  let ok = 0, ko = 0;
  const check = (name, cond, extra='') => { (cond ? ok++ : ko++); console.log((cond?'OK  ':'FAIL'), name, cond?'':('  -> ' + extra)); };
  const dom = await load(); const w = dom.window, d = w.document;
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const txt = el => (el ? el.textContent.replace(/\s+/g,' ').replace(/[\u202f\u00a0]/g,' ').trim() : null);
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles:true })); el.dispatchEvent(new w.Event('change', { bubbles:true })); };
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  const act = a => click($(`[data-act="${a}"]`));
  const names = () => $$('.clist .cn').map(txt);
  const delBtn = n => $$('[data-act=cl-del]').find(b => b.getAttribute('aria-label') === 'Supprimer ' + n);
  const payNames = () => $$('.pay .nm b').map(txt);

  act('add-pay');
  check('liste des clients, classée par ordre alphabétique', JSON.stringify(names()) === JSON.stringify(['Famille Petit','M. Bernard','M. Lopez','Mme Durand','Mme Garcia']), names().join(' | '));
  check('"Autre chose" et "Ajouter un client" toujours visibles', !!$('[data-act=sel-other]') && !!$('[data-act=cl-add-open]'));
  check('aucun client choisi au départ, pas de clavier forcé', !$$('[data-act=sel-client]').some(b => b.getAttribute('aria-pressed') === 'true'));
  type($('#f-amt'), '50'); act('pay-save');
  check('sans client choisi : message', /Choisis qui t’a payée/.test(txt($('#f-err'))), txt($('#f-err')));

  // ajouter un client depuis la fenêtre
  act('cl-add-open'); act('cl-add-save');
  check('nom vide refusé', /Écris le nom/.test(txt($('#f-newerr'))), txt($('#f-newerr')));
  type($('#f-newcl'), '  Mme   Martin '); act('cl-add-save');
  check('nouveau client ajouté et sélectionné', names().includes('Mme Martin') && txt($$('[data-act=sel-client]').find(b => b.getAttribute('aria-pressed') === 'true').querySelector('.cn')) === 'Mme Martin', names().join('|'));
  act('cl-add-open'); type($('#f-newcl'), 'mme  DURAND'); act('cl-add-save');
  check('doublon (majuscules, espaces) : le client existant est sélectionné, pas de doublon', names().filter(n => /durand/i.test(n)).length === 1 && txt($$('[data-act=sel-client]').find(b => b.getAttribute('aria-pressed') === 'true').querySelector('.cn')) === 'Mme Durand', names().join('|'));

  // supprimer un client : croix + confirmation
  click(delBtn('M. Bernard'));
  check('confirmation : Êtes-vous sûr de supprimer « M. Bernard » ?', txt($('.confirm b')) === 'Êtes-vous sûr de supprimer « M. Bernard » ?', txt($('.confirm')));
  check('rien n\'est supprimé avant la confirmation', JSON.parse(w.localStorage.getItem('ma-tirelire-v2') || '{"clients":[{}]}').clients.length >= 1);
  act('cl-del-no');
  check('« Non, je garde » : le client est toujours là', names().includes('M. Bernard'));
  click(delBtn('M. Bernard')); act('cl-del-yes');
  check('« Oui, supprimer » : client retiré de la liste', !names().includes('M. Bernard'), names().join('|'));
  // supprimer un client qui a des paiements : l'historique reste
  click(delBtn('M. Lopez')); act('cl-del-yes');
  check('client avec paiements supprimé de la liste', !names().includes('M. Lopez'));
  act('close-sheet');
  check('ses anciens paiements restent dans le mois', payNames().includes('M. Lopez'), payNames().join('|'));
  check('le salaire du mois ne change pas (730 €)', txt($('.sec-h .big')) === '730 €', txt($('.sec-h .big')));

  // Autre chose
  act('add-pay'); act('sel-other');
  check('« Autre chose » : champ pour préciser le nom', !!$('#f-other'));
  type($('#f-amt'), '20'); act('pay-save');
  check('nom obligatoire pour « Autre chose »', /Précise le nom/.test(txt($('#f-err'))), txt($('#f-err')));
  type($('#f-other'), 'Remboursement'); act('pay-save');
  check('paiement « Autre chose » enregistré avec son nom', payNames().includes('Remboursement') && txt($('.sec-h .big')) === '750 €', payNames().join('|') + ' ' + txt($('.sec-h .big')));
  act('add-pay');
  check('« Autre chose » ne crée pas de client', !names().includes('Remboursement'), names().join('|'));
  act('close-sheet');

  // modifier un paiement « Autre chose » -> reste sélectionné sur Autre
  click($$('.pay').find(x => /Remboursement/.test(txt(x))));
  check('édition : « Autre chose » présélectionné avec son nom', $('#f-other') && $('#f-other').value === 'Remboursement');
  act('close-sheet');

  // Réglages : renommer, supprimer, ajouter
  click($$('[data-tab]')[2]);
  check('Réglages : carte Mes clients', $$('[data-act=rename-client]').length === 4, String($$('[data-act=rename-client]').length));
  click($$('[data-act=rename-client]').find(b => /Mme Durand/.test(txt(b))));
  type($('#f-name'), 'Mme Durand-Roy'); act('client-rename-go');
  click($$('[data-tab]')[0]);
  check('renommer met à jour les anciens paiements', payNames().includes('Mme Durand-Roy') && !payNames().includes('Mme Durand'), payNames().join('|'));
  click($$('[data-tab]')[2]);
  click($$('[data-act=client-del-ask]')[0]);
  check('Réglages : même question de confirmation', /Êtes-vous sûr de supprimer/.test(txt($('.sheet'))), txt($('.sheet')));
  act('close-sheet');
  act('client-add-set'); type($('#f-name'), 'Mme durand-roy'); act('client-add-go');
  check('Réglages : doublon signalé, pas de doublon créé', $$('[data-act=rename-client]').length === 4);

  // données et migration
  const saved = JSON.parse(w.localStorage.getItem('ma-tirelire-v2'));
  check('clients enregistrés dans les données (sauvegarde incluse)', Array.isArray(saved.clients) && saved.clients.length === 4, JSON.stringify(saved.clients));

  const old = { v:2, settings:{ min:200, goal:1000, startKey:'2026-10', start:0, set:false, lastBackup:0 }, rules:{ inc:[], exp:[] },
    payments:[{ id:'a', name:'Mme X', amount:10, date:'2026-10-20' }, { id:'b', name:' mme  x ', amount:5, date:'2026-10-21' }, { id:'c', name:'', amount:7, date:'2026-10-22' }], periods:{} };
  const dom2 = await load(old); const d2 = dom2.window.document;
  d2.querySelector('[data-act=add-pay]').dispatchEvent(new dom2.window.MouseEvent('click', { bubbles:true }));
  const n2 = [...d2.querySelectorAll('.clist .cn')].map(e => e.textContent.trim());
  check('migration : anciens noms transformés en clients, sans doublon', JSON.stringify(n2) === JSON.stringify(['Mme X']), n2.join('|'));

  console.log('\nRésultat:', ok, 'OK,', ko, 'échecs');
  console.log('Erreurs JS:', errors.length ? errors : 'aucune');
  process.exitCode = (ko || errors.length) ? 1 : 0;
})();
