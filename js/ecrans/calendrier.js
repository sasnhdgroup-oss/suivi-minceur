// Onglet « Calendrier » : vue par mois et programme détaillé semaine par semaine.
import { donnees } from "../donnees.js";
import { aujourdhui, infosDuJour, dateCourte, texteDate, dateDepuisTexte } from "../dates.js";
import { contenuDuJour } from "../journee.js";
import { echapper } from "../outils.js";
import { tousLesSuivis, progression } from "../suivi.js";

export const titre = "Calendrier";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
let vue = "liste";
let moisAffiche = null;

function themeDuJour(infos) {
  if (infos.avantDebut) return "aucun";
  if (infos.estPreparation) return "repos";
  return infos.jour.theme;
}

// Jours d'entraînement réussis d'affilée (les week-ends ne cassent pas la série).
function serieEnCours(suivis, date) {
  let n = 0;
  const d = new Date(date);
  if (!(suivis[texteDate(d)] && suivis[texteDate(d)].faite)) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const inf = infosDuJour(d);
    if (inf.avantDebut) break;
    if (!inf.estWeekEnd && !inf.estPreparation) {
      if (suivis[texteDate(d)] && suivis[texteDate(d)].faite) n++;
      else break;
    }
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export async function rendu() {
  const date = aujourdhui();
  const suivis = await tousLesSuivis();
  const serie = serieEnCours(suivis, date);
  const segments = `
    <div class="segments">
      <button data-vue="liste" aria-pressed="${vue === "liste"}">Semaine par semaine</button>
      <button data-vue="mois" aria-pressed="${vue === "mois"}">Mois</button>
    </div>`;
  const entete = `
    <section class="carte">
      <div class="carte-titre"><h2>Mon suivi</h2><span class="pastille pastille-claire">🔥 ${serie} jour${serie > 1 ? "s" : ""} d'affilée</span></div>
      <p class="sous-texte petit">Touchez un jour pour voir ce qu'il y a à faire et cocher ce qui est fait.</p>
      ${segments}
    </section>`;
  return entete + (vue === "mois" ? vueMois(date, suivis) : vueListe(date, suivis));
}

function vueMois(date, suivis) {
  const debutProg = dateDepuisTexte(donnees.programme.dateDebutProgramme);
  if (!moisAffiche) moisAffiche = new Date((date < debutProg ? debutProg : date).getFullYear(), (date < debutProg ? debutProg : date).getMonth(), 1);
  const premier = new Date(moisAffiche);
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(premier.getFullYear(), premier.getMonth() + 1, 0).getDate();
  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push(`<span class="case-vide"></span>`);
  for (let j = 1; j <= nbJours; j++) {
    const d = new Date(premier.getFullYear(), premier.getMonth(), j);
    const t = texteDate(d);
    const inf = infosDuJour(d);
    const theme = themeDuJour(inf);
    const contenu = inf.avantDebut ? null : contenuDuJour(d);
    const prog = contenu ? progression(contenu, suivis[t]) : null;
    const marque = prog && prog.faite ? "✅" : prog && prog.faits ? "◐" : inf.avantDebut ? "" : (inf.estPreparation ? "🗓️" : inf.jour.emoji);
    cases.push(`
      <button class="case-jour theme-${theme} ${t === texteDate(date) ? "aujourdhui" : ""} ${prog && prog.faite ? "faite" : ""}" data-aller="jour/${t}" ${inf.avantDebut ? "disabled" : ""}
        aria-label="${dateCourte(d)}${inf.avantDebut ? "" : ` : ${echapper(inf.estPreparation ? "Préparation" : inf.jour.titre)}${prog && prog.faite ? ", fait" : ""}`}">
        <span class="case-numero">${j}</span><span class="case-marque" aria-hidden="true">${marque}</span>
      </button>`);
  }
  const legende = [["bas", "🍑 Bas du corps"], ["haut", "💪 Haut du corps"], ["entier", "🔥 Corps entier"], ["gainage", "🧱 Gainage et aquagym"], ["repos", "🌳 Repos actif"]]
    .map(([t, l]) => `<span class="legende theme-${t}"><span class="legende-pastille"></span>${l}</span>`).join("");
  return `
    <section class="carte">
      <div class="carte-titre">
        <button class="bouton-icone" data-mois="-1" aria-label="Mois précédent">‹</button>
        <h2>${MOIS[premier.getMonth()]} ${premier.getFullYear()}</h2>
        <button class="bouton-icone" data-mois="1" aria-label="Mois suivant">›</button>
      </div>
      <div class="grille-mois">${JOURS_COURTS.map((j) => `<span class="entete-jour">${j}</span>`).join("")}${cases.join("")}</div>
      <div class="legendes">${legende}<span class="legende">✅ fait · ◐ commencé</span></div>
    </section>`;
}

function resumeJour(contenu) {
  const parties = [];
  for (const b of contenu.blocs) {
    if (b.type === "douche" || b.type === "echauffement" || b.type === "etirements") continue;
    if (b.exercices) parties.push(`${b.nom.replace(/ \(.*\)$/, "")} : ${b.exercices.map((e) => `${e.nom} ${e.dose.court || e.dose.principal}`).join(", ")}`);
    else parties.push(`${b.nom}${b.court && b.type !== "aquagym" ? ` : ${b.court}` : ""}`);
  }
  return parties;
}

function vueListe(date, suivis) {
  const p = donnees.programme;
  const debut = dateDepuisTexte(p.dateDebutProgramme);
  const infosAuj = infosDuJour(date);
  const cycle = infosAuj.avantDebut ? 1 : infosAuj.cycle;
  const debutCycle = new Date(debut); debutCycle.setDate(debut.getDate() + (cycle - 1) * p.dureeCycleSemaines * 7);
  const semaines = [];
  for (let s = 0; s < p.dureeCycleSemaines; s++) {
    const lundi = new Date(debutCycle); lundi.setDate(debutCycle.getDate() + s * 7);
    const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
    const infSem = infosDuJour(lundi);
    const jours = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(lundi); d.setDate(lundi.getDate() + j);
      const t = texteDate(d);
      const contenu = contenuDuJour(d);
      const inf = contenu.infos;
      const prog = progression(contenu, suivis[t]);
      const nomJour = inf.nomJour.charAt(0).toUpperCase() + inf.nomJour.slice(1);
      const details = inf.estWeekEnd ? [inf.nomJour === "dimanche" ? "Balade de 45 minutes ou plus · cuisine du dimanche" : "Balade de 45 minutes ou plus"] : inf.estPreparation ? ["Préparer le sac, pesée le lendemain matin à jeun"] : resumeJour(contenu);
      jours.push(`
        <button class="jour-liste theme-${themeDuJour(inf)} ${t === texteDate(date) ? "aujourdhui" : ""}" data-aller="jour/${t}">
          <span class="jour-liste-date"><strong>${nomJour} ${dateCourte(d)}</strong><span class="jour-liste-etat">${prog.faite ? "✅ Fait" : prog.faits ? `◐ ${prog.faits}/${prog.total}` : ""}</span></span>
          <span class="jour-liste-titre accent-theme">${inf.estPreparation ? "🗓️ Préparation" : `${contenu.emoji} ${echapper(contenu.titre)}`}</span>
          ${details.map((x) => `<span class="detail">${echapper(x)}</span>`).join("")}
        </button>`);
    }
    const enCours = !infosAuj.avantDebut && infosAuj.semaineCycle === s + 1;
    semaines.push(`
      <details class="semaine" ${enCours || (infosAuj.avantDebut && s === 0) ? "open" : ""} id="semaine-${s + 1}">
        <summary>
          <span><strong>Semaine ${s + 1}</strong> · ${dateCourte(lundi)} → ${dateCourte(dimanche)}</span>
          <span class="pastille pastille-claire">${infSem.phase.pastille} ${echapper(infSem.phase.nom)}</span>
        </summary>
        <p class="sous-texte petit">${echapper(infSem.phase.resume)} · ${echapper(donnees.menus[infSem.menu].nom)}</p>
        <div class="liste-jours">${jours.join("")}</div>
      </details>`);
  }
  return `<p class="sous-texte petit">Cycle ${cycle} : ${dateCourte(debutCycle)} → ${p.dureeCycleSemaines} semaines.</p>${semaines.join("")}`;
}

export function activer(conteneur, { afficher }) {
  conteneur.querySelectorAll("[data-vue]").forEach((b) => b.addEventListener("click", () => { vue = b.dataset.vue; afficher("calendrier"); }));
  conteneur.querySelectorAll("[data-mois]").forEach((b) => b.addEventListener("click", () => {
    moisAffiche = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + Number(b.dataset.mois), 1);
    afficher("calendrier");
  }));
  conteneur.querySelectorAll("[data-aller]").forEach((b) => b.addEventListener("click", () => afficher(b.dataset.aller)));
  const ouverte = conteneur.querySelector("details.semaine[open]");
  if (ouverte && vue === "liste") setTimeout(() => ouverte.scrollIntoView({ block: "start", behavior: "instant" }), 0);
}
