// Point d'entrée : charge les données et gère la navigation entre les onglets.
import { chargerDonnees } from "./donnees.js";
import { demanderStockagePersistant } from "./stockage.js";
import * as aujourdhui from "./ecrans/aujourdhui.js";
import * as seance from "./ecrans/seance.js";
import * as repas from "./ecrans/repas.js";
import * as corps from "./ecrans/corps.js";
import * as calendrier from "./ecrans/calendrier.js";
import * as reglages from "./ecrans/reglages.js";

const ECRANS = { aujourdhui, seance, repas, corps, calendrier, reglages };
const conteneur = document.getElementById("ecran");
const titre = document.getElementById("entete-titre");

async function afficher(nom) {
  const ecran = ECRANS[nom] || ECRANS.aujourdhui;
  document.querySelectorAll(".onglet").forEach((b) => {
    if (b.dataset.ecran === nom) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  titre.textContent = ecran.titre;
  try {
    conteneur.innerHTML = await ecran.rendu();
    if (ecran.activer) ecran.activer(conteneur, { afficher: aller });
  } catch (erreur) {
    console.error(erreur);
    conteneur.innerHTML = `<div class="carte"><h2>Oups</h2><p>Un problème est survenu : ${String(erreur.message || erreur)}</p></div>`;
  }
  window.scrollTo(0, 0);
}

function aller(nom) {
  if (location.hash !== `#${nom}`) location.hash = nom;
  else afficher(nom);
}

async function demarrer() {
  try {
    await chargerDonnees();
  } catch (erreur) {
    conteneur.innerHTML = `<div class="carte"><h2>Impossible de charger le programme</h2><p class="sous-texte">${String(erreur.message || erreur)}</p></div>`;
    return;
  }
  document.querySelectorAll(".onglet").forEach((b) => b.addEventListener("click", () => aller(b.dataset.ecran)));
  document.getElementById("bouton-reglages").addEventListener("click", () => aller("reglages"));
  window.addEventListener("hashchange", () => afficher(location.hash.slice(1)));
  afficher(location.hash.slice(1) || "aujourdhui");
  demanderStockagePersistant();
}

demarrer();
