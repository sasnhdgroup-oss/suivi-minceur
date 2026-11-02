// Séance guidée : déroulé étape par étape, saisie des charges, minuteurs de repos et de marche en pente.
import { donnees } from "../donnees.js";
import { dateDepuisTexte, dateLongue, texteDate, aujourdhui } from "../dates.js";
import { contenuDuJour } from "../journee.js";
import { echapper, nombre } from "../outils.js";
import { ouvrirFiche, themeSeance } from "../composants.js";
import { animerTout } from "../animations.js";
import { lire, ecrire } from "../stockage.js";
import { cocher, toutCocher } from "../suivi.js";
import { derniereFois, enregistrerCharges, cible } from "../charges.js";
import { debloquerSon, son, vibrer, garderEcranAllume, libererEcran, ecranMaintenu, confettis, formatChrono } from "../minuteurs.js";

export const titre = "Séance guidée";
export function titreDynamique() { return "Séance guidée"; }

let dateTexte = null;
let contenu = null;
let etapes = [];
let session = null;
let derniere = null;          // dernière séance de l'exercice affiché
let minuteur = null;          // marche en pente, chrono ou maintien en cours
let repos = null;             // minuteur de repos en cours
let horloge = null;
let rafraichir = () => {};

const cleSession = () => `seance-${dateTexte}`;
const sauver = () => ecrire(cleSession(), session);

// ---------- Construction des étapes ----------
function construireEtapes() {
  const liste = [];
  const phase = contenu.infos.phase;
  for (const b of contenu.blocs) {
    if (b.type === "douche") continue;
    if (b.type === "musculation") {
      b.exercices.forEach((ex) => liste.push({ type: "muscu", bloc: b, ex, cle: `${b.id}:${ex.id}` }));
    } else if (b.type === "gainage") {
      const tours = phase.gainage.tours;
      for (let t = 0; t < tours; t++) b.exercices.forEach((ex, i) => liste.push({ type: "gainage", bloc: b, ex, tour: t, tours, dernierDuTour: i === b.exercices.length - 1, cle: `${b.id}:${ex.id}` }));
    } else if (b.type === "intervalles") {
      liste.push({ type: "intervalles", bloc: b });
    } else if (b.type === "pente_continue") {
      liste.push({ type: "chrono", bloc: b, minutes: phase.penteContinue.minutes, details: [`Pente ${phase.penteContinue.pente} %`, `${nombre(donnees.programme.vitesses.recuperation)} à ${nombre(donnees.programme.vitesses.effort)} km/h`] });
    } else if (b.type === "echauffement") {
      liste.push({ type: "chrono", bloc: b, minutes: 10, details: ["Vélo ou tapis, allure facile", "Montez doucement en rythme"] });
    } else if (b.type === "etirements") {
      liste.push({ type: "chrono", bloc: b, minutes: 10, details: ["Cuisses avant et arrière : 30 s par côté", "Fessiers : 30 s par côté", "Dos : 30 s", "Épaules et bras : 30 s par côté"] });
    } else {
      liste.push({ type: "case", bloc: b });
    }
  }
  liste.push({ type: "fin" });
  return liste;
}

async function chargerSession() {
  session = (await lire(cleSession())) || { debut: null, index: 0, series: {}, tours: {}, blocs: {}, finLe: null };
  session.index = Math.min(session.index || 0, etapes.length - 1);
}

// ---------- Rendu ----------
export async function rendu(param) {
  dateTexte = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : texteDate(aujourdhui());
  contenu = contenuDuJour(dateDepuisTexte(dateTexte));
  if (contenu.avantDebut || contenu.infos.estPreparation || !contenu.blocs.length) {
    return `<section class="bientot"><span class="gros-emoji">🌳</span><strong>Pas de séance ce jour-là</strong><span>${dateLongue(dateDepuisTexte(dateTexte))}</span></section>`;
  }
  etapes = construireEtapes();
  await chargerSession();
  if (!session.debut) {
    return `
      <section class="bandeau">
        <span class="date">${dateLongue(dateDepuisTexte(dateTexte))}</span>
        <h1>${contenu.emoji} ${echapper(contenu.titre)}</h1>
        <p class="petit" style="color:#E5E7EB">${etapes.length - 1} étapes · fin impérative à ${donnees.programme.finImperative}</p>
      </section>
      <section class="carte">
        <h3>Avant de commencer</h3>
        <ul class="liste-simple petit">
          <li>🔊 Montez le son : un bip annonce la fin du repos et les changements de rythme sur le tapis.</li>
          <li>📱 L'écran restera allumé pendant toute la séance.</li>
          <li>💧 Gourde remplie, serviette, et c'est parti !</li>
        </ul>
        <button class="bouton bouton-large bouton-geant" id="commencer">▶️ Commencer la séance</button>
      </section>
      <section class="carte">
        <h3>Au programme</h3>
        <ul class="planning">${contenu.blocs.map((b) => `<li><span class="heure">${echapper(b.heure || "")}</span><span>${b.emoji || ""} ${echapper(b.nom)}${b.court ? `<br><span class="detail">${echapper(b.court)}</span>` : ""}</span></li>`).join("")}</ul>
      </section>`;
  }
  return renduEtape();
}

async function renduEtape() {
  const etape = etapes[session.index];
  const total = etapes.length - 1;
  if (etape.type === "fin") return renduFin();
  const theme = etape.bloc.seance ? themeSeance(etape.bloc.seance) : contenu.theme;
  const entete = `
    <div class="guidee-entete theme-${theme}">
      <div class="jauge jauge-claire"><span style="width:${Math.round((session.index / total) * 100)}%"></span></div>
      <div class="guidee-ligne">
        <span><strong>Étape ${session.index + 1}</strong> sur ${total}</span>
        <span class="accent-theme"><strong>${echapper(etape.bloc.heure || "")}</strong> · ${echapper(etape.bloc.nom.replace(/ \(.*\)$/, ""))}</span>
      </div>
      <span class="pastille pastille-claire petit" id="etat-ecran">${ecranMaintenu() ? "📱 Écran maintenu allumé" : "📱 Pensez à garder l'écran allumé"}</span>
    </div>`;
  let corps = "";
  if (etape.type === "muscu") corps = await renduMuscu(etape);
  else if (etape.type === "gainage") corps = renduGainage(etape);
  else if (etape.type === "intervalles") corps = renduIntervalles(etape);
  else if (etape.type === "chrono") corps = renduChrono(etape);
  else corps = renduCase(etape);
  return `
    ${entete}
    <section class="carte carte-coloree theme-${theme}">${corps}</section>
    <div class="navigation-jours">
      <button class="bouton bouton-secondaire" data-action="precedent" ${session.index === 0 ? "disabled" : ""}>‹ Précédent</button>
      <button class="bouton bouton-secondaire" data-action="quitter">⏸️ Pause</button>
      <button class="bouton bouton-secondaire" data-action="suivant">Passer ›</button>
    </div>`;
}

// Stepper : [−] valeur [+]
const stepper = (id, valeur, unite, pas) => `
  <div class="stepper" data-stepper="${id}" data-pas="${pas}">
    <button type="button" class="stepper-bouton" data-delta="-1" aria-label="Moins ${pas} ${unite}">−</button>
    <label class="stepper-valeur"><input type="number" inputmode="decimal" step="${pas}" min="0" value="${valeur}" id="${id}" aria-label="${unite}"><span>${unite}</span></label>
    <button type="button" class="stepper-bouton" data-delta="1" aria-label="Plus ${pas} ${unite}">+</button>
  </div>`;

function exerciceEntete(e, sousTitre) {
  const fiche = donnees.programme.exercices[e.id];
  return `
    <div class="guidee-exercice">
      <button class="guidee-anim" data-fiche="${e.id}" aria-label="Voir la fiche : ${echapper(e.nom)}"><svg class="animation" data-animation="${e.id}" aria-hidden="true"></svg></button>
      <h2>${echapper(e.nom)}</h2>
      <p class="sous-texte petit">💪 ${echapper(fiche.muscles)}</p>
      ${sousTitre}
      <button class="bouton bouton-secondaire" data-fiche="${e.id}">❓ Comment bien le faire ?</button>
    </div>`;
}

async function renduMuscu(etape) {
  const e = etape.ex;
  const fiche = donnees.programme.exercices[e.id];
  const c = cible(e.dose.principal);
  const nb = e.dose.series;
  derniere = await derniereFois(e.id, dateTexte);
  if (!session.series[etape.cle]) {
    session.series[etape.cle] = Array.from({ length: nb }, (_, i) => {
      const avant = derniere ? (derniere.series[i] || derniere.series[derniere.series.length - 1]) : null;
      return { kg: avant ? avant.kg : 0, reps: avant && c.unite === "rép." ? avant.reps : c.max, ok: false };
    });
    await sauver();
  }
  const series = session.series[etape.cle];
  const courante = series.findIndex((s) => !s.ok);
  const resume = derniere ? `<p class="petit">📒 Dernière fois (${derniere.date.split("-").reverse().slice(0, 2).join("/")}) : ${derniere.series.map((s) => `${fiche.avecCharge ? `${nombre(s.kg)} kg × ` : ""}${s.reps}`).join(" · ")}</p>${derniere.hausse ? `<p class="conseil-hausse">💡 Vous aviez tout réussi : essayez +1 à 2,5 kg aujourd'hui.</p>` : ""}` : `<p class="petit sous-texte">Première fois : choisissez une charge légère pour apprendre le geste.</p>`;
  const lignes = series.map((s, i) => {
    if (s.ok) return `<li class="serie-faite">✅ Série ${i + 1} : ${fiche.avecCharge ? `${nombre(s.kg)} kg × ` : ""}${s.reps} ${c.unite}</li>`;
    if (i !== courante) return `<li class="serie-attente">Série ${i + 1} : à faire</li>`;
    let saisie;
    if (fiche.mesure === "duree") {
      saisie = renduMaintien(c.max, `${c.max} s${c.precision ? ` ${c.precision}` : ""}`);
    } else {
      saisie = `
        <div class="saisie-serie">
          ${fiche.avecCharge ? `<div><span class="etiquette">Charge</span>${stepper("saisie-kg", s.kg, "kg", fiche.pasCharge || 1)}</div>` : ""}
          ${c.unite === "rép." ? `<div><span class="etiquette">Répétitions${c.precision ? ` (${c.precision})` : ""}</span>${stepper("saisie-reps", s.reps, "rép.", 1)}</div>` : `<div><span class="etiquette">Distance</span><p class="valeur-fixe">${c.max} ${c.unite}</p></div>`}
        </div>
        <button class="bouton bouton-large bouton-geant" data-action="valider-serie">✅ Valider la série ${i + 1}</button>`;
    }
    return `<li class="serie-courante"><strong>Série ${i + 1} sur ${nb}</strong>${saisie}</li>`;
  }).join("");
  return `
    ${exerciceEntete(e, `<p class="objectif-exercice"><strong>${nb} série${nb > 1 ? "s" : ""} × ${echapper(e.dose.principal)}</strong> · repos ${e.repos} s</p>`)}
    ${resume}
    <ol class="liste-series">${lignes}</ol>
    ${courante === -1 ? `<p class="message-ok">Exercice terminé ✅</p><button class="bouton bouton-large" data-action="suivant">Exercice suivant ›</button>` : ""}`;
}

function renduMaintien(secondes, texte) {
  const enCours = minuteur && minuteur.type === "maintien";
  return `
    <div class="maintien">
      <p class="chrono-geant" id="chrono-maintien">${enCours ? formatChrono((minuteur.fin - Date.now()) / 1000) : formatChrono(secondes)}</p>
      <p class="petit">Tenir ${echapper(texte)}</p>
      <button class="bouton bouton-large bouton-geant" data-action="maintien" data-secondes="${secondes}" ${enCours ? "disabled" : ""}>${enCours ? "Tenez bon…" : "▶️ Démarrer"}</button>
    </div>`;
}

function renduGainage(etape) {
  const e = etape.ex;
  const fiche = donnees.programme.exercices[e.id];
  const c = cible(e.dose.principal);
  const fait = (session.tours[etape.cle] || [])[etape.tour];
  const action = fait
    ? `<p class="message-ok">✅ Fait</p><button class="bouton bouton-large" data-action="suivant">Suivant ›</button>`
    : fiche.mesure === "duree"
      ? renduMaintien(c.max, e.dose.principal)
      : `<p class="chrono-geant">${c.max}</p><p class="petit">${echapper(e.dose.principal)}</p><button class="bouton bouton-large bouton-geant" data-action="gainage-fait">✅ C'est fait</button>`;
  return `
    ${exerciceEntete(e, `<p class="objectif-exercice"><strong>Tour ${etape.tour + 1} sur ${etape.tours}</strong> · ${echapper(e.dose.principal)}</p>`)}
    ${action}`;
}

function phasesIntervalles() {
  const i = contenu.infos.phase.intervalles;
  const phases = [];
  for (let n = 0; n < i.cycles; n++) {
    phases.push({ type: "effort", duree: i.effort.duree, pente: i.effort.pente, vitesse: i.effort.vitesse, cycle: n + 1 });
    phases.push({ type: "recuperation", duree: i.recuperation.duree, pente: i.recuperation.pente, vitesse: i.recuperation.vitesse, cycle: n + 1 });
  }
  return phases;
}

function renduIntervalles(etape) {
  const fait = session.blocs[etape.bloc.id];
  const phases = phasesIntervalles();
  const m = minuteur && minuteur.type === "intervalles" ? minuteur : null;
  const ph = m ? phases[m.i] : phases[0];
  const restant = m ? (m.enPause ? m.restant : (m.fin - Date.now()) / 1000) : ph.duree;
  const totalRestant = m ? restant + phases.slice(m.i + 1).reduce((a, p) => a + p.duree, 0) : phases.reduce((a, p) => a + p.duree, 0);
  if (fait && !m) {
    return `<h2>⛰️ Marche en pente par intervalles</h2><p class="message-ok">✅ Terminé, bravo !</p><button class="bouton bouton-large" data-action="suivant">Étape suivante ›</button>`;
  }
  return `
    <h2>⛰️ Marche en pente par intervalles</h2>
    <div class="intervalle intervalle-${ph.type}" id="intervalle">
      <p class="intervalle-phase" id="iv-phase">${ph.type === "effort" ? "EFFORT" : "RÉCUPÉRATION"}</p>
      <p class="chrono-geant" id="iv-temps">${formatChrono(restant)}</p>
      <svg class="pente" viewBox="0 0 200 70" aria-hidden="true"><line id="iv-pente" x1="10" y1="62" x2="190" y2="${62 - ph.pente * 3.5}" /></svg>
      <div class="intervalle-reglages">
        <span><small>Pente</small><strong id="iv-pente-texte">${ph.pente} %</strong></span>
        <span><small>Vitesse</small><strong id="iv-vitesse">${nombre(ph.vitesse)} km/h</strong></span>
        <span><small>Cycle</small><strong id="iv-cycle">${ph.cycle} / ${phases.length / 2}</strong></span>
      </div>
      <p class="petit">Reste au total : <strong id="iv-total">${formatChrono(totalRestant)}</strong></p>
    </div>
    ${!m ? `<p class="petit">Réglez le tapis sur ${phases[0].pente} % et ${nombre(phases[0].vitesse)} km/h, puis démarrez.</p><button class="bouton bouton-large bouton-geant" data-action="iv-demarrer">▶️ Démarrer</button>`
      : `<div class="grille-2"><button class="bouton bouton-secondaire" data-action="iv-pause">${m.enPause ? "▶️ Reprendre" : "⏸️ Pause"}</button><button class="bouton bouton-secondaire" data-action="iv-passer">⏭️ Phase suivante</button></div>
         <button class="bouton bouton-large" data-action="iv-terminer">✅ J'ai terminé</button>`}`;
}

function renduChrono(etape) {
  const fait = session.blocs[etape.bloc.id];
  const m = minuteur && minuteur.type === "chrono" ? minuteur : null;
  const restant = m ? (m.enPause ? m.restant : (m.fin - Date.now()) / 1000) : etape.minutes * 60;
  return `
    <h2>${etape.bloc.emoji} ${echapper(etape.bloc.nom)}</h2>
    <ul class="liste-simple petit">${etape.details.map((d) => `<li>${echapper(d)}</li>`).join("")}</ul>
    ${fait && !m ? `<p class="message-ok">✅ Fait</p><button class="bouton bouton-large" data-action="suivant">Étape suivante ›</button>` : `
    <p class="chrono-geant" id="chrono-temps">${formatChrono(restant)}</p>
    ${!m ? `<button class="bouton bouton-large bouton-geant" data-action="chrono-demarrer" data-minutes="${etape.minutes}">▶️ Démarrer ${etape.minutes} min</button>`
      : `<button class="bouton bouton-secondaire bouton-large" data-action="chrono-pause">${m.enPause ? "▶️ Reprendre" : "⏸️ Pause"}</button>`}
    <button class="bouton bouton-large ${m ? "" : "bouton-secondaire"}" data-action="bloc-fait">✅ C'est fait</button>`}`;
}

function renduCase(etape) {
  const fait = session.blocs[etape.bloc.id];
  return `
    <h2>${etape.bloc.emoji || "✅"} ${echapper(etape.bloc.nom)}</h2>
    ${etape.bloc.court ? `<p>${echapper(etape.bloc.court)}</p>` : ""}
    ${fait ? `<p class="message-ok">✅ Fait</p><button class="bouton bouton-large" data-action="suivant">Étape suivante ›</button>`
      : `<button class="bouton bouton-large bouton-geant" data-action="bloc-fait">✅ ${echapper(etape.bloc.type === "aquagym" ? "Aquagym faite" : "C'est fait")}</button>`}`;
}

function renduFin() {
  const duree = Math.round(((session.finLe || Date.now()) - session.debut) / 60000);
  const nbSeries = Object.values(session.series).flat().filter((s) => s.ok).length;
  const nbTours = Object.values(session.tours).flat().filter(Boolean).length;
  const hausses = Object.entries(session.hausses || {}).filter(([, v]) => v).map(([id]) => donnees.programme.exercices[id].nom);
  return `
    <section class="fin-seance">
      <div class="medaille" aria-hidden="true">🏅</div>
      <h1>Séance terminée, bravo !</h1>
      <div class="pastilles" style="justify-content:center">
        <span class="pastille pastille-claire">⏱️ ${Math.floor(duree / 60) ? `${Math.floor(duree / 60)} h ` : ""}${duree % 60} min</span>
        <span class="pastille pastille-claire">🏋️‍♀️ ${nbSeries} séries</span>
        ${nbTours ? `<span class="pastille pastille-claire">🧱 ${nbTours} exercices de gainage</span>` : ""}
      </div>
      <p class="message-ok">✅ « Séance faite » est cochée dans votre calendrier.</p>
      ${hausses.length ? `<div class="carte"><h3>📈 Prochaine fois : +1 à 2,5 kg</h3><ul class="liste-simple petit">${hausses.map((h) => `<li>${echapper(h)}</li>`).join("")}</ul></div>` : ""}
      <button class="bouton bouton-large" data-aller="jour/${dateTexte}">Voir le détail de ma journée</button>
      <button class="bouton bouton-secondaire bouton-large" data-aller="aujourdhui">Retour à l'accueil</button>
    </section>`;
}

// ---------- Minuteur de repos (par-dessus l'écran) ----------
function demarrerRepos(secondes, prochain, ensuite) {
  fermerRepos();
  const fond = document.createElement("div");
  fond.className = "repos";
  fond.setAttribute("role", "dialog");
  fond.setAttribute("aria-label", "Temps de repos");
  fond.innerHTML = `
    <p class="repos-titre">Repos</p>
    <div class="repos-cercle">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="repos-fond"/><circle cx="60" cy="60" r="52" class="repos-reste" id="repos-arc" pathLength="100"/></svg>
      <span class="repos-chiffres" id="repos-chiffres" aria-live="off">${formatChrono(secondes)}</span>
    </div>
    ${prochain ? `<p class="repos-prochain">Ensuite : ${echapper(prochain)}</p>` : ""}
    <div class="grille-2" style="width:100%;max-width:360px">
      <button class="bouton bouton-secondaire" id="repos-plus">+15 s</button>
      <button class="bouton" id="repos-passer">Passer ›</button>
    </div>`;
  document.body.appendChild(fond);
  repos = { fin: Date.now() + secondes * 1000, total: secondes, ensuite, fond, dernierTic: null };
  fond.querySelector("#repos-plus").addEventListener("click", () => { repos.fin += 15000; repos.total += 15; });
  fond.querySelector("#repos-passer").addEventListener("click", () => terminerRepos(false));
}

function terminerRepos(sonner) {
  if (!repos) return;
  const ensuite = repos.ensuite;
  if (sonner) { son("fin"); vibrer([300, 120, 300]); }
  fermerRepos();
  if (ensuite) ensuite();
}

function fermerRepos() {
  if (repos && repos.fond) repos.fond.remove();
  repos = null;
}

// ---------- Horloge commune ----------
function tic() {
  const maintenant = Date.now();
  if (repos) {
    const reste = (repos.fin - maintenant) / 1000;
    const chiffres = document.getElementById("repos-chiffres");
    if (chiffres) chiffres.textContent = formatChrono(reste);
    const arc = document.getElementById("repos-arc");
    if (arc) arc.style.strokeDashoffset = String(100 - Math.max(0, (reste / repos.total) * 100));
    repos.fond.classList.toggle("fin-proche", reste <= 3.2);
    const seconde = Math.ceil(reste);
    if (seconde <= 3 && seconde > 0 && repos.dernierTic !== seconde) { repos.dernierTic = seconde; son("tic"); }
    if (reste <= 0) terminerRepos(true);
  }
  if (!minuteur || minuteur.enPause) return;
  const reste = (minuteur.fin - maintenant) / 1000;
  if (minuteur.type === "maintien") {
    const el = document.getElementById("chrono-maintien");
    if (el) el.textContent = formatChrono(reste);
    const seconde = Math.ceil(reste);
    if (seconde <= 3 && seconde > 0 && minuteur.dernierTic !== seconde) { minuteur.dernierTic = seconde; son("tic"); }
    if (reste <= 0) { const fin = minuteur.ensuite; minuteur = null; son("fin"); vibrer(); fin(); }
  } else if (minuteur.type === "chrono") {
    const el = document.getElementById("chrono-temps");
    if (el) el.textContent = formatChrono(reste);
    if (reste <= 0) { minuteur = null; son("fin"); vibrer(); blocFait(); }
  } else if (minuteur.type === "intervalles") {
    const phases = phasesIntervalles();
    if (reste <= 0) {
      minuteur.i++;
      if (minuteur.i >= phases.length) {
        minuteur = null; son("bravo"); vibrer([300, 100, 300, 100, 300]); blocFait(false); return;
      }
      const ph = phases[minuteur.i];
      minuteur.fin = maintenant + ph.duree * 1000;
      son(ph.type); vibrer(ph.type === "effort" ? [400, 100, 400] : [250]);
      afficherIntervalle(ph, ph.duree, phases, minuteur.i);
      return;
    }
    afficherIntervalle(phases[minuteur.i], reste, phases, minuteur.i);
    const seconde = Math.ceil(reste);
    if (seconde <= 3 && seconde > 0 && minuteur.dernierTic !== `${minuteur.i}-${seconde}`) { minuteur.dernierTic = `${minuteur.i}-${seconde}`; son("tic"); }
  }
}

function afficherIntervalle(ph, reste, phases, i) {
  const bloc = document.getElementById("intervalle");
  if (!bloc) return;
  bloc.className = `intervalle intervalle-${ph.type}`;
  document.getElementById("iv-phase").textContent = ph.type === "effort" ? "EFFORT" : "RÉCUPÉRATION";
  document.getElementById("iv-temps").textContent = formatChrono(reste);
  document.getElementById("iv-pente-texte").textContent = `${ph.pente} %`;
  document.getElementById("iv-vitesse").textContent = `${nombre(ph.vitesse)} km/h`;
  document.getElementById("iv-cycle").textContent = `${ph.cycle} / ${phases.length / 2}`;
  document.getElementById("iv-pente").setAttribute("y2", String(62 - ph.pente * 3.5));
  document.getElementById("iv-total").textContent = formatChrono(reste + phases.slice(i + 1).reduce((a, p) => a + p.duree, 0));
}

// ---------- Actions ----------
async function allerA(index) {
  minuteur = null;
  fermerRepos();
  session.index = Math.max(0, Math.min(index, etapes.length - 1));
  if (etapes[session.index].type === "fin" && !session.finLe) {
    session.finLe = Date.now();
    await sauver();
    await toutCocher(dateTexte, true);
    rafraichir();
    son("bravo"); confettis();
    return;
  }
  await sauver();
  rafraichir();
}

async function blocFait(avancer = true) {
  const etape = etapes[session.index];
  session.blocs[etape.bloc.id] = true;
  await sauver();
  await cocher(dateTexte, etape.bloc.id, true);
  if (avancer) allerA(session.index + 1); else rafraichir();
}

function nomEtape(i) {
  const e = etapes[i];
  if (!e) return "";
  if (e.type === "fin") return "fin de la séance 🎉";
  if (e.ex) return e.type === "gainage" ? `${e.ex.nom} (tour ${e.tour + 1})` : e.ex.nom;
  return e.bloc.nom;
}

async function validerSerie(conteneur) {
  const etape = etapes[session.index];
  const fiche = donnees.programme.exercices[etape.ex.id];
  const series = session.series[etape.cle];
  const i = series.findIndex((s) => !s.ok);
  if (i < 0) return;
  const kg = conteneur.querySelector("#saisie-kg");
  const reps = conteneur.querySelector("#saisie-reps");
  if (kg) series[i].kg = Math.max(0, Number(String(kg.value).replace(",", ".")) || 0);
  if (reps) series[i].reps = Math.max(0, Math.round(Number(reps.value) || 0));
  series[i].ok = true;
  // Valeurs proposées pour la série suivante
  if (series[i + 1] && !series[i + 1].ok) { series[i + 1].kg = series[i].kg; }
  vibrer(40);
  const derniereSerie = i === series.length - 1;
  if (derniereSerie) {
    const c = cible(etape.ex.dose.principal);
    const hausse = fiche.avecCharge && c.unite === "rép." && series.every((s) => s.ok && s.reps >= c.max) && series.some((s) => s.kg > 0);
    session.hausses = { ...(session.hausses || {}), [etape.ex.id]: hausse };
    await enregistrerCharges(etape.ex.id, dateTexte, series.map((s) => ({ kg: s.kg, reps: s.reps })), hausse);
    await cocher(dateTexte, etape.cle, true);
    await sauver();
    rafraichir();
    if (session.index + 1 < etapes.length - 1) {
      demarrerRepos(etape.ex.repos, nomEtape(session.index + 1) + (hausse ? " · 📈 Prochaine fois : +1 à 2,5 kg" : ""), () => allerA(session.index + 1));
    } else allerA(session.index + 1);
  } else {
    await sauver();
    rafraichir();
    demarrerRepos(etape.ex.repos, `série ${i + 2} sur ${series.length}`, null);
  }
}

async function gainageFait() {
  const etape = etapes[session.index];
  const liste = session.tours[etape.cle] || Array(etape.tours).fill(false);
  liste[etape.tour] = true;
  session.tours[etape.cle] = liste;
  await sauver();
  if (liste.every(Boolean)) await cocher(dateTexte, etape.cle, true);
  vibrer(40);
  const suivant = session.index + 1;
  const dernier = suivant >= etapes.length - 1;
  if (dernier) { allerA(suivant); return; }
  const pause = etape.dernierDuTour ? 60 : 20;
  demarrerRepos(pause, nomEtape(suivant), () => allerA(suivant));
}

async function maintienTermine() {
  const etape = etapes[session.index];
  if (etape.type === "gainage") return gainageFait();
  // Exercice en durée dans une séance de musculation (planche sur le côté)
  return validerSerie(document.getElementById("ecran"));
}

export function activer(conteneur, { afficher }) {
  rafraichir = async () => {
    const etape = etapes[session.index];
    conteneur.innerHTML = session.debut ? await renduEtape() : await rendu(dateTexte);
    brancher(conteneur, afficher);
    if (etape && etape.type === "fin") window.scrollTo(0, 0);
  };
  brancher(conteneur, afficher);
  if (session && session.debut && !session.finLe) garderEcranAllume().then(() => { const e = document.getElementById("etat-ecran"); if (e) e.textContent = ecranMaintenu() ? "📱 Écran maintenu allumé" : "📱 Pensez à garder l'écran allumé"; });
  if (!horloge) horloge = setInterval(tic, 200);
}

function brancher(conteneur, afficher) {
  animerTout(conteneur);
  conteneur.querySelectorAll("[data-aller]").forEach((b) => b.addEventListener("click", () => afficher(b.dataset.aller)));
  conteneur.querySelectorAll("[data-fiche]").forEach((b) => b.addEventListener("click", () => {
    const e = etapes[session.index];
    ouvrirFiche(b.dataset.fiche, e && e.ex ? e.ex.dose : null);
  }));
  conteneur.querySelectorAll("[data-stepper]").forEach((s) => {
    const champ = s.querySelector("input");
    const pas = Number(s.dataset.pas) || 1;
    s.querySelectorAll("[data-delta]").forEach((b) => b.addEventListener("click", () => {
      const v = Number(String(champ.value).replace(",", ".")) || 0;
      champ.value = String(Math.max(0, Math.round((v + Number(b.dataset.delta) * pas) * 10) / 10));
      vibrer(10);
    }));
  });
  const commencer = conteneur.querySelector("#commencer");
  if (commencer) commencer.addEventListener("click", async () => {
    debloquerSon();
    session.debut = Date.now();
    session.index = 0;
    await sauver();
    await garderEcranAllume();
    rafraichir();
  });
  conteneur.querySelectorAll("[data-action]").forEach((b) => b.addEventListener("click", async () => {
    debloquerSon();
    const a = b.dataset.action;
    if (a === "suivant") allerA(session.index + 1);
    else if (a === "precedent") allerA(session.index - 1);
    else if (a === "quitter") { libererEcran(); afficher(`jour/${dateTexte}`); }
    else if (a === "valider-serie") validerSerie(conteneur);
    else if (a === "gainage-fait") gainageFait();
    else if (a === "bloc-fait") { minuteur = null; blocFait(); }
    else if (a === "maintien") {
      minuteur = { type: "maintien", fin: Date.now() + Number(b.dataset.secondes) * 1000, ensuite: maintienTermine };
      b.disabled = true; b.textContent = "Tenez bon…";
    } else if (a === "chrono-demarrer") {
      minuteur = { type: "chrono", fin: Date.now() + Number(b.dataset.minutes) * 60000 };
      rafraichir();
    } else if (a === "chrono-pause" && minuteur) {
      basculerPause(); rafraichir();
    } else if (a === "iv-demarrer") {
      const phases = phasesIntervalles();
      minuteur = { type: "intervalles", i: 0, fin: Date.now() + phases[0].duree * 1000 };
      son("effort"); vibrer([400, 100, 400]);
      rafraichir();
    } else if (a === "iv-pause" && minuteur) {
      basculerPause(); rafraichir();
    } else if (a === "iv-passer" && minuteur) {
      minuteur.fin = Date.now(); minuteur.enPause = false;
    } else if (a === "iv-terminer") {
      minuteur = null; blocFait();
    }
  }));
}

function basculerPause() {
  if (minuteur.enPause) { minuteur.fin = Date.now() + minuteur.restant * 1000; minuteur.enPause = false; }
  else { minuteur.restant = (minuteur.fin - Date.now()) / 1000; minuteur.enPause = true; }
}

export function quitter() {
  libererEcran();
  fermerRepos();
  minuteur = null;
  if (horloge) { clearInterval(horloge); horloge = null; }
}
