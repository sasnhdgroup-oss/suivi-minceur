# Mon programme minceur et musculation

Application installable sur le téléphone pour suivre le programme de 13 semaines : séances, repas, poids.
Elle est gratuite, fonctionne sans compte et garde les données personnelles uniquement dans le téléphone.

Adresse de l'application : https://sasnhdgroup-oss.github.io/suivi-minceur/

## Installer l'application sur l'iPhone

1. Ouvrir l'adresse ci-dessus avec **Safari** (pas Chrome).
2. Toucher le bouton **Partager** (le carré avec une flèche vers le haut).
3. Faire défiler et choisir **« Sur l'écran d'accueil »**, puis **« Ajouter »**.
4. L'icône « Mon programme » apparaît sur l'écran d'accueil : l'ouvrir depuis cette icône.

Sur Android avec Chrome : menu (trois points) puis « Installer l'application ».

## Modifier le programme sans toucher au code

Tout le contenu est dans le dossier `data/` :

| Fichier | Contenu |
|---|---|
| `data/programme.json` | Planning de la semaine, séances, fiches des exercices, phases et progression, conseils du coach |
| `data/menus.json` | Menus A et B, week-end, cuisine du dimanche, guide restaurant |
| `data/aliments.json` | Base d'aliments : portion, calories, protéines, rayon |
| `data/equivalences.json` | Remplacements d'un aliment par un autre |
| `data/motivation.json` | Phrases de motivation (une différente chaque jour) |

Exemples :
- **Changer un repas** : dans `data/menus.json`, chercher le jour (par exemple `"mardi"` dans `"menuA"`) et modifier le texte, les calories et les protéines.
- **Changer le nombre de séries** : dans `data/programme.json`, section `"phases"`, modifier `"series"` ou `"reps"` de l'exercice.
- **Ajouter une phrase de motivation** : l'ajouter dans la liste de `data/motivation.json`.

Sur GitHub, ouvrir le fichier, cliquer sur le crayon (« Edit »), modifier, puis « Commit changes ». La mise à jour en ligne prend environ une minute.

## Tester une autre date

Ajouter `?date=2026-11-10` à la fin de l'adresse pour voir l'application comme si l'on était ce jour-là.

## Données personnelles

Le profil (âge, taille, poids), les pesées et les séances sont enregistrés uniquement dans le téléphone (stockage du navigateur). Ils ne sont jamais publiés sur GitHub. L'export d'une sauvegarde arrive à l'étape 7.

## Avancement

| Étape | Contenu | État |
|---|---|---|
| 1 | Fondations : fichiers, charte, 5 onglets, données | ✅ Faite |
| 2 | Aujourd'hui (anneaux, eau) et calendrier par mois | À faire |
| 3 | Séance guidée : charges, minuteurs, écran allumé | À faire |
| 4 | Repas : cases, remplacements, compteurs, courses | À faire |
| 5 | Mon corps : poids, mensurations, graphiques | À faire |
| 6 | Animations : silhouettes, confettis, badges | À faire |
| 7 | Hors ligne et sauvegarde | À faire |
| 8 | Mise en ligne finale et guide d'installation | À faire |

Les calories et protéines des repas et des aliments sont des estimations (table Ciqual de l'Anses, étiquettes courantes), à titre indicatif. Cette application n'est pas un outil médical.
