// Onglet « Mon corps » : poids, mensurations, graphiques.
// Étape 1 : rappel de l'objectif. La saisie et les graphiques arrivent à l'étape 5.
import { lire } from "../stockage.js";
import { echapper } from "../outils.js";

export const titre = "Mon corps";

export async function rendu() {
  const profil = (await lire("profil")) || {};
  const objectif = profil.poidsDepart && profil.poidsObjectif
    ? `<section class="bandeau"><span class="date">Mon objectif</span><h1>${echapper(profil.poidsDepart)} kg → ${echapper(profil.poidsObjectif)} kg</h1><p class="petit" style="color:#E5E7EB">Rythme visé : 0,4 à 0,5 kg par semaine.</p></section>`
    : `<section class="carte"><h3>Mon objectif</h3><p class="sous-texte">Renseignez votre profil dans les réglages (icône en haut à droite) pour afficher votre objectif.</p></section>`;
  return `
    ${objectif}
    <section class="bientot">
      <span class="gros-emoji" aria-hidden="true">📈</span>
      <strong>Bientôt ici</strong>
      <span class="petit">Saisie du poids et des mensurations, courbe avec la moyenne sur 7 jours, date estimée d'arrivée et historique des charges arrivent à l'étape 5.</span>
    </section>`;
}
