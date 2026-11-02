// Onglet « Repas » : menus du jour et de la semaine.
// Étape 1 : consultation. Cases « Mangé », remplacements et compteurs arrivent à l'étape 4.
import { donnees } from "../donnees.js";
import { aujourdhui, infosDuJour } from "../dates.js";
import { echapper, nombre } from "../outils.js";

export const titre = "Repas";

const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
let jourChoisi = null;

export async function rendu() {
  const infos = infosDuJour(aujourdhui());
  const m = donnees.menus;
  const cleMenu = infos.menu || "menuA";
  const menu = m[cleMenu];
  if (!jourChoisi) {
    if (infos.estWeekEnd) jourChoisi = "weekend";
    else if (JOURS_SEMAINE.includes(infos.nomJour)) jourChoisi = infos.nomJour;
    else jourChoisi = "lundi";
  }

  const choix = [...JOURS_SEMAINE, "weekend"].map((j) => {
    const libelle = j === "weekend" ? "Week-end" : j.charAt(0).toUpperCase() + j.slice(1);
    return `<button data-jour="${j}" aria-pressed="${j === jourChoisi}">${libelle}</button>`;
  }).join("");

  const journee = jourChoisi === "weekend" ? m.weekEnd : menu.jours[jourChoisi];
  let totalCal = 0, totalProt = 0;
  const lignes = Object.entries(m.repas).map(([cle, r]) => {
    const c = journee[cle];
    totalCal += c.calories; totalProt += c.proteines;
    return `<div class="repas">
      <span class="repas-emoji" aria-hidden="true">${r.emoji}</span>
      <div><span class="repas-nom">${r.nom}</span> <span class="repas-heure">· ${r.heure}</span>
      <p class="petit">${echapper(c.texte)}</p>
      <p class="repas-chiffres">≈ ${nombre(c.calories)} calories · ${nombre(c.proteines)} g de protéines</p></div>
    </div>`;
  }).join("");

  return `
    <section class="carte">
      <h2>${echapper(menu.nom)} · semaine ${infos.semaineCycle || 1}</h2>
      <p class="sous-texte petit">${echapper(m.regle)}</p>
      <div class="segments" style="grid-template-columns:repeat(3,1fr)">${choix}</div>
      <div class="repas-liste">${lignes}</div>
      <p class="sous-texte petit">Total estimé : ≈ ${nombre(totalCal)} calories et ${nombre(totalProt)} g de protéines. ${echapper(m.margeCalories)}</p>
    </section>

    ${jourChoisi === "weekend" ? carteRestaurant(m.restaurant) : ""}

    <section class="carte carte-coloree theme-repos">
      <span class="puce-theme">👩‍🍳 ${echapper(m.cuisineDuDimanche.titre)}</span>
      <p class="petit">${echapper(m.cuisineDuDimanche.intro)}</p>
      <h3>Pour la semaine prochaine (${echapper(m[cleMenu === "menuA" ? "menuB" : "menuA"].nom)})</h3>
      <ol class="liste-simple petit">${m[cleMenu === "menuA" ? "menuB" : "menuA"].cuisineDuDimanche.map((e) => `<li>${echapper(e)}</li>`).join("")}</ol>
      <p class="sous-texte petit">${echapper(m.cuisineDuDimanche.conservation)}</p>
    </section>

    <p class="avertissement">${echapper(m.noteChiffres)}</p>

    <section class="bientot">
      <span class="gros-emoji" aria-hidden="true">✅</span>
      <strong>Bientôt ici</strong>
      <span class="petit">Cases « Mangé », bouton « Remplacer », ajout d'un aliment, jauge des calories et liste de courses arrivent à l'étape 4.</span>
    </section>`;
}

function carteRestaurant(r) {
  return `
    <section class="carte">
      <h3>🍽️ Repas au restaurant</h3>
      <p><strong>La règle d'or :</strong> ${echapper(r.regleOr)}</p>
      <p class="petit">🥤 ${echapper(r.boissons)}</p>
      <h3 class="accent-theme">✅ Les bons choix</h3>
      <ul class="liste-simple petit">${r.bonsChoix.map((x) => `<li>${echapper(x)}</li>`).join("")}</ul>
      <h3>⚠️ Les pièges (porc et alcool cachés)</h3>
      <ul class="liste-simple petit">${r.pieges.map((x) => `<li>${echapper(x)}</li>`).join("")}</ul>
    </section>`;
}

export function activer(conteneur, { afficher }) {
  conteneur.querySelectorAll("[data-jour]").forEach((b) => b.addEventListener("click", () => {
    jourChoisi = b.dataset.jour;
    afficher("repas");
  }));
}
