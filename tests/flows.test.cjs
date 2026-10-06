const { PREVIEW, FINAL } = require('./helpers.cjs');
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/scrollTo/.test(e.message)) errors.push('jsdomError: ' + (e.detail || e.message)); });
vc.on('error', e => errors.push('console.error: ' + e));
let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { (cond ? ok++ : ko++); console.log((cond ? 'OK  ' : 'FAIL'), name, cond ? '' : ('  -> ' + extra)); };

async function fresh(seed) {
  const dom = await JSDOM.fromFile(PREVIEW, { runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w) { if (seed) w.localStorage.setItem('ma-tirelire-v2', JSON.stringify(seed)); } });
  const w = dom.window, d = w.document;
  const H = {
    w, d,
    $: s => d.querySelector(s), $$: s => [...d.querySelectorAll(s)],
    txt: el => (el ? el.textContent.replace(/\s+/g, ' ').replace(/[\u202f\u00a0]/g, ' ').trim() : null),
    type: (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles:true })); el.dispatchEvent(new w.Event('change', { bubbles:true })); },
    click: el => el.dispatchEvent(new w.MouseEvent('click', { bubbles:true })),
  };
  H.act = a => H.click(H.$(`[data-act="${a}"]`));
  H.setToday = v => H.type(H.$('#demo-date'), v);
  H.pickClient = name => { const t = H.$$('[data-act=sel-client]').find(b => H.txt(b.querySelector('.cn')) === name); if (t) { H.click(t); return; } H.click(H.$('[data-act=cl-add-open]')); H.type(H.$('#f-newcl'), name); H.click(H.$('[data-act=cl-add-save]')); };
  H.addPay = (amount, name, date) => { H.act('add-pay'); H.pickClient(name); H.type(H.$('#f-amt'), amount); if (date) H.type(H.$('#f-date'), date); H.act('pay-save'); };
  H.addOnce = (name, amount, date) => { H.click(H.$$('[data-act=add-exp]').find(x => !x.dataset.inc)); H.type(H.$('#f-name'), name); H.type(H.$('#f-amt'), amount); H.click(H.$('[data-act=freq][data-freq=once]')); if (date) H.type(H.$('#f-date'), date); H.act('exp-add'); };
  H.tab = i => H.click(H.$$('[data-tab]')[i]);
  H.balance = () => { H.tab(1); const t = H.txt(H.$('.bal')); H.tab(0); return t; };
  H.bubble = () => H.txt(H.$('.bubble'));
  H.expRows = () => H.$$('.xrow .nm b').map(H.txt);
  return H;
}

(async () => {
  // ===== A. Au fil du mois : dépôts dans la tirelire, correction, fin de période =====
  let h = await fresh(); let { $, $$, txt, type, click, act } = h;
  check('A1 départ : phrase en cours', h.bubble() === 'Encore 240 € et tes dépenses sont couvertes.', h.bubble());
  check('A2 « 1 070 € » avec l\'espace des milliers', $$('.big')[1].textContent === '1\u00a0070\u00a0€', JSON.stringify($$('.big')[1].textContent));
  check('A3 un fond de couleur par catégorie', !!$('.catblk.c-fixe') && !!$('.catblk.c-courante') && !!$('.catblk.c-plaisir'));
  check('A4 pas de bouton « mis de côté » sans surplus', !$('[data-act=move]'));
  h.addPay('600', 'Mme Durand', '2026-10-22'); h.addPay('100', 'M. Lopez', '2026-10-23');
  check('A5 surplus de 260 € proposé', h.bubble() === 'Tout est couvert. 260 € à mettre dans la tirelire.', h.bubble());
  check('A6 bouton « J\'ai mis 260 € de côté »', txt($('[data-act=move]')) === 'J’ai mis 260 € de côté', txt($('[data-act=move]')));
  check('A7 reste à mettre = 260 €', /Reste à mettre de côté\s*260 €/.test(txt($('.mvbox'))), txt($('.mvbox')));
  act('move');
  check('A8 après le clic : reste à mettre = 0', /Déjà mis de côté\s*260 €/.test(txt($('.mvbox'))) && /Reste à mettre de côté\s*0 €/.test(txt($('.mvbox'))), txt($('.mvbox')));
  check('A9 plus de bouton de dépôt', !$('[data-act=move]'));
  check('A10 la tirelire a reçu l\'argent : 300 + 260', h.balance() === '560 €', h.balance());
  h.addPay('50', 'Famille Petit', '2026-10-24');
  check('A11 nouveau surplus : seulement la différence (50 €)', txt($('[data-act=move]')) === 'J’ai mis 50 € de côté', txt($('[data-act=move]')));
  act('move');
  h.addOnce('Dentiste', '100', '2026-10-24');
  check('A12 une dépense datée est rangée dans le mois', h.expRows().includes('Dentiste'), h.expRows().join(','));
  check('A13 trop mis de côté : alerte et bouton de remise', /Tu as mis 100 € de trop/.test(txt($('.card'))) && txt($('[data-act=move]')) === 'J’ai remis 100 € sur mon compte', txt($('.card')).slice(0, 200));
  act('move');
  check('A14 après la remise : tirelire = 300 + 210', h.balance() === '510 €', h.balance());
  act('undo-move');
  check('A15 annuler le dernier mouvement', h.balance() === '610 €', h.balance());
  act('move');   // on remet 100 sur le compte pour retrouver 45,16
  h.setToday('2026-11-17');
  check('A16 le 17 nov. : rappel pour Octobre', /Octobre est terminé/.test(txt($('.note'))));
  click($('[data-act=goto]')); act('reveal');
  check('A17 verdict : déjà dans la tirelire', h.bubble() === 'Déjà 210 € dans ta tirelire. Bravo !', h.bubble());
  check('A18 bouton « Valider ce mois » (rien à ajouter)', txt($('[data-act=validate]')) === 'Valider ce mois');
  act('validate');
  check('A19 mois validé, tirelire inchangée', /Tu as mis 210 € de côté/.test(h.bubble()) && h.balance() === '510 €', h.bubble() + ' / ' + h.balance());

  // ===== B. Fin de mois : un seul geste =====
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  h.addPay('600', 'Mme Durand', '2026-10-22'); h.addPay('100', 'M. Lopez', '2026-10-23');
  h.setToday('2026-11-17'); click($('[data-act=goto]')); act('reveal');
  check('B1 verdict : mets 260 de côté', h.bubble() === 'Mets 260 € de côté', h.bubble());
  act('move');
  check('B2 un seul appui : noté et mois clôturé', /Tu as mis 260 € de côté. Bravo/.test(h.bubble()) && /Noté dans ta tirelire/.test(txt($('.card'))), h.bubble());
  check('B3 tirelire = 560', h.balance() === '560 €', h.balance());

  // ===== C. Mois déficitaire =====
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  h.setToday('2026-11-17'); click($('[data-act=goto]')); act('reveal');
  check('C1 verdict : prends 440', h.bubble() === 'Prends 440 € dans ta tirelire', h.bubble());
  check('C2 alerte : la tirelire ne suffit pas (300 €)', /ne contient que 300 €.*manquera 140 €/.test(txt($('.warn'))), txt($('.warn')));
  act('move');
  check('C3 tirelire négative affichée en rouge', h.balance() === '−140 €' && (h.tab(1), $('.bal').classList.contains('neg')), h.balance());
  h.tab(0);

  // ===== D. Historique et dates modifiables =====
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  h.addPay('50', 'Mme Durand', '2026-09-20');
  check('D1 paiement ancien rangé dans Septembre (historique)', txt($('.mt b')).startsWith('Septembre 2026') && /historique/.test(txt($('.mt b'))), txt($('.mt b')));
  check('D2 historique : phrase, aucun bouton de tirelire', /avant ton début/.test(h.bubble()) && !$('[data-act=move]') && !$('[data-act=reveal]') && !$('[data-act=validate]'));
  check('D3 on peut revenir en arrière jusqu\'à Septembre, pas plus', $('[data-act=prev]').getAttribute('aria-disabled') === 'true' && $('[data-act=next]').getAttribute('aria-disabled') === 'false');
  act('add-pay'); h.pickClient('M. Lopez'); type($('#f-amt'), '10'); type($('#f-date'), '2020-01-01'); act('pay-save');
  check('D4 date trop ancienne refusée', /trop ancienne/.test(txt($('#f-err')) + txt($('#f-hint'))), txt($('#f-err')));
  type($('#f-date'), '2026-12-25'); act('pay-save');
  check('D5 date future refusée', /futur/.test(txt($('#f-err'))), txt($('#f-err')));
  act('close-sheet');
  h.addOnce('Pharmacie', '25', '2026-10-20');
  check('D6 dépense datée du 20 oct. dans Octobre, avec sa date', txt($('.mt b')).startsWith('Octobre 2026') && h.expRows().includes('Pharmacie') && /20 oct\./.test(txt($$('.xrow').find(x => /Pharmacie/.test(txt(x))))), h.expRows().join(','));
  h.addOnce('Coiffeur', '30', '2026-09-25');
  check('D7 dépense datée du 25 sept. dans Septembre', txt($('.mt b')).startsWith('Septembre 2026') && h.expRows().includes('Coiffeur'), txt($('.mt b')));
  click($('[data-act=add-exp]:not([data-inc])')); type($('#f-name'), 'Mutuelle'); type($('#f-amt'), '40');
  $('#f-from').value = '2026-09'; act('exp-add');
  check('D8 dépense automatique « à partir de Septembre » : présente en Septembre', h.expRows().includes('Mutuelle'), h.expRows().join(','));
  click($('[data-act=next]'));
  check('D9 … et en Octobre', h.expRows().includes('Mutuelle'), h.expRows().join(','));
  click($$('.xrow').find(x => /Mutuelle/.test(txt(x))));
  $('#f-from').value = '2026-10'; act('exp-save');
  check('D10 début déplacé à Octobre : toujours en Octobre', h.expRows().includes('Mutuelle'));
  click($('[data-act=prev]'));
  check('D11 … mais plus en Septembre', !h.expRows().includes('Mutuelle'), h.expRows().join(','));
  h.setToday('2026-11-17'); click($('[data-act=goto]'));
  check('D12 le mois d\'historique ne bloque pas la clôture d\'Octobre', !!$('[data-act=reveal]'), txt($('.card')).slice(0, 120));
  act('reveal'); act('move');
  check('D13 Octobre clôturé malgré Septembre non validé', /Noté dans ta tirelire/.test(txt($('.card'))), txt($('.card')).slice(0, 160));

  // ===== E. Départ le jour de la première ouverture =====
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  act('demo-first');
  check('E1 première ouverture : écran de bienvenue, sans barre d\'onglets', !!$('.welcome') && $('.tabs').style.display === 'none');
  h.setToday('2026-11-03');
  check('E2 ouverture le 3 nov. : début dans Octobre', /Octobre/.test(txt($('.welcome .card'))) && /16 oct\. → 15 nov\./.test(txt($('.welcome .card'))), txt($('.welcome .card')));
  type($('#w-bal'), '300'); act('start');
  check('E3 on arrive sur Octobre 2026', txt($('.mt b')) === 'Octobre 2026', txt($('.mt b')));
  check('E4 solde du livret A saisi à l\'accueil : 300 €', h.balance() === '300 €', h.balance());
  check('E5 on peut remonter dans l\'historique dès le premier jour', h.addPay('20', 'Mme Test', '2026-09-30') === undefined && txt($('.mt b')).startsWith('Septembre 2026'), txt($('.mt b')));
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  act('demo-first'); h.setToday('2026-11-20'); act('start');
  check('E6 ouverture le 20 nov. : début dans Novembre', txt($('.mt b')) === 'Novembre 2026' && txt($('.mt small')) === '16 nov. → 15 déc.', txt($('.mt b')) + txt($('.mt small')));

  // ===== E bis. Configuration de départ =====
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  act('demo-first'); h.setToday('2026-11-03'); act('config-open');
  type($('#bk-in'), 'nimporte quoi'); act('config-apply');
  check('E7 texte de configuration invalide refusé', /pas une configuration valide/.test(txt($('#f-err'))));
  type($('#bk-in'), JSON.stringify({ config:true, settings:{ min:200, goal:900 }, incomes:[{ name:'Allocation', amount:100 }], expenses:[{ name:'Loyer', amount:500, cat:'fixe' }, { name:'Essence', amount:60, cat:'courante' }], clients:['Mme Test', 'M. Essai', 'mme test'] }));
  act('config-apply');
  check('E8 configuration appliquée : Octobre avec les dépenses', txt($('.mt b')) === 'Octobre 2026' && h.expRows().includes('Loyer') && h.expRows().includes('Essence') && $$('.big').map(txt)[1] === '560 €', h.expRows().join(',') + $$('.big').map(txt).join('|'));
  act('toggle-clients');
  check('E9 clients importés sans doublon', $$('.tile').length === 2, String($$('.tile').length));
  h.addPay('20', 'Mme Test', '2026-09-20');
  check('E10 dépenses de la config absentes des mois d\'avant le début', txt($('.mt b')).startsWith('Septembre 2026') && $$('.big').map(txt)[1] === '0 €', $$('.big').map(txt).join('|'));

  // ===== F. Anciennes données converties sans rien perdre =====
  const old = { v:2, settings:{ min:200, goal:1000, startKey:'2026-10', start:100, set:true, lastBackup:0 },
    rules:{ inc:[], exp:[{ id:'r1', name:'Loyer', cat:'fixe', versions:[{ from:'2026-10', amount:500 }], to:null }] },
    payments:[{ id:'p1', name:'Mme X', amount:900, date:'2026-10-20' }, { id:'p2', name:' mme  x ', amount:5, date:'2026-10-21' }],
    periods:{ '2026-10':{ ov:{}, extra:[{ id:'e1', name:'Cadeau', amount:30, cat:'plaisir' }], revealed:true,
      done:{ saved:150, drawn:0, at:1, snap:{ pays:[{ id:'p1', name:'Mme X', amount:900, date:'2026-10-20' }], inc:[], exp:[{ id:'r1', rule:true, name:'Loyer', amount:500, cat:'fixe' }, { id:'e1', rule:false, name:'Cadeau', amount:30, cat:'plaisir' }] } } } } };
  h = await fresh(old); ({ $, $$, txt, type, click, act } = h);
  check('F1 ancien « mis de côté » 150 € devenu un mouvement : tirelire = 100 + 150', h.balance() === '250 €', h.balance());
  check('F2 le mois validé reste validé', /Tu as mis 150 € de côté/.test(h.bubble()), h.bubble());
  h.tab(2); act('backup');
  const saved = JSON.parse($('#bk').value);
  check('F3 la dépense ponctuelle « Cadeau » est devenue une dépense datée', saved.oneoffs.length === 1 && saved.oneoffs[0].date === '2026-10-16' && saved.oneoffs[0].name === 'Cadeau', JSON.stringify(saved.oneoffs));
  check('F4 les noms deviennent des clients, sans doublon', saved.clients.length === 1 && saved.clients[0].name === 'Mme X', JSON.stringify(saved.clients));
  check('F5 ouvert = déjà démarré (pas d\'écran de bienvenue)', saved.settings.started === true);

  // ===== G. Sauvegarde / restauration =====
  h = await fresh(); ({ $, $$, txt, type, click, act } = h);
  h.addPay('600', 'Mme Durand', '2026-10-22'); h.addPay('100', 'M. Lopez', '2026-10-23'); act('move');
  h.tab(2); act('backup'); const json = $('#bk').value;
  type($('#bk-in'), 'xxx'); act('import');
  check('G1 import invalide refusé', /pas une sauvegarde/.test(txt($('#f-err'))));
  type($('#bk-in'), json); const imp = $('[data-act=import]'); click(imp); click(imp);
  check('G2 restauration : tirelire retrouvée', h.balance() === '560 €', h.balance());

  console.log('\nRésultat:', ok, 'OK,', ko, 'échecs');
  console.log('Erreurs JS:', errors.length ? errors : 'aucune');
  process.exitCode = (ko || errors.length) ? 1 : 0;
})();
