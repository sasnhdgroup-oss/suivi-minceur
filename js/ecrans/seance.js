// Onglet « Séance » : exercices du jour avec leurs fiches.
// Étape 1 : consultation. La saisie des charges et les minuteurs arrivent à l'étape 3.
import { donnees } from "../donnees.js";
import { aujourdhui, infosDuJour } from "../dates.js";
import { echapper, detailBloc, doseExercice } from "../outils.js";

export const titre = "Séance";

export async function rendu() {
  const infos = infosDuJour(aujourdhui());
  const p = donnees.programme;

  if (infos.avantDebut || infos.estPreparation) {
    return `<section class="bientot"><span class="gros-emoji">🎒</span><strong>Pas de séance aujourd'hui</strong><span class="petit">Premier entraînement le mardi 3 novembre 2026.</span></section>
      ${toutesLesSeances(infos)}`;
  }

  const jour = infos.jour;
  const blocsSeance = jour.blocs.filter((b) => b.seance);

  if (!blocsSeance.length) {
    return `
      <section class="carte carte-coloree theme-${jour.theme}">
        <span class="puce-theme">${jour.emoji} ${echapper(jour.titre)}</span>
        <h2>Repos actif</h2>
        <ul class="liste-simple">${p.weekEnd.map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>
      </section>
      ${toutesLesSeances(infos)}`;
  }

  const contenu = blocsSeance.map((bloc) => carteSeance(bloc.seance, infos, bloc)).join("");
  const autres = jour.blocs.filter((b) => !b.seance && b.type !== "douche").map((b) => {
    const d = detailBloc(b, infos.phase);
    return `<li><span class="heure">${echapper(b.heure)}</span><span>${b.emoji} ${echapper(b.nom)}${d ? `<br><span class="detail">${echapper(d)}</span>` : ""}</span></li>`;
  }).join("");

  return `
    ${contenu}
    <section class="carte">
      <h3>Le reste de la matinée</h3>
      <ul class="planning">${autres}</ul>
      <p class="sous-texte petit">Vitesse sur le tapis : ${p.vitesses.effort} km/h en effort, ${p.vitesses.recuperation} km/h en récupération.</p>
    </section>
    ${carteRegles()}
    <section class="bientot">
      <span class="gros-emoji" aria-hidden="true">⏱️</span>
      <strong>Bientôt ici</strong>
      <span class="petit">La séance guidée (saisie des charges, minuteur de repos, minuteur de marche en pente, écran toujours allumé) arrive à l'étape 3.</span>
    </section>`;
}

function carteSeance(id, infos, bloc) {
  const p = donnees.programme;
  const s = p.seances[id];
  const theme = { A: "bas", B: "haut", C: "entier", G: "gainage" }[id];
  const exercices = s.exercices.map((idEx) => carteExercice(idEx, id, infos.phase)).join("");
  const tours = id === "G" ? ` · ${infos.phase.gainage.tours} tours` : "";
  return `
    <section class="carte carte-coloree theme-${theme}">
      <div class="carte-titre">
        <span class="puce-theme">${s.emoji} ${echapper(s.sousTitre)}</span>
        ${bloc ? `<span class="sous-texte" style="font-weight:700">${echapper(bloc.heure)}</span>` : ""}
      </div>
      <h2>${echapper(s.nom)}${tours}</h2>
      <p class="sous-texte petit">${echapper(infos.phase.nom)} · ${echapper(infos.phase.resume)}</p>
      <div style="display:flex;flex-direction:column;gap:8px">${exercices}</div>
      <p class="sous-texte petit">Touchez un exercice pour voir comment bien le faire.</p>
    </section>`;
}

function carteExercice(idEx, idSeance, phase) {
  const e = donnees.programme.exercices[idEx];
  const dose = doseExercice(idEx, idSeance, phase);
  return `
    <div class="exercice">
      <button class="exercice-entete" aria-expanded="false">
        <span class="exercice-emoji" aria-hidden="true">${e.emoji}</span>
        <span><span class="exercice-nom">${echapper(e.nom)}</span><span class="exercice-explication">${echapper(e.explication)}</span></span>
        <span class="exercice-dose">${echapper(dose)}</span>
      </button>
      <div class="exercice-details">
        <div><span class="etiquette">💪 Muscles travaillés</span>${echapper(e.muscles)}</div>
        <div><span class="etiquette">📋 Comment bien le faire ?</span><ol>${e.execution.map((x) => `<li>${echapper(x)}</li>`).join("")}</ol></div>
        <div><span class="etiquette">🌬️ Respiration</span>${echapper(e.respiration)}</div>
        <div><span class="etiquette">⚠️ Erreur fréquente</span>${echapper(e.erreurFrequente)}</div>
        <div><span class="etiquette">💡 Conseil</span>${echapper(e.conseil)}</div>
        <div><span class="etiquette">⏸️ Repos entre les séries</span>${e.reposSecondes} secondes</div>
      </div>
    </div>`;
}

function carteRegles() {
  const p = donnees.programme;
  return `
    <section class="carte">
      <h3>⭐ Les règles d'or</h3>
      <ul class="liste-simple petit">${p.reglesOr.map((r) => `<li>${echapper(r)}</li>`).join("")}</ul>
      <p class="avertissement">${echapper(p.explications.seriesRepetitions)}<br>${echapper(p.explications.sousLePied)}</p>
    </section>`;
}

// Quand il n'y a pas de musculation ce jour-là, on peut quand même consulter toutes les séances.
function toutesLesSeances(infos) {
  const p = donnees.programme;
  const phase = infos.phase || p.phases[0];
  const fauxInfos = { ...infos, phase };
  return `<h2 style="margin-top:8px">Toutes les séances</h2>` +
    ["A", "B", "C", "G"].map((id) => carteSeance(id, fauxInfos, null)).join("");
}

export function activer(conteneur) {
  conteneur.querySelectorAll(".exercice-entete").forEach((b) => b.addEventListener("click", () => {
    const parent = b.closest(".exercice");
    const ouvert = parent.classList.toggle("ouvert");
    b.setAttribute("aria-expanded", String(ouvert));
  }));
}
