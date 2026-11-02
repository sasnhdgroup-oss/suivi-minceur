// Onglet « Aujourd'hui » : date, semaine, phase, séance et repas du jour.
// Étape 1 : lecture seule. Les anneaux et les cases à cocher arrivent à l'étape 2.
import { donnees } from "../donnees.js";
import { aujourdhui, infosDuJour, dateLongue, objectifsDuJour, texteDate } from "../dates.js";
import { echapper, detailBloc, phraseDuJour, nombre } from "../outils.js";
import { profil as profilActuel, profilComplet, planActif, palierAtteint, poidsActuel, objectifDe } from "../profil.js";

export const titre = "Aujourd'hui";

export async function rendu() {
  const date = aujourdhui();
  const infos = infosDuJour(date);
  const profil = profilActuel();
  const p = donnees.programme;
  const bonjour = profil.prenom ? `<p class="bonjour">Bonjour ${echapper(profil.prenom)} 👋</p>` : "";

  if (infos.avantDebut) {
    return `${bonjour}
      <section class="bandeau">
        <span class="date">${dateLongue(date)}</span>
        <h1>Le programme commence bientôt 🚀</h1>
        <p>Premier entraînement le mardi 3 novembre 2026${infos.joursAvantDebut > 0 ? `, dans ${infos.joursAvantDebut} jour${infos.joursAvantDebut > 1 ? "s" : ""}` : ""}.</p>
      </section>
      ${carteProfil(profil)}`;
  }

  const jour = infos.jour;
  const phase = infos.phase;
  const menu = donnees.menus[infos.menu];
  const semainesBarres = Array.from({ length: p.dureeCycleSemaines }, (_, i) =>
    `<span class="${i < infos.semaineCycle ? "faite" : ""}"></span>`).join("");

  const obj = objectifsDuJour(infos);
  const objectif = donnees.personnalisation.objectifs[objectifDe(profil)];
  return `${bonjour}
    <section class="bandeau" aria-label="Résumé du jour">
      <span class="date">${dateLongue(date)}</span>
      <h1>Semaine ${infos.semaineCycle} <span style="opacity:.6;font-size:.7em">/ ${p.dureeCycleSemaines}</span>${infos.cycle > 1 ? ` <span style="font-size:.6em;opacity:.8">· cycle ${infos.cycle}</span>` : ""}</h1>
      <div class="progression-semaines" aria-hidden="true">${semainesBarres}</div>
      <div class="pastilles">
        <span class="pastille">${phase.pastille} ${echapper(phase.nom)}</span>
        <span class="pastille">🍽️ ${echapper(menu.nom)}</span>
        <span class="pastille">🔥 ${nombre(obj.calories)} calories</span>
        <span class="pastille">🥩 ${obj.proteines} g de protéines</span>
        <span class="pastille">💧 ${nombre(obj.eau / 1000)} L d'eau</span>
      </div>
      ${profilComplet(profil) ? `<p class="petit" style="color:#E5E7EB">${objectif.emoji} Objectif : ${echapper(objectif.nom.toLowerCase())}${profil.poidsObjectif ? ` · ${nombre(poidsActuel(profil))} kg → ${nombre(profil.poidsObjectif)} kg` : ""}</p>` : ""}
      <p class="petit" style="color:#E5E7EB">${echapper(phase.resume)}</p>
    </section>

    <p class="citation">« ${echapper(phraseDuJour(date))} »</p>

    ${carteProfil(profil)}

    ${infos.estPreparation ? cartePreparation(p.preparation) : carteSeance(infos)}

    ${carteRepas(infos)}

    ${infos.conseil ? `
    <section class="carte">
      <h3>💡 Le conseil du coach</h3>
      <p>${echapper(infos.conseil)}</p>
    </section>` : ""}

`;
}

function carteProfil(profil) {
  if (!profilComplet(profil)) {
    return `
    <section class="carte">
      <h3>👋 Bienvenue !</h3>
      <p class="sous-texte">Renseignez votre profil (âge, taille, poids, objectif, niveau) : l'application calcule vos besoins et adapte les séances. Ces informations restent uniquement dans votre téléphone.</p>
      <button class="bouton bouton-large" data-aller="reglages">Remplir mon profil</button>
    </section>`;
  }
  if (palierAtteint()) {
    return `
    <section class="carte carte-coloree theme-repos">
      <span class="puce-theme">🎉 Nouveau palier</span>
      <h3>Bravo : 5 kg de moins depuis votre dernier plan !</h3>
      <p class="petit">Vos besoins ont changé. Un nouveau plan est prêt : vérifiez-le et validez-le.</p>
      <button class="bouton bouton-large" data-aller="reglages">Voir mon nouveau plan</button>
    </section>`;
  }
  if (!planActif().valide) {
    return `
    <section class="carte">
      <h3>🎯 Votre plan personnalisé est prêt</h3>
      <p class="sous-texte petit">Calories, protéines et eau calculées pour vous. Validez-le pour que l'application l'applique.</p>
      <button class="bouton bouton-large" data-aller="reglages">Voir et valider mon plan</button>
    </section>`;
  }
  return "";
}

function cartePreparation(prep) {
  return `
    <section class="carte carte-coloree theme-repos">
      <span class="puce-theme">🗓️ Préparation</span>
      <h2>${echapper(prep.titre)}</h2>
      <ul class="liste-simple">${prep.liste.map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>
      <button class="bouton bouton-secondaire bouton-large" data-aller="jour/${prep.date}">✅ Cocher ma préparation</button>
    </section>`;
}

function carteSeance(infos) {
  const jour = infos.jour;
  const lignes = jour.blocs.map((b) => {
    const detail = detailBloc(b, infos.phase);
    return `<li><span class="heure accent-theme">${echapper(b.heure)}</span>
      <span><span>${b.emoji} ${echapper(b.nom)}</span>${detail ? `<br><span class="detail">${echapper(detail)}</span>` : ""}</span></li>`;
  }).join("");
  const aUneSeance = jour.blocs.some((b) => b.seance);
  return `
    <section class="carte carte-coloree theme-${jour.theme}">
      <div class="carte-titre">
        <span class="puce-theme">${jour.emoji} ${echapper(jour.titre)}</span>
        ${infos.estWeekEnd ? "" : `<span class="sous-texte" style="font-weight:700">Fin : ${donnees.programme.finImperative}</span>`}
      </div>
      <h2>${infos.estWeekEnd ? "Mon week-end" : "Ma séance du jour"}</h2>
      ${infos.estWeekEnd ? "" : `<ul class="planning">${lignes}</ul>`}
      ${aUneSeance ? `<button class="bouton bouton-large" data-aller="seance">🎬 Voir les exercices animés</button>` : ""}
      <button class="bouton bouton-secondaire bouton-large" data-aller="jour/${texteDate(infos.date)}">✅ Le détail de ma journée à cocher</button>
      ${infos.estWeekEnd ? `<ul class="liste-simple">${donnees.programme.weekEnd.map((l) => `<li>${echapper(l)}</li>`).join("")}${infos.nomJour === "dimanche" ? "<li>👩‍🍳 Cuisine du dimanche (1 heure) : voir l'onglet Repas</li>" : ""}</ul>` : ""}
    </section>`;
}

function carteRepas(infos) {
  const m = donnees.menus;
  const journee = infos.estWeekEnd ? m.weekEnd : m[infos.menu].jours[infos.nomJour];
  if (!journee) return "";
  const lignes = Object.entries(m.repas).map(([cle, r]) => {
    const contenu = journee[cle];
    if (!contenu) return "";
    return `<div class="repas">
      <span class="repas-emoji" aria-hidden="true">${r.emoji}</span>
      <div><span class="repas-nom">${r.nom}</span> <span class="repas-heure">· ${r.heure}</span>
      <p class="petit">${echapper(contenu.texte)}</p></div>
    </div>`;
  }).join("");
  return `
    <section class="carte">
      <div class="carte-titre"><h2>Mes repas du jour</h2><span class="pastille pastille-claire">${infos.estWeekEnd ? "Week-end" : echapper(m[infos.menu].nom)}</span></div>
      <div class="repas-liste">${lignes}</div>
      <button class="bouton bouton-secondaire bouton-large" data-aller="repas">Voir tous les repas</button>
    </section>`;
}

export function activer(conteneur, { afficher }) {
  conteneur.querySelectorAll("[data-aller]").forEach((b) => b.addEventListener("click", () => afficher(b.dataset.aller)));
}
