// Détail d'une journée : jour, date, horaires et ce qu'il y a à faire précisément, avec cases à cocher.
import { donnees } from "../donnees.js";
import { dateDepuisTexte, dateLongue, texteDate, aujourdhui } from "../dates.js";
import { contenuDuJour, doseDetaillee } from "../journee.js";
import { echapper, nombre } from "../outils.js";
import { brancherFiches, themeSeance } from "../composants.js";
import { animerTout } from "../animations.js";
import { lireSuivi, cocher, toutCocher, progression } from "../suivi.js";

export const titre = "Ma journée";
let dateCourante = null;

export function titreDynamique(param) {
  const d = param ? dateDepuisTexte(param) : aujourdhui();
  return dateLongue(d).replace(/ \d{4}$/, "");
}

function decaler(texte, jours) {
  const d = dateDepuisTexte(texte); d.setDate(d.getDate() + jours); return texteDate(d);
}

const caseACocher = (cle, coche, libelle) => `
  <label class="coche">
    <input type="checkbox" data-coche="${cle}" ${coche ? "checked" : ""}>
    <span class="coche-carre" aria-hidden="true"></span>
    <span class="sr">${echapper(libelle)}</span>
  </label>`;

export async function rendu(param) {
  dateCourante = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : texteDate(aujourdhui());
  const date = dateDepuisTexte(dateCourante);
  const contenu = contenuDuJour(date);
  const infos = contenu.infos;
  const suivi = await lireSuivi(dateCourante);
  const prog = progression(contenu, suivi);
  const p = donnees.programme;

  const navigation = `
    <div class="navigation-jours">
      <button class="bouton bouton-secondaire" data-aller="jour/${decaler(dateCourante, -1)}" aria-label="Jour précédent">‹ Veille</button>
      <button class="bouton bouton-secondaire" data-aller="calendrier">🗓️ Calendrier</button>
      <button class="bouton bouton-secondaire" data-aller="jour/${decaler(dateCourante, 1)}" aria-label="Jour suivant">Lendemain ›</button>
    </div>`;

  if (contenu.avantDebut) {
    return `${navigation}<section class="bientot"><span class="gros-emoji">⏳</span><strong>${dateLongue(date)}</strong><span>Le programme commence le mardi 3 novembre 2026.</span></section>`;
  }

  const blocs = contenu.blocs.map((b) => {
    if (b.exercices) {
      const s = p.seances[b.seance];
      const lignes = b.exercices.map((e, i) => {
        const cleCoche = `${b.id}:${e.id}`;
        return `
          <div class="ligne-exercice ${suivi.coches[cleCoche] ? "faite" : ""}">
            <button class="ligne-anim" data-fiche="${e.id}" data-seance="${b.seance}" aria-label="Voir la fiche : ${echapper(e.nom)}">
              <svg class="animation" data-animation="${e.id}" aria-hidden="true"></svg>
            </button>
            <strong class="ligne-titre"><span class="ligne-numero">${i + 1}.</span> ${echapper(e.nom)}</strong>
            ${caseACocher(cleCoche, suivi.coches[cleCoche], `${e.nom} fait`)}
            <div class="ligne-texte">
              <span class="ligne-dose">${echapper(e.dose.principal)}</span>
              <span class="ligne-dose">${echapper(e.dose.secondaire)}</span>
              <span class="detail">⏸️ Repos ${e.repos} s</span>
              <span class="detail">Touchez l'animation pour la fiche</span>
            </div>
          </div>`;
      }).join("");
      return `
        <section class="carte carte-coloree theme-${themeSeance(b.seance)}">
          <div class="carte-titre"><span class="puce-theme">${s.emoji} ${echapper(s.sousTitre)}</span><strong class="accent-theme">${echapper(b.heure)}</strong></div>
          <h2>${echapper(b.nom)}</h2>
          <p class="sous-texte petit">${echapper(b.court)}${b.lignes.length ? ` · ${echapper(b.lignes[0])}` : ""}</p>
          <div class="liste-exercices">${lignes}</div>
        </section>`;
    }
    return `
      <section class="carte bloc-simple ${suivi.coches[b.id] ? "faite" : ""}">
        <div class="bloc-ligne">
          <span class="bloc-emoji" aria-hidden="true">${b.emoji || "✅"}</span>
          <div class="ligne-texte">
            ${b.heure ? `<span class="heure">${echapper(b.heure)}</span> ` : ""}<strong>${echapper(b.nom)}</strong>
            ${b.court ? `<span class="ligne-dose">${echapper(b.court)}</span>` : ""}
            ${b.type === "intervalles" ? `<ul class="liste-simple detail">${b.lignes.slice(1).map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>` : ""}
          </div>
          ${b.cochable ? caseACocher(b.id, suivi.coches[b.id], `${b.nom} fait`) : ""}
        </div>
      </section>`;
  }).join("");

  const m = donnees.menus;
  const journee = infos.estWeekEnd ? m.weekEnd : (m[infos.menu] && m[infos.menu].jours[infos.nomJour]);
  const repas = journee ? `
    <section class="carte">
      <div class="carte-titre"><h3>🥗 Repas du jour</h3><span class="pastille pastille-claire">${infos.estWeekEnd ? "Week-end" : echapper(m[infos.menu].nom)}</span></div>
      <div class="repas-liste">${Object.entries(m.repas).map(([k, r]) => journee[k] ? `
        <div class="repas"><span class="repas-emoji" aria-hidden="true">${r.emoji}</span>
        <div><span class="repas-nom">${r.nom}</span> <span class="repas-heure">· ${r.heure}</span><p class="petit">${echapper(journee[k].texte)}</p>
        <p class="repas-chiffres">≈ ${nombre(journee[k].calories)} calories · ${nombre(journee[k].proteines)} g de protéines</p></div></div>` : "").join("")}</div>
    </section>` : "";

  return `
    ${navigation}
    <section class="bandeau">
      <span class="date">${dateLongue(date)}</span>
      <h1>${contenu.emoji} ${echapper(contenu.titre)}</h1>
      <div class="pastilles">
        <span class="pastille">Semaine ${infos.semaineCycle} / ${p.dureeCycleSemaines}</span>
        <span class="pastille">${infos.phase.pastille} ${echapper(infos.phase.nom)}</span>
      </div>
      ${prog.total ? `
      <div class="jauge" role="progressbar" aria-valuemin="0" aria-valuemax="${prog.total}" aria-valuenow="${prog.faits}"><span style="width:${Math.round((prog.faits / prog.total) * 100)}%"></span></div>
      <p class="petit" style="color:#E5E7EB" id="texte-progression">${prog.faits} sur ${prog.total} étapes faites${prog.faite ? " · journée réussie ✅" : ""}</p>` : ""}
    </section>
    ${infos.conseil && !infos.estWeekEnd ? `<p class="avertissement">💡 ${echapper(infos.conseil)}</p>` : ""}
    ${blocs}
    ${prog.total ? `<button class="bouton ${prog.faite ? "bouton-secondaire" : ""} bouton-large" id="tout-cocher" data-etat="${prog.faite ? "1" : "0"}">${prog.faite ? "Tout décocher" : "✅ Tout est fait"}</button>` : ""}
    ${repas}
    ${navigation}`;
}

export function activer(conteneur, { afficher }) {
  const infos = contenuDuJour(dateDepuisTexte(dateCourante)).infos;
  animerTout(conteneur);
  if (infos.phase) brancherFiches(conteneur, (id, seance) => doseDetaillee(id, seance, infos.phase));
  conteneur.querySelectorAll("[data-aller]").forEach((b) => b.addEventListener("click", () => afficher(b.dataset.aller)));
  conteneur.querySelectorAll("[data-coche]").forEach((c) => c.addEventListener("change", async () => {
    const s = await cocher(dateCourante, c.dataset.coche, c.checked);
    c.closest(".ligne-exercice, .bloc-simple")?.classList.toggle("faite", c.checked);
    if (c.checked && navigator.vibrate) navigator.vibrate(15);
    const contenu = contenuDuJour(dateDepuisTexte(dateCourante));
    const prog = progression(contenu, s);
    const texte = conteneur.querySelector("#texte-progression");
    if (texte) texte.textContent = `${prog.faits} sur ${prog.total} étapes faites${prog.faite ? " · journée réussie ✅" : ""}`;
    const jauge = conteneur.querySelector(".jauge span");
    if (jauge) jauge.style.width = `${Math.round((prog.faits / prog.total) * 100)}%`;
    const bouton = conteneur.querySelector("#tout-cocher");
    if (bouton) { bouton.dataset.etat = prog.faite ? "1" : "0"; bouton.textContent = prog.faite ? "Tout décocher" : "✅ Tout est fait"; bouton.classList.toggle("bouton-secondaire", prog.faite); }
  }));
  const bouton = conteneur.querySelector("#tout-cocher");
  if (bouton) bouton.addEventListener("click", async () => {
    await toutCocher(dateCourante, bouton.dataset.etat !== "1");
    afficher(`jour/${dateCourante}`);
  });
}
