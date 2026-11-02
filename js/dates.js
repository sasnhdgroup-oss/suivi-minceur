// Calendrier du programme : numéro de semaine, phase, menu A ou B, jour de la semaine.
import { donnees } from "./donnees.js";

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const UN_JOUR = 24 * 60 * 60 * 1000;

// Date du jour. Pour tester une autre date : ajouter ?date=2026-11-03 à l'adresse.
export function aujourdhui() {
  const parametre = new URLSearchParams(location.search).get("date");
  if (parametre && /^\d{4}-\d{2}-\d{2}$/.test(parametre)) return dateDepuisTexte(parametre);
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dateDepuisTexte(texte) {
  const [a, m, j] = texte.split("-").map(Number);
  return new Date(a, m - 1, j);
}

export function texteDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nomJour(d) { return JOURS[d.getDay()]; }

export function dateLongue(d) {
  const jour = JOURS[d.getDay()];
  const numero = d.getDate() === 1 ? "1er" : d.getDate();
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${numero} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateCourte(d) {
  return `${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]}`;
}

function joursEntre(a, b) {
  // Arrondi pour ignorer les changements d'heure
  return Math.round((b - a) / UN_JOUR);
}

// Renvoie toutes les informations du programme pour une date donnée.
export function infosDuJour(date) {
  const p = donnees.programme;
  const debut = dateDepuisTexte(p.dateDebutProgramme);
  const ecart = joursEntre(debut, date);
  const nom = nomJour(date);

  if (ecart < 0) {
    return { avantDebut: true, joursAvantDebut: joursEntre(date, dateDepuisTexte(p.premierJourEntrainement)), nomJour: nom, date };
  }

  const semaineProgramme = Math.floor(ecart / 7) + 1;       // 1, 2, 3… sans fin
  const duree = p.dureeCycleSemaines;
  const cycle = Math.floor((semaineProgramme - 1) / duree) + 1;
  const semaineCycle = ((semaineProgramme - 1) % duree) + 1; // 1 à 13
  const phase = p.phases.find((ph) => ph.semaines.includes(semaineCycle));
  const menu = semaineProgramme % 2 === 1 ? "menuA" : "menuB";
  const estPreparation = texteDate(date) === p.preparation.date;
  const estWeekEnd = nom === "samedi" || nom === "dimanche";

  return {
    date, nomJour: nom, semaineProgramme, cycle, semaineCycle, phase, menu,
    estPreparation, estWeekEnd,
    jour: p.planning[nom],
    conseil: p.conseilsDuCoach[String(semaineCycle)],
  };
}

// Calories visées pour la journée (semaine ou week-end).
export function caloriesDuJour(infos, profil) {
  const o = donnees.programme.objectifs;
  const base = profil && profil.caloriesSemaine ? profil.caloriesSemaine : o.caloriesSemaine;
  const ecartWeekEnd = o.caloriesWeekEnd - o.caloriesSemaine;
  const cible = infos.estWeekEnd ? base + ecartWeekEnd : base;
  return Math.max(cible, o.plancherCalories);
}
