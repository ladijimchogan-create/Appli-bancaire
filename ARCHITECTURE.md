# Ma tirelire : architecture

Document de référence pour Claude Code (et pour toute personne qui reprend le projet).
À lire en entier avant de modifier quoi que ce soit. À mettre à jour dans le même commit que le code.

## 1. À quoi ça sert

Application de budget mensuel pour une personne **indépendante payée en CESU**, dont les revenus arrivent par petits paiements irréguliers. Elle répond à une seule question : **combien mettre de côté (ou prendre) dans la tirelire (le livret A) ce mois-ci, pour qu'il reste toujours 200 € libres ?**

Utilisatrice : une seule personne, sur son téléphone Android, peu à l'aise avec l'informatique. L'app doit rester **simple, ludique, rassurante**. Tutoiement partout, français, aucun jargon.

## 2. Règles d'or (ne jamais enfreindre)

1. **Aucune donnée personnelle dans le dépôt.** Le dépôt est public (GitHub Pages gratuit). Ni vrais montants, ni vrais noms de clients, ni vrai texte de configuration. Les données d'exemple (`demoData()`) sont inventées et retirées de la version finale.
2. **Les données ne quittent jamais le téléphone.** Aucun appel réseau, aucun serveur, aucun traceur, aucune bibliothèque externe. Tout est dans `localStorage`.
3. **Une seule page, hors ligne.** `docs/index.html` est autonome (CSS, JS et polices intégrés). Un service worker la garde disponible sans connexion.
4. **La version finale est vierge.** Au premier lancement : écran de bienvenue, aucun chiffre, aucun client.
5. **Ne jamais perdre les données de l'utilisatrice.** Tout changement du format de données passe par `migrate()` (voir §6) et est testé.
6. **Chaque règle métier a un test.** On ne change pas une règle sans la discuter avec le propriétaire et sans mettre à jour les tests.

## 3. Fichiers

```
src/index.src.html      Source unique : CSS + HTML + JS. Contient des marqueurs de construction.
src/sw.template.js      Service worker (la version est calculée à la construction).
src/fonts/*.woff2       Fredoka et Nunito (licence OFL), intégrées en base64 à la construction.
public/                 Manifest et icônes, copiés dans docs/.
scripts/build.mjs       Construction. `final` -> docs/ ; `preview` -> dist/preview.html.
docs/                   Version PUBLIÉE (vierge). Servie par GitHub Pages. À committer.
dist/                   Aperçu avec données d'exemple (ignoré par git).
tests/*.test.cjs        Tests jsdom (aucun navigateur nécessaire).
```

### Construction

| Commande | Effet |
|---|---|
| `npm run build` | Construit `docs/` (vierge) et `dist/preview.html` (exemple). |
| `npm test` | Construit tout puis lance tous les tests. |

`__DEMO__` vaut `true` dans l'aperçu et `false` dans la version finale. Les blocs `/*DEMO:BEGIN*/…/*DEMO:END*/`, `DEMOBAR`, `DEMOCASE` et `DEMOIN` sont **retirés de la version finale** par `build.mjs`, qui s'arrête avec une erreur s'il reste des traces de démo. Ne pas déplacer ces repères sans relancer `npm test`.

Le service worker utilise une empreinte du contenu de `index.html` comme nom de cache : une nouvelle version de l'app est récupérée toute seule par le téléphone à sa prochaine ouverture avec internet.

## 4. Règles métier

### 4.1 Périodes (du 16 au 15)

Un « mois » va **du 16 d'un mois au 15 du suivant** (le dernier client paie toujours avant le 16). Il porte le **nom du mois où il commence** : « Octobre » = 16 oct. → 15 nov.

- Clé de période : `'YYYY-MM'` du mois de début. `periodOf('2026-11-03')` = `'2026-10'` ; `periodOf('2026-11-16')` = `'2026-11'`.
- Un paiement ou une dépense **datée** va dans la période qui contient sa date. L'utilisatrice ne change jamais de mois à la main pour saisir.
- Un mois est **terminé** (`ended(k)`) quand la période du jour est strictement après `k` (donc à partir du 16).

### 4.2 Règle des 200 €

Pour une période `k` (fonction `calc`) :

```
revenus  = paiements de k + revenus fixes de k
dépenses = dépenses automatiques de k + dépenses ponctuelles de k
reste    = revenus − dépenses
libre    = settings.min                       (200 € par défaut)
pioche   = max(0, libre − reste)              (à prendre dans la tirelire)
save     = max(0, reste − libre)              (à mettre de côté)
```

Sens : si `reste ≥ libre`, le surplus part dans la tirelire ; sinon la tirelire complète pour qu'il reste `libre` à l'utilisatrice (et couvre un éventuel déficit).

### 4.3 Mouvements de la tirelire

La tirelire (livret A) change par **mouvements réels** que l'utilisatrice note après les avoir faits dans sa banque. L'app ne touche jamais à la banque.

- `P.moves = [{ id, amount, at }]`, `amount > 0` = dépôt, `< 0` = retrait.
- `balance() = settings.start + Σ moves` sur toutes les périodes.
- `tirelireModel(k)` : `target = save>0 ? +save : pioche>0 ? −pioche : 0` ; `moved = Σ moves` ; `rem = target − moved`.
- `rem > 0` : bouton « J'ai mis X de côté » (disponible **dès qu'il y a du surplus**, même avant le 16).
- `rem < 0` : trop mis de côté (« J'ai remis X sur mon compte ») ou, à la fin d'un mois déficitaire, « J'ai pris X dans ma tirelire ».
- Un retrait supérieur au solde est **autorisé** mais signalé (alerte rouge) ; le solde peut devenir négatif.

### 4.4 Fin de mois et validation

1. À partir du 16 : bouton « Le mois est terminé, calculer » (`P.revealed = true`) puis verdict.
2. Si `rem ≠ 0` : un seul bouton note le mouvement **et clôture** le mois.
3. Si `rem = 0` : bouton « Valider ce mois ».
4. Clôturer (`P.done = { at, snap }`) **fige** le mois : `snap` est une copie des lignes (paiements, revenus fixes, dépenses). Plus rien ne le modifie, y compris les règles automatiques créées ou changées plus tard.
5. Conditions (`canClose`) : mois terminé, pas historique, **mois précédent déjà validé** (chaîne séquentielle à partir de `settings.startKey`).
6. Annuler une validation (`canUndo`) n'est possible que si le mois suivant n'est pas validé. Les mouvements restent.

### 4.5 Début, historique

- `settings.startKey` = période de la **première ouverture** (action `start`) ; la tirelire démarre là, avec le solde saisi à l'accueil (facultatif).
- Les périodes **avant** `startKey` sont **l'historique** (`isHist`) : visibles, remplissables, badge « historique », mais **sans mouvement de tirelire ni clôture**, et elles ne bloquent pas la chaîne de validation.
- On peut saisir des paiements/dépenses de n'importe quelle date passée, jusqu'à `MAX_BACK = 24` mois avant le début. Les dates futures sont refusées.

### 4.6 Dépenses et revenus automatiques (règle capitale)

> Une dépense automatique ne compte **qu'à partir de son mois de départ**, jamais dans les mois d'avant. Un changement de montant ne réécrit jamais le passé.

Modèle : `{ id, name, cat?, versions:[{ from, amount }], to }`.

- Active en `k` si `from ≤ k ≤ to` (`to = null` : sans fin). Montant = dernière version dont `from ≤ k`.
- Création : choix « À partir de » (mois affiché par défaut ; on peut remonter dans le passé de façon explicite).
- Modifier le montant : **« ce mois seulement »** (`P.ov[id].amount`) ou **« ce mois et les suivants »** (nouvelle version à `from = k`, les versions suivantes sont supprimées).
- « Retirer de ce mois » : `P.ov[id].removed`. « Arrêter à partir de ce mois » : `to = mois précédent` (ou suppression si la règle n'a jamais compté avant).
- « Compte à partir de » : modifie `versions[0].from` (le début ne peut pas être après le mois affiché).
- Les **dépenses ponctuelles** (« une seule fois ») sont des lignes datées dans `S.oneoffs`.
- Les mois **validés** utilisent leur `snap`, jamais les règles.

### 4.7 Paiements et clients

- `S.payments = [{ id, clientId|null, name, amount, date }]`. Le salaire du mois est **la somme des paiements** de la période, calculée automatiquement.
- `S.clients = [{ id, name }]`, triés alphabétiquement. Doublons détectés sans tenir compte des majuscules, des accents ni des espaces (`normName`).
- Saisie d'un paiement : liste des clients, **« Autre chose »** (nom libre, ne crée pas de client), **« Ajouter un client »**. Croix de suppression avec confirmation « Êtes-vous sûr de supprimer « X » ? ». Supprimer un client **ne supprime pas** ses paiements.
- Renommer un client met à jour tous ses paiements, snapshots compris.
- Pas de montant habituel par client (décision du propriétaire).

## 5. Interface

- Vues : `welcome` (première ouverture), `month`, `jar`, `settings`. `render()` reconstruit la vue entière (pas de framework).
- Événements : **délégation** unique sur `document` avec attributs `data-act="…"`. Pour ajouter une action : un `case` dans le `switch (act)` et un bouton `data-act`.
- Fenêtres du bas (`openSheet`) pour toute saisie. `ps` mémorise l'état de la fenêtre « J'ai reçu un paiement » ; `openSheet` appelle `closeSheet` qui remet `ps = null` : ne pas oublier de le rétablir après l'ouverture (voir `openPay`).
- Style « Argile » : fonds pastel, formes gonflées, mascotte cochon qui change d'humeur (`pig(mood)`), jauge à trois segments (dépenses couvertes → libre → tirelire). Un fond de couleur par catégorie (`--c-fixe`, `--c-courante`, `--c-plaisir`).
- Thème clair/sombre par variables CSS. Zones tactiles ≥ 44 px. `prefers-reduced-motion` respecté.
- Montants : `fmt()` écrit « 1 234,56 € » **à la main** (espace insécable) car certains navigateurs omettent l'espace des milliers pour 4 chiffres. Tous les calculs passent par `r2()` (arrondi au centime).
- La date vient du téléphone (`todayStr()`), rafraîchie quand l'app redevient visible (`visibilitychange`).

## 6. Données et migrations

Clé `localStorage` : `ma-tirelire-v2`. Forme (`v: 2`) :

```
settings:  { min, goal, startKey, start, set, started, lastBackup }
rules:     { inc:[règle], exp:[règle] }
clients:   [{ id, name }]
payments:  [{ id, clientId, name, amount, date }]
oneoffs:   [{ id, name, amount, cat, date }]
periods:   { 'YYYY-MM': { ov:{ [ruleId]:{ amount?, removed? } }, moves:[…], revealed, done:null | { at, snap } } }
```

**`migrate(d)`** convertit les anciennes données sans rien perdre (idempotente). Elle gère déjà : clients créés à partir des noms de paiements, `oneoffs` issus des anciennes dépenses ponctuelles par mois, `started` par défaut à `true`, et l'ancien « mis de côté/pioché » du mois validé transformé en mouvement.

**Pour changer le format** : ajouter une étape dans `migrate()` (jamais supprimer un champ sans le convertir), augmenter `v` si la forme change, écrire un test avec d'anciennes données (voir la section F de `flows.test.cjs`), et vérifier que la **sauvegarde** et la **restauration** restent compatibles.

### Sauvegarde et configuration

- **Sauvegarde** : `JSON.stringify(S)`, à copier, enregistrer en fichier ou partager. Restaurer = coller le texte (`validShape` + `migrate`). Un rappel apparaît après chaque mouvement ou validation tant qu'aucune sauvegarde n'a été faite.
- **Texte de configuration** (premier lancement, sans dates) :
  `{ "config": true, "settings": {"min":200,"goal":1000}, "incomes":[{"name","amount"}], "expenses":[{"name","amount","cat":"fixe|courante|plaisir"}], "clients":["Nom"] }`
  `applyConfig()` démarre à la période du jour et place les règles à partir de ce mois. Ce texte contient des données personnelles : il reste **hors du dépôt** (`.gitignore` l'exclut).

## 7. Tests

`npm test` lance, avec jsdom :

| Fichier | Couvre |
|---|---|
| `flows.test.cjs` | Dépôts/retraits, fin de mois, déficit, historique, dates, première ouverture, configuration, migration, sauvegarde |
| `rules.test.cjs` | Règles automatiques : jamais avant leur début, changement de montant, arrêt, annulation de validation |
| `clients.test.cjs` | Liste, ajout, doublons, suppression avec confirmation, « Autre chose », renommage |
| `config.test.cjs` | **Version finale vierge**, date du téléphone, configuration d'exemple |

Les tests de l'aperçu utilisent `demoData()` : Loyer 800, Assurance 60, Téléphone 10, Crédit 130, Carburant 50, Streaming 20 (total **1 070 €**), revenu fixe 100 €, paiements 340 + 210 + 180, solde de départ 300 €, date du jour simulée au 24 oct. 2026. **Si on change ces chiffres, adapter les attentes.**

## 8. Pièges connus

- Ne pas introduire de `fetch`, de script externe ni de police distante (cassent le « hors ligne » et la confidentialité).
- Après `openSheet(...)`, `ps` est remis à zéro : le rétablir (voir `openPay`).
- `P.done.snap` est la vérité d'un mois validé : ne pas recalculer un mois validé à partir des règles.
- Les périodes se nomment par leur mois de **début** : un paiement du 12 sept. est dans « Août » (16 août → 15 sept.).
- `Intl.NumberFormat` ne sépare pas toujours les milliers : utiliser `fmt()`.

## 9. Idées non réalisées

- Code PIN pour ouvrir l'app.
- Paquet Android (APK) via Capacitor, avec une clé de signature unique conservée.
- Synchronisation entre deux téléphones (demande un service externe : à discuter, cela change la confidentialité).
- Sauvegarde automatique vers un fichier à chaque validation.
