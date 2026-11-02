// Personnalisation : calcul du plan selon le profil et adaptation des séances.
// Les règles sont dans data/personnalisation.json.
import { donnees } from "./donnees.js";
import { lire, ecrire } from "./stockage.js";

let profilCourant = {};

export async function chargerProfil() {
  profilCourant = (await lire("profil")) || {};
  return profilCourant;
}

export function profil() { return profilCourant; }

export async function enregistrerProfil(nouveau) {
  profilCourant = { ...nouveau, misAJourLe: new Date().toISOString() };
  await ecrire("profil", profilCourant);
  return profilCourant;
}

const regles = () => donnees.personnalisation;
const arrondir = (n, pas) => Math.round(n / pas) * pas;

export function objectifDe(p = profilCourant) {
  return regles().objectifs[p.objectif] ? p.objectif : "perte";
}
export function niveauDe(p = profilCourant) {
  return regles().niveaux[p.niveau] ? p.niveau : "debutante";
}
export function rythmeDe(p = profilCourant) {
  return regles().rythmes[p.rythme] ? p.rythme : "normal";
}
export function genesDe(p = profilCourant) {
  return (p.genes || []).filter((g) => regles().genes[g]);
}
export const poidsActuel = (p = profilCourant) => p.poidsActuel || p.poidsDepart;

export function profilComplet(p = profilCourant) {
  return Boolean(p.age && p.taille && poidsActuel(p));
}

// Calcule le plan proposé (calories, protéines, eau, date d'arrivée) à partir du profil.
export function calculerPlan(p = profilCourant) {
  if (!profilComplet(p)) return null;
  const r = regles();
  const o = donnees.programme.objectifs;
  const poids = Number(poidsActuel(p));
  const metabolisme = 10 * poids + 6.25 * Number(p.taille) - 5 * Number(p.age) - 161;
  const besoin = metabolisme * o.coefficientActivite;
  const idObjectif = objectifDe(p);
  const objectif = r.objectifs[idObjectif];
  const deficit = objectif.deficitSelonRythme ? r.rythmes[rythmeDe(p)].deficit : objectif.deficit;
  // Le déficit choisi est une moyenne sur 7 jours : le week-end, plus généreux, est compensé en semaine.
  const brut = besoin - deficit - (r.ecartWeekEnd * 2) / 7;
  const caloriesSemaine = Math.max(arrondir(brut, r.arrondiCalories), r.plancherCalories);
  const plancherAtteint = brut < r.plancherCalories;
  const caloriesWeekEnd = caloriesSemaine + r.ecartWeekEnd;

  const poidsVise = Number(p.poidsObjectif) || poids;
  const base = objectif.proteinesSur === "poidsVise" ? Math.min(poidsVise, poids) : poids;
  const proteines = Math.min(arrondir(base * objectif.proteinesParKg, 5), 160);

  const e = r.eau;
  const eau = Math.min(Math.max(arrondir(poids * e.millilitresParKg, 250), e.minimumMillilitres), e.maximumMillilitres);

  // Date estimée d'arrivée (seulement si l'on cherche à perdre du poids)
  let semainesEstimees = null, dateArrivee = null, perteParSemaine = null;
  const deficitReel = besoin - caloriesSemaine; // en semaine ; le week-end compte moins
  const deficitMoyen = (deficitReel * 5 + (deficitReel - r.ecartWeekEnd) * 2) / 7;
  if (p.poidsObjectif && poids > poidsVise && deficitMoyen > 0) {
    perteParSemaine = (deficitMoyen * 7) / 7700;
    semainesEstimees = Math.ceil((poids - poidsVise) / perteParSemaine);
    dateArrivee = new Date(); dateArrivee.setDate(dateArrivee.getDate() + semainesEstimees * 7);
  }

  return {
    metabolisme: Math.round(metabolisme), besoin: Math.round(besoin), deficit, caloriesSemaine, caloriesWeekEnd, plancherAtteint,
    proteines, eau, eauSport: eau + e.enPlusJourSport, perteParSemaine, semainesEstimees, dateArrivee,
    poidsReference: poids, objectif: idObjectif, calculeLe: new Date().toISOString(),
  };
}

// Plan en vigueur : celui validé par l'utilisatrice, sinon les valeurs du programme.
export function planActif() {
  const o = donnees.programme.objectifs;
  const v = profilCourant.planValide;
  if (v) return { ...v, valide: true };
  return {
    valide: false, caloriesSemaine: o.caloriesSemaine, caloriesWeekEnd: o.caloriesWeekEnd,
    proteines: o.proteinesGrammes, eau: o.eauMillilitres, eauSport: o.eauMillilitresJourSport,
  };
}

export async function validerPlan(plan) {
  return enregistrerProfil({ ...profilCourant, planValide: { ...plan, valideLe: new Date().toISOString() } });
}

// Palier de 5 kg atteint depuis le dernier plan validé ?
export function palierAtteint() {
  const v = profilCourant.planValide;
  if (!v || !poidsActuel()) return false;
  const palier = donnees.programme.objectifs.paliersRecalculKg;
  return Number(v.poidsReference) - Number(poidsActuel()) >= palier;
}

// Semaine du programme dont on prend les doses, selon le niveau.
export function semaineDesDoses(semaineCycle) {
  const duree = donnees.programme.dureeCycleSemaines;
  if (semaineCycle >= duree) return duree; // la semaine de récupération reste la semaine de récupération
  const avance = regles().niveaux[niveauDe()].semainesDAvance;
  return Math.min(semaineCycle + avance, duree - 1);
}

// Copie de la phase, adaptée à l'objectif et aux gênes.
export function adapterPhase(phase) {
  const r = regles();
  const obj = r.objectifs[objectifDe()];
  const copie = JSON.parse(JSON.stringify(phase));
  const recuperation = phase.id === "recuperation";
  if (!recuperation) {
    for (const dose of Object.values(copie.musculation)) {
      dose.series = Math.min(dose.series + obj.musculation.seriesEnPlus, obj.musculation.seriesMax);
    }
    if (obj.gainage.toursEnPlus) copie.gainage.tours = Math.min(copie.gainage.tours + obj.gainage.toursEnPlus, obj.gainage.toursMax || 4);
    if (obj.cardio.cyclesEnPlus) copie.intervalles.cycles = Math.max(copie.intervalles.cycles + obj.cardio.cyclesEnPlus, obj.cardio.cyclesMin || 4);
    if (obj.cardio.minutesContinue) copie.penteContinue = { texte: obj.cardio.texteContinue, minutes: obj.cardio.minutesContinue, pente: 6 };
  } else {
    for (const dose of Object.values(copie.musculation)) dose.series = Math.min(dose.series, obj.musculation.seriesMax);
  }
  // Pente limitée en cas de gêne aux genoux
  for (const g of genesDe()) {
    const max = r.genes[g].penteMax;
    if (max) {
      copie.intervalles.effort.pente = Math.min(copie.intervalles.effort.pente, max);
      if (copie.penteContinue.pente > max) copie.penteContinue = { ...copie.penteContinue, pente: max, texte: copie.penteContinue.texte.replace(/\d+ %/, `${max} %`) };
    }
  }
  copie.personnalisee = true;
  return copie;
}

// Liste des exercices d'une séance après remplacements liés aux gênes.
export function exercicesSeance(idSeance) {
  const r = regles();
  const base = donnees.programme.seances[idSeance].exercices;
  const remplacements = {};
  for (const g of genesDe()) Object.assign(remplacements, r.genes[g].remplacements);
  const resultat = [];
  const changements = [];
  for (const id of base) {
    let nouveau = id;
    const vus = new Set();
    while (remplacements[nouveau] && !vus.has(nouveau)) { vus.add(nouveau); nouveau = remplacements[nouveau]; }
    // Exercice déjà présent dans la séance : on ne le double pas.
    if (resultat.includes(nouveau) || (nouveau !== id && base.includes(nouveau))) nouveau = null;
    if (nouveau) resultat.push(nouveau);
    if (nouveau !== id) changements.push({ ancien: id, nouveau });
  }
  return { exercices: resultat, changements };
}

// Résumé des adaptations, pour l'écran de réglages.
export function resumeAdaptations() {
  const r = regles();
  const lignes = [];
  const obj = r.objectifs[objectifDe()];
  lignes.push(`${obj.emoji} ${obj.nom} : ${obj.resume}`);
  const niv = r.niveaux[niveauDe()];
  if (niv.semainesDAvance) lignes.push(`📈 Niveau ${niv.nom.toLowerCase()} : les charges et séries démarrent avec ${niv.semainesDAvance} semaines d'avance sur le programme.`);
  else lignes.push("🌱 Niveau débutante : progression complète depuis la semaine 1.");
  for (const g of genesDe()) lignes.push(`${r.genes[g].emoji} ${r.genes[g].conseil}`);
  for (const id of ["A", "B", "C", "G"]) {
    for (const c of exercicesSeance(id).changements) {
      const ex = donnees.programme.exercices;
      lignes.push(`🔁 ${donnees.programme.seances[id].nom} : ${ex[c.ancien].nom} → ${c.nouveau ? ex[c.nouveau].nom : "retiré"}`);
    }
  }
  return lignes;
}
