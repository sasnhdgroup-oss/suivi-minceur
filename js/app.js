// Point d'entrée : charge les données et gère la navigation entre les onglets.
import { chargerDonnees } from "./donnees.js";
import { demanderStockagePersistant } from "./stockage.js";
import { chargerProfil } from "./profil.js";
import * as aujourdhui from "./ecrans/aujourdhui.js";
import * as seance from "./ecrans/seance.js";
import * as repas from "./ecrans/repas.js";
import * as corps from "./ecrans/corps.js";
import * as calendrier from "./ecrans/calendrier.js";
import * as reglages from "./ecrans/reglages.js";
import * as jour from "./ecrans/jour.js";
import * as guidee from "./ecrans/guidee.js";

const ECRANS = { aujourdhui, seance, repas, corps, calendrier, reglages, jour, guidee };
let ecranActuel = null;
// Onglet à mettre en valeur pour les écrans qui n'ont pas leur propre onglet
const ONGLET_PARENT = { jour: "calendrier", reglages: null, guidee: "seance" };
const conteneur = document.getElementById("ecran");
const titre = document.getElementById("entete-titre");

async function afficher(adresse) {
  const [nom, parametre] = String(adresse || "").split("/");
  const ecran = ECRANS[nom] || ECRANS.aujourdhui;
  const nomEcran = ECRANS[nom] ? nom : "aujourdhui";
  if (ecranActuel && ecranActuel !== ecran && ecranActuel.quitter) ecranActuel.quitter();
  ecranActuel = ecran;
  const onglet = nomEcran in ONGLET_PARENT ? ONGLET_PARENT[nomEcran] : nomEcran;
  document.querySelectorAll(".onglet").forEach((b) => {
    if (b.dataset.ecran === onglet) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  titre.textContent = ecran.titreDynamique ? ecran.titreDynamique(parametre) : ecran.titre;
  try {
    conteneur.innerHTML = await ecran.rendu(parametre);
    window.scrollTo(0, 0);
    if (ecran.activer) ecran.activer(conteneur, { afficher: aller });
  } catch (erreur) {
    console.error(erreur);
    conteneur.innerHTML = `<div class="carte"><h2>Oups</h2><p>Un problème est survenu : ${String(erreur.message || erreur)}</p></div>`;
  }
}

function aller(adresse) {
  if (location.hash !== `#${adresse}`) location.hash = adresse;
  else afficher(adresse);
}

async function demarrer() {
  try {
    await chargerDonnees();
    await chargerProfil();
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
