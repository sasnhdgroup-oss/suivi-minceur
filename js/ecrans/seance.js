// Onglet « Séance » : la séance du jour en grille d'exercices animés.
import { donnees } from "../donnees.js";
import { aujourdhui, infosDuJour, dateLongue, texteDate } from "../dates.js";
import { contenuDuJour, doseDetaillee } from "../journee.js";
import { echapper } from "../outils.js";
import { grilleExercices, brancherFiches, themeSeance } from "../composants.js";
import { animerTout } from "../animations.js";
import { lireSuivi, progression } from "../suivi.js";
import { exercicesSeance, adapterPhase } from "../profil.js";

export const titre = "Séance";

export async function rendu() {
  const date = aujourdhui();
  const contenu = contenuDuJour(date);
  const infos = contenu.infos;
  const blocsExercices = contenu.blocs.filter((b) => b.exercices);

  if (!blocsExercices.length) {
    const message = infos.avantDebut ? "Premier entraînement le mardi 3 novembre 2026." : infos.estPreparation ? "Préparez votre sac : premier entraînement demain." : "Repos actif : balade de 45 minutes ou plus.";
    return `
      <section class="carte carte-coloree theme-repos">
        <span class="puce-theme">🌳 Pas de musculation aujourd'hui</span>
        <p>${message}</p>
      </section>
      <h2>Toutes les séances</h2>
      ${toutesLesSeances(infos)}`;
  }

  const suivi = await lireSuivi(contenu.cleDate);
  const prog = progression(contenu, suivi);
  const p = donnees.programme;
  const cartes = blocsExercices.map((bloc) => {
    const s = p.seances[bloc.seance];
    return `
      <section class="carte carte-coloree theme-${themeSeance(bloc.seance)}">
        <div class="carte-titre">
          <span class="puce-theme">${s.emoji} ${echapper(s.sousTitre)}</span>
          <span class="sous-texte" style="font-weight:700">${echapper(bloc.heure)}</span>
        </div>
        <h2>${echapper(s.nom)}</h2>
        <p class="sous-texte petit">${echapper(infos.phase.nom)} · ${echapper(infos.phase.resume)}${bloc.lignes.length ? `<br>${echapper(bloc.lignes[0])}` : ""}</p>
        ${grilleExercices(bloc)}
        <p class="sous-texte petit">Touchez un exercice pour voir sa fiche en grand.</p>
      </section>`;
  }).join("");

  const autres = contenu.blocs.filter((b) => !b.exercices).map((b) =>
    `<li><span class="heure">${echapper(b.heure || "")}</span><span>${b.emoji || ""} ${echapper(b.nom)}${b.court ? `<br><span class="detail">${echapper(b.court)}</span>` : ""}</span></li>`).join("");

  return `
    <section class="bandeau">
      <span class="date">${dateLongue(date)} · semaine ${infos.semaineCycle}</span>
      <h1>${contenu.emoji} ${echapper(contenu.titre)}</h1>
      <p class="petit" style="color:#E5E7EB">${prog.faits} sur ${prog.total} étapes cochées${prog.faite ? " · séance faite ✅" : ""}</p>
      <button class="bouton bouton-large" data-aller="jour/${contenu.cleDate}">Cocher ma séance pas à pas</button>
    </section>
    ${cartes}
    <section class="carte">
      <h3>Le reste de la matinée</h3>
      <ul class="planning">${autres}</ul>
    </section>
    <section class="carte">
      <h3>⭐ Les règles d'or</h3>
      <ul class="liste-simple petit">${p.reglesOr.map((r) => `<li>${echapper(r)}</li>`).join("")}</ul>
      <p class="avertissement">${echapper(p.explications.seriesRepetitions)}<br>${echapper(p.explications.sousLePied)}</p>
    </section>`;
}

function toutesLesSeances(infos) {
  const p = donnees.programme;
  const phase = infos.phase || adapterPhase(p.phases[0]);
  return ["A", "B", "C", "G"].map((id) => {
    const s = p.seances[id];
    const bloc = { seance: id, exercices: exercicesSeance(id).exercices.map((ex) => ({ id: ex, nom: p.exercices[ex].nom, dose: doseDetaillee(ex, id, phase) })) };
    return `
      <section class="carte carte-coloree theme-${themeSeance(id)}">
        <span class="puce-theme">${s.emoji} ${echapper(s.sousTitre)}</span>
        <h2>${echapper(s.nom)}</h2>
        ${grilleExercices(bloc)}
      </section>`;
  }).join("");
}

export function activer(conteneur, { afficher }) {
  const infos = infosDuJour(aujourdhui());
  const phase = infos.phase || adapterPhase(donnees.programme.phases[0]);
  animerTout(conteneur);
  brancherFiches(conteneur, (id, seance) => doseDetaillee(id, seance, phase));
  conteneur.querySelectorAll("[data-aller]").forEach((b) => b.addEventListener("click", () => afficher(b.dataset.aller)));
}
