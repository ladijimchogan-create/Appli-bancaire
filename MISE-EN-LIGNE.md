# Mettre « Ma tirelire » en ligne et l'installer sur le téléphone

Tout est gratuit. À faire **une seule fois** par la personne qui gère le projet. Compter 15 minutes.

## Ce qui est public, ce qui reste privé

| | |
|---|---|
| **Sur GitHub (public)** | Le programme de l'app, vide. Aucun chiffre, aucun nom. |
| **Dans le téléphone (privé)** | Tous les montants, paiements et clients. GitHub ne les voit jamais. |
| **À part, en privé** | Le fichier `ma-tirelire-configuration.txt` avec les vraies dépenses. **Ne jamais le mettre dans GitHub.** |

Avec GitHub gratuit, le dépôt doit être public pour que le site fonctionne. C'est sans risque tant qu'il ne contient que le programme.

## 1. Créer le compte et le dépôt
1. Créer un compte gratuit sur github.com (ou se connecter).
2. Cliquer sur **New repository** (nouveau dépôt). Nom conseillé : `ma-tirelire`. Choisir **Public**. Ne rien cocher d'autre, puis **Create repository**.

## 2. Envoyer les fichiers
**Sans ligne de commande :** décompresser le dossier du projet, puis sur la page du dépôt cliquer **uploading an existing file** et glisser **tout le contenu** du dossier (y compris le dossier `docs`). Valider avec **Commit changes**.

**Avec Git :**
```
git init
git add .
git commit -m "Ma tirelire"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/ma-tirelire.git
git push -u origin main
```
Le fichier `.gitignore` empêche d'envoyer par erreur un fichier de configuration ou de sauvegarde.

## 3. Activer la publication (GitHub Pages)
1. Dans le dépôt : **Settings** (Paramètres) puis **Pages**.
2. Source : **Deploy from a branch**. Branche : **main**. Dossier : **/docs**. Enregistrer.
3. Attendre une à deux minutes. L'adresse apparaît en haut de la page :
   `https://TON-PSEUDO.github.io/ma-tirelire/`

Les intitulés exacts peuvent varier un peu selon l'évolution de GitHub.

**L'adresse ne doit plus changer.** Les données de l'app sont rattachées à cette adresse : si elle change, l'app repart de zéro sur le téléphone.

## 4. Installer sur le téléphone Android
1. Ouvrir l'adresse dans **Chrome**.
2. Menu **⋮** puis **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
3. L'icône du cochon apparaît sur l'écran d'accueil. L'app s'ouvre en plein écran et marche sans connexion.

## 5. Premier lancement
1. À l'écran **Bienvenue**, dire combien il y a sur le livret A (facultatif).
2. Appuyer sur **J'ai un texte de configuration**, coller le texte reçu en privé, puis **Appliquer**. Les dépenses et les clients sont déjà là.
3. Sans configuration : appuyer sur **Commencer** et tout saisir à la main.
4. Supprimer ensuite le message qui contenait le texte de configuration.

Le suivi commence **le jour de la première ouverture**. On peut quand même saisir des paiements ou des dépenses plus anciens en changeant leur date.

## 6. Au quotidien
- **J'ai reçu un paiement** : choisir le client, le montant, la date si besoin.
- Dès qu'il y a du surplus, **J'ai mis X de côté** (après avoir fait le virement dans la banque).
- À partir du 16 : **Le mois est terminé, calculer**, puis le bouton qui clôture le mois.

## 7. Sauvegarde (important)
Les données ne sont que dans le téléphone. Si on efface les données de l'app, si on réinitialise ou change de téléphone, **elles sont perdues sans sauvegarde**.
- Réglages → **Sauvegarder ou restaurer** → **Copier le texte** ou **Enregistrer un fichier**, puis le garder (message à soi-même, Drive).
- L'app rappelle de le faire après chaque mouvement ou validation.
- Nouveau téléphone : installer l'app, puis **Restaurer** en collant la sauvegarde.

## 8. Mettre à jour l'app
1. Modifier le projet (avec Claude Code par exemple), puis `npm run build`.
2. Envoyer sur GitHub (`git add . && git commit -m "…" && git push`).
3. Le téléphone récupère la nouvelle version tout seul à la prochaine ouverture avec internet. **Les données ne sont pas touchées.**

## En cas de souci
- *L'app affiche une ancienne version* : la fermer complètement et la rouvrir avec internet (parfois deux fois).
- *« Installer l'application » n'apparaît pas* : vérifier que l'adresse commence par `https://` et qu'on est dans Chrome.
- *Page 404 sur GitHub* : vérifier Settings → Pages (branche `main`, dossier `/docs`) et que le dossier `docs` est bien dans le dépôt.
