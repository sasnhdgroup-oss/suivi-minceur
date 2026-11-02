// Éléments d'interface partagés : tuiles animées et fiche d'un exercice.
import { donnees } from "./donnees.js";
import { echapper } from "./outils.js";
import { animer } from "./animations.js";

const THEMES = { A: "bas", B: "haut", C: "entier", G: "gainage" };
export const themeSeance = (id) => THEMES[id] || "repos";

// Tuile façon « grille d'exercices » : animation, nom, répétitions et séries.
export function tuileExercice(ex, idSeance) {
  return `
    <button class="tuile" data-fiche="${ex.id}" data-seance="${idSeance}" aria-label="${echapper(ex.nom)} : ${echapper(ex.dose.principal)}, ${echapper(ex.dose.secondaire)}. Voir la fiche">
      <svg class="animation" data-animation="${ex.id}" aria-hidden="true"></svg>
      <span class="tuile-nom">${echapper(ex.nom)}</span>
      <span class="tuile-doses">
        <span class="tuile-reps">${echapper(ex.dose.principal)}</span>
        <span class="tuile-series">${echapper(ex.dose.secondaire)}</span>
      </span>
    </button>`;
}

export function grilleExercices(bloc) {
  return `<div class="grille-tuiles">${bloc.exercices.map((e) => tuileExercice(e, bloc.seance)).join("")}</div>`;
}

function texteRythme(id) {
  const r = donnees.mouvements.mouvements[id]?.rythme;
  if (!r) return "";
  const [aller, pause, retour] = r;
  if (id === "marche_halteres") return "Marche à petits pas réguliers.";
  if (id === "planche") return "Position tenue, respiration calme.";
  return `L'animation suit le rythme : ${aller} s, pause ${pause} s, puis ${retour} s.`;
}

// Fiche plein écran d'un exercice, avec la grande animation.
export function ouvrirFiche(idExercice, dose) {
  const e = donnees.programme.exercices[idExercice];
  let dialogue = document.getElementById("fiche-exercice");
  if (!dialogue) {
    dialogue = document.createElement("dialog");
    dialogue.id = "fiche-exercice";
    dialogue.className = "fiche";
    document.body.appendChild(dialogue);
    dialogue.addEventListener("click", (ev) => { if (ev.target === dialogue || ev.target.closest("[data-fermer]")) dialogue.close(); });
  }
  dialogue.innerHTML = `
    <div class="fiche-contenu">
      <div class="fiche-haut">
        <h2>${e.emoji} ${echapper(e.nom)}</h2>
        <button class="bouton-icone" data-fermer aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="fiche-animation"><svg class="animation" data-animation="${idExercice}" aria-label="Animation du mouvement ${echapper(e.nom)}"></svg></div>
      ${dose ? `<div class="pastilles"><span class="pastille pastille-claire">🔁 ${echapper(dose.principal)}</span><span class="pastille pastille-claire">📚 ${echapper(dose.secondaire)}</span><span class="pastille pastille-claire">⏸️ ${e.reposSecondes} s de repos</span></div>` : ""}
      <p class="sous-texte petit">${echapper(texteRythme(idExercice))}</p>
      <p>${echapper(e.explication)}</p>
      <div><span class="etiquette">💪 Muscles travaillés</span>${echapper(e.muscles)}</div>
      <div><span class="etiquette">📋 Comment bien le faire ?</span><ol class="liste-simple">${e.execution.map((x) => `<li>${echapper(x)}</li>`).join("")}</ol></div>
      <div><span class="etiquette">🌬️ Respiration</span>${echapper(e.respiration)}</div>
      <div><span class="etiquette">⚠️ Erreur fréquente</span>${echapper(e.erreurFrequente)}</div>
      <div><span class="etiquette">💡 Conseil</span>${echapper(e.conseil)}</div>
      <button class="bouton bouton-large" data-fermer>J'ai compris</button>
    </div>`;
  if (typeof dialogue.showModal === "function") dialogue.showModal(); else dialogue.setAttribute("open", "");
  animer(dialogue.querySelector("svg.animation"), idExercice);
}

// Branche l'ouverture des fiches sur les tuiles d'un conteneur.
export function brancherFiches(conteneur, trouverDose) {
  conteneur.querySelectorAll("[data-fiche]").forEach((b) => b.addEventListener("click", (ev) => {
    if (ev.target.closest("input, label")) return;
    ouvrirFiche(b.dataset.fiche, trouverDose ? trouverDose(b.dataset.fiche, b.dataset.seance) : null);
  }));
}
