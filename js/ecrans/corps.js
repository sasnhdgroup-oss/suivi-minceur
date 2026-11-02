// Onglet « Mon corps » : objectif personnel, pesée rapide et progression.
// Les graphiques détaillés arrivent à l'étape 5.
import { echapper, nombre } from "../outils.js";
import { dateCourte, texteDate, aujourdhui } from "../dates.js";
import { lire, ecrire } from "../stockage.js";
import { profil, enregistrerProfil, calculerPlan, poidsActuel, profilComplet, palierAtteint } from "../profil.js";

export const titre = "Mon corps";
let message = "";

export async function rendu() {
  const p = profil();
  const pesees = (await lire("pesees")) || [];
  const texte = message; message = "";
  if (!profilComplet(p)) {
    return `<section class="carte"><h3>Mon objectif</h3><p class="sous-texte">Renseignez votre profil (icône en haut à droite) pour afficher votre objectif.</p><button class="bouton bouton-large" data-aller="reglages">Remplir mon profil</button></section>`;
  }
  const depart = Number(p.poidsDepart || poidsActuel(p));
  const actuel = Number(poidsActuel(p));
  const vise = Number(p.poidsObjectif || actuel);
  const perdu = Math.round((depart - actuel) * 10) / 10;
  const total = depart - vise;
  const pourcentage = total > 0 ? Math.min(100, Math.max(0, Math.round(((depart - actuel) / total) * 100))) : 0;
  const plan = calculerPlan(p);
  const dernieres = pesees.slice(-5).reverse();

  return `
    ${texte ? `<p class="message-ok bandeau-message" role="status">${texte}</p>` : ""}
    <section class="bandeau">
      <span class="date">Mon objectif</span>
      <h1>${nombre(depart)} kg → ${nombre(vise)} kg</h1>
      <div class="jauge" aria-label="Progression vers l'objectif : ${pourcentage} %"><span style="width:${pourcentage}%"></span></div>
      <p class="petit" style="color:#E5E7EB">Aujourd'hui : ${nombre(actuel)} kg · ${perdu > 0 ? `déjà ${nombre(perdu)} kg perdus` : perdu < 0 ? `${nombre(-perdu)} kg de plus qu'au départ` : "c'est le début"} · ${pourcentage} % du chemin</p>
      ${plan && plan.dateArrivee ? `<p class="petit" style="color:#E5E7EB">📅 Arrivée estimée vers le ${dateCourte(plan.dateArrivee)} ${plan.dateArrivee.getFullYear()}</p>` : ""}
    </section>

    ${palierAtteint() ? `<section class="carte carte-coloree theme-repos"><span class="puce-theme">🎉 Nouveau palier</span><p>5 kg de moins depuis votre dernier plan : vos calories sont à recalculer.</p><button class="bouton bouton-large" data-aller="reglages">Voir mon nouveau plan</button></section>` : ""}

    <form class="carte" id="formulaire-pesee">
      <h3>⚖️ Me peser</h3>
      <p class="sous-texte petit">Pesée conseillée le lundi matin, à jeun.</p>
      <div class="champ"><label for="poids">Poids du jour (kg)</label><input id="poids" name="poids" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="${nombre(actuel)}" required></div>
      <button class="bouton bouton-large" type="submit">Enregistrer</button>
      ${dernieres.length ? `<ul class="liste-simple petit">${dernieres.map((x) => `<li>${echapper(x.date.split("-").reverse().join("/"))} : ${nombre(x.poids)} kg</li>`).join("")}</ul>` : ""}
      <p class="sous-texte petit">Une hausse d'un jour est souvent de l'eau : regardez la tendance sur plusieurs semaines.</p>
    </form>

    <section class="bientot">
      <span class="gros-emoji" aria-hidden="true">📈</span>
      <strong>Bientôt ici</strong>
      <span class="petit">Mensurations, courbe du poids avec la moyenne sur 7 jours et historique des charges arrivent à l'étape 5.</span>
    </section>`;
}

export function activer(conteneur, { afficher }) {
  conteneur.querySelectorAll("[data-aller]").forEach((b) => b.addEventListener("click", () => afficher(b.dataset.aller)));
  const form = conteneur.querySelector("#formulaire-pesee");
  if (!form) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const poids = Number(String(new FormData(form).get("poids")).replace(",", "."));
    if (!poids) return;
    const date = texteDate(aujourdhui());
    const pesees = ((await lire("pesees")) || []).filter((x) => x.date !== date);
    pesees.push({ date, poids });
    pesees.sort((a, b) => a.date.localeCompare(b.date));
    await ecrire("pesees", pesees);
    await enregistrerProfil({ ...profil(), poidsActuel: poids });
    message = "✅ Pesée enregistrée";
    afficher("corps");
  });
}
