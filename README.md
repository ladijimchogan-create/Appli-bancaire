# Ma tirelire

Petite application de budget **privée, hors ligne et sans serveur**. Elle aide une personne payée en CESU, dont les revenus arrivent par petits paiements, à savoir chaque mois (du 16 au 15) combien mettre de côté dans sa tirelire (livret A), ou combien y prendre, pour qu'il reste toujours 200 € libres.

- Les données restent **dans le téléphone**, jamais sur GitHub ni ailleurs.
- Une seule page, qui s'installe comme une application sur Android (aucun magasin d'applications).
- Dépôt public : il ne contient **aucune donnée personnelle**.

## Utiliser l'app
Voir **[MISE-EN-LIGNE.md](MISE-EN-LIGNE.md)** : créer le compte GitHub, publier, installer sur le téléphone, premier lancement, mises à jour.

## Développer
```
npm install
npm test            # construit tout puis lance les tests
npm run build       # reconstruit docs/ (publiée) et dist/preview.html (exemple)
```
Ouvrir `dist/preview.html` pour essayer l'app avec des données d'exemple inventées.

La documentation pour reprendre le projet est dans **[ARCHITECTURE.md](ARCHITECTURE.md)** et **[CLAUDE.md](CLAUDE.md)** (consignes pour Claude Code).

## Structure
```
src/        source unique (index.src.html), service worker, polices
public/     manifeste et icônes
scripts/    construction
docs/       version publiée, vierge (servie par GitHub Pages)
tests/      tests automatiques (jsdom)
```

## Licences
Polices Fredoka et Nunito : SIL Open Font License 1.1.
