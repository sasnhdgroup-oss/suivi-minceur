// Réglages : profil, objectifs et plan personnalisé (gardés uniquement dans le téléphone).
import { donnees } from "../donnees.js";
import { echapper, nombre } from "../outils.js";
import { dateCourte } from "../dates.js";
import { profil, enregistrerProfil, calculerPlan, planActif, validerPlan, resumeAdaptations, objectifDe, niveauDe, rythmeDe, genesDe, profilComplet } from "../profil.js";

export const titre = "Mon profil";
let message = "";

const choixRadio = (nom, valeur, actuel, titre, texte, emoji = "") => `
  <label class="choix ${valeur === actuel ? "choisi" : ""}">
    <input type="radio" name="${nom}" value="${valeur}" ${valeur === actuel ? "checked" : ""}>
    <span class="choix-titre">${emoji ? `${emoji} ` : ""}${echapper(titre)}</span>
    ${texte ? `<span class="choix-texte">${echapper(texte)}</span>` : ""}
  </label>`;

function cartePlan() {
  const p = profil();
  if (!profilComplet(p)) {
    return `<section class="carte"><h2>🎯 Mon plan personnalisé</h2><p class="sous-texte">Renseignez au moins l'âge, la taille et le poids pour calculer votre plan.</p></section>`;
  }
  const plan = calculerPlan(p);
  const actif = planActif();
  const identique = actif.valide && actif.caloriesSemaine === plan.caloriesSemaine && actif.proteines === plan.proteines && actif.eau === plan.eau && actif.objectif === plan.objectif;
  const o = donnees.programme.objectifs;
  const lignes = [
    ["🔥 Calories du lundi au vendredi", `${nombre(plan.caloriesSemaine)}`, actif.caloriesSemaine],
    ["🍽️ Calories le week-end", `${nombre(plan.caloriesWeekEnd)}`, actif.caloriesWeekEnd],
    ["🥩 Protéines par jour", `${plan.proteines} g`, `${actif.proteines} g`],
    ["💧 Eau par jour", `${nombre(plan.eau / 1000)} L (${nombre(plan.eauSport / 1000)} L les jours de sport)`, `${nombre(actif.eau / 1000)} L`],
  ];
  return `
    <section class="carte carte-plan">
      <h2>🎯 Mon plan personnalisé</h2>
      <table class="tableau-plan">
        <tbody>${lignes.map(([l, v]) => `<tr><th scope="row">${l}</th><td>${v}</td></tr>`).join("")}</tbody>
      </table>
      ${plan.dateArrivee ? `<p class="petit">📅 Objectif de ${echapper(p.poidsObjectif)} kg atteint vers le <strong>${dateCourte(plan.dateArrivee)} ${plan.dateArrivee.getFullYear()}</strong> (environ ${nombre(Math.round(plan.perteParSemaine * 10) / 10)} kg par semaine, ${plan.semainesEstimees} semaines).</p>` : ""}
      ${plan.objectif !== "perte" && p.poidsObjectif && Number(p.poidsObjectif) < Number(p.poidsActuel || p.poidsDepart) - 2 ? `<p class="avertissement">⚠️ Votre poids visé est plus bas que votre poids actuel, mais l'objectif choisi n'est pas « Perdre du poids » : avec ce choix, les calories ne permettent pas de perdre du poids. Choisissez « Perdre du poids » si c'est votre priorité.</p>` : ""}
      ${plan.plancherAtteint ? `<p class="avertissement">🛡️ Le calcul donnait moins de ${nombre(o.plancherCalories)} calories : l'application garde le plancher de ${nombre(o.plancherCalories)} calories par jour.</p>` : ""}
      <details class="calcul">
        <summary>Comment c'est calculé ?</summary>
        <ul class="liste-simple petit">
          <li>Dépense au repos : ${nombre(plan.metabolisme)} calories (formule de Mifflin-St Jeor)</li>
          <li>Avec l'activité du programme (× ${String(o.coefficientActivite).replace(".", ",")}) : ${nombre(plan.besoin)} calories</li>
          <li>${plan.deficit >= 0 ? `Déficit choisi : − ${nombre(plan.deficit)} calories` : `Léger surplus : + ${nombre(-plan.deficit)} calories`}</li>
          <li>Protéines : ${nombre(donnees.personnalisation.objectifs[plan.objectif].proteinesParKg)} g par kg ${donnees.personnalisation.objectifs[plan.objectif].proteinesSur === "poidsVise" ? "de poids visé" : "de poids actuel"}</li>
        </ul>
        <p class="sous-texte petit">${echapper(donnees.personnalisation.sources.metabolisme)} ${echapper(donnees.personnalisation.sources.proteines)}</p>
      </details>
      ${identique
        ? `<p class="message-ok">✅ Plan en vigueur depuis le ${dateCourte(new Date(actif.valideLe))}</p>`
        : `<p class="petit">${actif.valide ? "Votre plan actuel est différent : validez pour appliquer ces nouvelles valeurs." : `En attendant votre validation, l'application garde les valeurs du programme (${nombre(o.caloriesSemaine)} calories, ${o.proteinesGrammes} g de protéines).`}</p>
           <button class="bouton bouton-large" id="valider-plan">Valider ce plan</button>`}
    </section>
    <section class="carte">
      <h3>🏋️‍♀️ Mes séances adaptées</h3>
      <ul class="liste-simple petit">${resumeAdaptations().map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>
      <p class="sous-texte petit">Les séances du calendrier, de l'onglet Séance et du détail de chaque jour suivent ces réglages.</p>
    </section>`;
}

export async function rendu() {
  const p = profil();
  const r = donnees.personnalisation;
  const v = (cle) => (p[cle] !== undefined && p[cle] !== null ? echapper(p[cle]) : "");
  const objectif = objectifDe(p), niveau = niveauDe(p), rythme = rythmeDe(p), genes = genesDe(p);
  const texte = message; message = "";
  return `
    ${texte ? `<p class="message-ok bandeau-message" role="status">${texte}</p>` : ""}
    <form id="formulaire-profil" class="carte" autocomplete="off">
      <h2>👤 Moi</h2>
      <p class="sous-texte petit">Ces informations restent uniquement dans votre téléphone. Elles ne sont jamais envoyées sur internet.</p>
      <div class="champ"><label for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" maxlength="30" value="${v("prenom")}" placeholder="Facultatif"></div>
      <div class="grille-2">
        <div class="champ"><label for="age">Âge</label><input id="age" name="age" type="number" inputmode="numeric" min="16" max="99" value="${v("age")}" placeholder="ans"></div>
        <div class="champ"><label for="taille">Taille (cm)</label><input id="taille" name="taille" type="number" inputmode="numeric" min="120" max="220" value="${v("taille")}" placeholder="cm"></div>
        <div class="champ"><label for="poidsDepart">Poids de départ (kg)</label><input id="poidsDepart" name="poidsDepart" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${v("poidsDepart")}" placeholder="kg"></div>
        <div class="champ"><label for="poidsActuel">Poids actuel (kg)</label><input id="poidsActuel" name="poidsActuel" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${v("poidsActuel")}" placeholder="kg"></div>
        <div class="champ" style="grid-column:1/-1"><label for="poidsObjectif">Poids visé (kg)</label><input id="poidsObjectif" name="poidsObjectif" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${v("poidsObjectif")}" placeholder="kg"></div>
      </div>

      <h2>🎯 Mon objectif principal</h2>
      <div class="choix-liste">${Object.entries(r.objectifs).map(([id, o]) => choixRadio("objectif", id, objectif, o.nom, o.description, o.emoji)).join("")}</div>

      <div id="bloc-rythme" ${objectif === "perte" ? "" : "hidden"}>
        <h3>⏱️ Rythme de perte</h3>
        <div class="choix-liste choix-ligne">${Object.entries(r.rythmes).map(([id, o]) => choixRadio("rythme", id, rythme, o.nom, o.texte)).join("")}</div>
      </div>

      <h2>📶 Mon niveau</h2>
      <div class="choix-liste">${Object.entries(r.niveaux).map(([id, o]) => choixRadio("niveau", id, niveau, o.nom, o.description)).join("")}</div>

      <h2>🩹 Gênes ou douleurs</h2>
      <p class="sous-texte petit">Cochez les zones fragiles : les exercices concernés sont remplacés.</p>
      <div class="choix-liste choix-ligne">${Object.entries(r.genes).map(([id, g]) => `
        <label class="choix ${genes.includes(id) ? "choisi" : ""}">
          <input type="checkbox" name="genes" value="${id}" ${genes.includes(id) ? "checked" : ""}>
          <span class="choix-titre">${g.emoji} ${echapper(g.nom)}</span>
        </label>`).join("")}</div>
      <p class="avertissement">🩺 En cas de douleur, de grossesse ou de problème de santé, demandez l'avis de votre médecin avant de suivre le programme.</p>

      <button class="bouton bouton-large" type="submit">Enregistrer mon profil</button>
    </form>

    ${cartePlan()}

    <section class="carte">
      <h3>Affichage</h3>
      <p class="petit">Le mode sombre suit automatiquement le réglage du téléphone. Les animations se coupent si « Réduire les animations » est activé dans les réglages d'accessibilité.</p>
    </section>

    <p class="avertissement">Cette application n'est pas un outil médical. En cas de douleur, arrêtez l'exercice et consultez un médecin.</p>`;
}

export function activer(conteneur, { afficher }) {
  const form = conteneur.querySelector("#formulaire-profil");
  // Mise en valeur des choix et affichage du rythme seulement pour la perte de poids
  form.addEventListener("change", () => {
    form.querySelectorAll(".choix").forEach((l) => l.classList.toggle("choisi", l.querySelector("input").checked));
    const obj = form.querySelector("input[name=objectif]:checked");
    conteneur.querySelector("#bloc-rythme").hidden = !(obj && obj.value === "perte");
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const donneesForm = new FormData(form);
    const nouveau = { ...profil() };
    for (const cle of ["age", "taille", "poidsDepart", "poidsActuel", "poidsObjectif"]) {
      const valeur = String(donneesForm.get(cle) || "").replace(",", ".");
      if (valeur === "") delete nouveau[cle]; else nouveau[cle] = Number(valeur);
    }
    const prenom = String(donneesForm.get("prenom") || "").trim();
    if (prenom) nouveau.prenom = prenom; else delete nouveau.prenom;
    nouveau.objectif = donneesForm.get("objectif") || "perte";
    nouveau.rythme = donneesForm.get("rythme") || "normal";
    nouveau.niveau = donneesForm.get("niveau") || "debutante";
    nouveau.genes = donneesForm.getAll("genes");
    if (!nouveau.poidsActuel && nouveau.poidsDepart) nouveau.poidsActuel = nouveau.poidsDepart;
    await enregistrerProfil(nouveau);
    message = "✅ Profil enregistré. Vérifiez votre plan ci-dessous puis validez-le.";
    afficher("reglages");
  });
  const bouton = conteneur.querySelector("#valider-plan");
  if (bouton) bouton.addEventListener("click", async () => {
    await validerPlan(calculerPlan());
    message = "✅ Plan validé : l'application suit maintenant vos objectifs.";
    afficher("reglages");
  });
}
