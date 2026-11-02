// Onglet « Calendrier » : vue de la semaine en cours.
// Étape 1 : la semaine. La vue par mois avec les coches arrive à l'étape 2.
import { donnees } from "../donnees.js";
import { aujourdhui, infosDuJour, dateCourte, texteDate } from "../dates.js";
import { echapper } from "../outils.js";

export const titre = "Calendrier";

export async function rendu() {
  const date = aujourdhui();
  const infos = infosDuJour(date);
  const debutSemaine = new Date(date);
  debutSemaine.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(debutSemaine); d.setDate(debutSemaine.getDate() + i); return d;
  });
  const lignes = jours.map((d) => {
    const inf = infosDuJour(d);
    const estAujourdhui = texteDate(d) === texteDate(date);
    const jour = donnees.programme.planning[inf.nomJour];
    const libelle = inf.avantDebut ? "Avant le programme" : inf.estPreparation ? "🗓️ Préparation" : `${jour.emoji} ${jour.titre}`;
    return `
      <div class="carte carte-coloree theme-${inf.avantDebut || inf.estPreparation ? "repos" : jour.theme}" style="padding:12px 14px;gap:4px;${estAujourdhui ? "outline:3px solid var(--accent);" : ""}">
        <strong>${echapper(inf.nomJour.charAt(0).toUpperCase() + inf.nomJour.slice(1))} ${dateCourte(d)}${estAujourdhui ? " · aujourd'hui" : ""}</strong>
        <span class="petit">${echapper(libelle)}</span>
      </div>`;
  }).join("");

  return `
    <section class="carte">
      <h2>${infos.avantDebut ? "Cette semaine" : `Semaine ${infos.semaineCycle} · ${echapper(infos.phase.nom)}`}</h2>
      <p class="sous-texte petit">Le programme a commencé le mardi 3 novembre 2026.</p>
    </section>
    ${lignes}
    <section class="bientot">
      <span class="gros-emoji" aria-hidden="true">🗓️</span>
      <strong>Bientôt ici</strong>
      <span class="petit">La vue par mois avec les couleurs des séances, les coches et le compteur de jours réussis arrive à l'étape 2.</span>
    </section>`;
}
