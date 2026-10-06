# Consignes pour Claude Code : Ma tirelire

Lis d'abord `ARCHITECTURE.md` : il décrit les règles métier, le format des données et les pièges. Ce fichier n'en est que le résumé opérationnel.

## En une phrase
Petite app de budget (une seule page, hors ligne, sans serveur) pour une personne payée en CESU : elle dit combien mettre de côté ou prendre dans la tirelire (livret A) chaque mois du 16 au 15, pour qu'il reste toujours 200 € libres.

## Commandes
- `npm install` une fois.
- `npm test` : construit l'aperçu et la version finale puis lance **tous** les tests. Doit être vert avant tout commit.
- `npm run build` : reconstruit `docs/` (publiée, vierge) et `dist/preview.html` (exemple).
- Essayer l'app : ouvrir `dist/preview.html` dans un navigateur (données d'exemple + bandeau pour changer la date du jour).

## Règles impératives
1. **Aucune donnée personnelle dans le dépôt** (il est public) : pas de vrais montants, noms de clients, ni texte de configuration. Utiliser des valeurs inventées dans les tests et les exemples.
2. **Aucun appel réseau, aucune bibliothèque ni police externe.** L'app reste autonome et hors ligne.
3. **Ne jamais perdre les données de l'utilisatrice** : tout changement de format passe par `migrate()` avec un test d'anciennes données.
4. **Ne change pas une règle métier de toi-même** (périodes 16→15, règle des 200 €, dépenses automatiques « jamais avant leur début », mois validés figés). Demande d’abord au propriétaire du projet.
5. Pour modifier le comportement : ajoute ou adapte un test dans `tests/`, puis `npm test`.
6. Après chaque changement d'app : `npm run build` et committe `docs/` (c'est lui que GitHub Pages publie).
7. Mets `ARCHITECTURE.md` à jour dans le même commit si une règle ou le format change.

## Conventions
- Interface en français, tutoiement, phrases courtes, pas de jargon. Apostrophes typographiques (’), espaces insécables avant « ? », « € ».
- Un seul fichier source : `src/index.src.html`. Pas de framework. Événements par délégation avec `data-act`.
- Montants : toujours `r2()` pour les calculs et `fmt()` pour l'affichage.
- Accessibilité : zones tactiles ≥ 44 px, libellés sur les boutons-icônes, contraste suffisant, mode sombre.

## Où chercher
- Règles de calcul : `calc`, `tirelireModel`, `heroHtml`.
- Règles automatiques : `ruleActive`, `ruleAmount`, `liveLines`, actions `exp-*`.
- Données et migration : `emptyData`, `migrate`, `applyConfig`, `load`, `persist`.
- Interface : `monthView`, `jarView`, `settingsView`, `welcomeView`, `openSheet`.

## Premier travail suggéré
Lancer `npm install && npm test`, lire `ARCHITECTURE.md`, puis demander au propriétaire du projet ce qu’il veut faire évoluer.
