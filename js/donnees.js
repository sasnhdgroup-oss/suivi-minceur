// Chargement des fichiers du programme (dossier data/).
// Pour modifier le programme, les menus ou les aliments, il suffit de modifier ces fichiers.

const FICHIERS = ["programme", "menus", "aliments", "equivalences", "motivation", "mouvements", "personnalisation"];

export const donnees = {};

export async function chargerDonnees() {
  const resultats = await Promise.all(
    FICHIERS.map((nom) =>
      fetch(`data/${nom}.json`, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`Fichier data/${nom}.json introuvable`);
        return r.json();
      })
    )
  );
  FICHIERS.forEach((nom, i) => { donnees[nom] = resultats[i]; });
  donnees.alimentsParId = Object.fromEntries(donnees.aliments.aliments.map((a) => [a.id, a]));
  return donnees;
}
