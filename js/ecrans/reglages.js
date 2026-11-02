// Réglages : profil (gardé uniquement dans le téléphone).
// Étape 1 : profil. Sauvegarde, import et recalcul des calories arrivent aux étapes 5 et 7.
import { donnees } from "../donnees.js";
import { lire, ecrire } from "../stockage.js";
import { echapper, nombre } from "../outils.js";

export const titre = "Réglages";

export async function rendu() {
  const profil = (await lire("profil")) || {};
  const o = donnees.programme.objectifs;
  const v = (cle) => (profil[cle] !== undefined ? echapper(profil[cle]) : "");
  return `
    <section class="carte">
      <h2>Mon profil</h2>
      <p class="sous-texte petit">Ces informations restent uniquement dans votre téléphone. Elles ne sont jamais envoyées sur internet.</p>
      <form id="formulaire-profil" class="grille-2" autocomplete="off">
        <div class="champ"><label for="age">Âge</label><input id="age" name="age" type="number" inputmode="numeric" min="16" max="99" value="${v("age")}" placeholder="ans"></div>
        <div class="champ"><label for="taille">Taille (cm)</label><input id="taille" name="taille" type="number" inputmode="numeric" min="120" max="220" value="${v("taille")}" placeholder="cm"></div>
        <div class="champ"><label for="poidsDepart">Poids de départ (kg)</label><input id="poidsDepart" name="poidsDepart" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${v("poidsDepart")}" placeholder="kg"></div>
        <div class="champ"><label for="poidsObjectif">Objectif (kg)</label><input id="poidsObjectif" name="poidsObjectif" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${v("poidsObjectif")}" placeholder="kg"></div>
        <button class="bouton bouton-large" type="submit" style="grid-column:1/-1">Enregistrer</button>
        <p id="message-profil" class="message-ok" role="status" style="grid-column:1/-1"></p>
      </form>
    </section>

    <section class="carte">
      <h3>Mes objectifs du programme</h3>
      <ul class="liste-simple petit">
        <li>🔥 ${nombre(o.caloriesSemaine)} calories par jour du lundi au vendredi, ${nombre(o.caloriesWeekEnd)} le week-end</li>
        <li>🥩 ${o.proteinesGrammes} g de protéines par jour</li>
        <li>💧 ${o.eauMillilitres / 1000} litres d'eau par jour, ${nombre(o.eauMillilitresJourSport / 1000)} litres les jours de sport</li>
        <li>🛡️ Jamais moins de ${nombre(o.plancherCalories)} calories par jour</li>
      </ul>
      <p class="sous-texte petit">À chaque palier de ${o.paliersRecalculKg} kg perdus, l'application proposera une nouvelle cible de calories (étape 5).</p>
    </section>

    <section class="carte">
      <h3>Affichage</h3>
      <p class="petit">Le mode sombre suit automatiquement le réglage du téléphone. Les animations se coupent si « Réduire les animations » est activé dans les réglages d'accessibilité.</p>
    </section>

    <p class="avertissement">Cette application n'est pas un outil médical. En cas de douleur, arrêtez l'exercice et consultez un médecin.</p>

    <section class="bientot">
      <span class="gros-emoji" aria-hidden="true">💾</span>
      <strong>Bientôt ici</strong>
      <span class="petit">« Exporter mes données » et « Importer une sauvegarde » arrivent à l'étape 7.</span>
    </section>`;
}

export function activer(conteneur) {
  const form = conteneur.querySelector("#formulaire-profil");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const ancien = (await lire("profil")) || {};
    const valeurs = Object.fromEntries(new FormData(form).entries());
    const profil = { ...ancien };
    for (const [cle, valeur] of Object.entries(valeurs)) {
      if (valeur === "") delete profil[cle];
      else profil[cle] = Number(String(valeur).replace(",", "."));
    }
    profil.misAJourLe = new Date().toISOString();
    await ecrire("profil", profil);
    const msg = conteneur.querySelector("#message-profil");
    msg.textContent = "✅ Profil enregistré";
    setTimeout(() => { msg.textContent = ""; }, 2500);
  });
}
