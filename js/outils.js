// Petites fonctions communes à tous les écrans.
import { donnees } from "./donnees.js";
import { exercicesSeance } from "./profil.js";

export function echapper(texte) {
  return String(texte ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Écrit un nombre à la française : 1 650 ; 2,5
export function nombre(n) {
  const [entier, decimales] = String(Math.round(Number(n) * 10) / 10).split(".");
  const avecEspaces = entier.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return decimales ? `${avecEspaces},${decimales}` : avecEspaces;
}

export function formatDuree(secondes) {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  if (m && s) return `${m} min ${s}`;
  if (m) return `${m} min`;
  return `${s} s`;
}

// Détail d'un bloc du planning selon la phase (séries, intervalles…).
export function detailBloc(bloc, phase) {
  if (!phase) return "";
  switch (bloc.type) {
    case "intervalles": {
      const i = phase.intervalles;
      return `${i.cycles} × (${formatDuree(i.effort.duree)} à ${i.effort.pente} % · ${formatDuree(i.recuperation.duree)} à ${i.recuperation.pente} %)`;
    }
    case "pente_continue": return phase.penteContinue.texte;
    case "gainage": return `${phase.gainage.tours} tours`;
    case "echauffement": return "10 min";
    case "musculation": {
      return `${exercicesSeance(bloc.seance).exercices.length} exercices`;
    }
    default: return "";
  }
}

// Dose d'un exercice pour la phase (ex. « 2 × 15 »).
export function doseExercice(idExercice, seance, phase) {
  if (!phase) return "";
  if (seance === "G") return phase.gainage.exercices[idExercice] || "";
  const p = phase.musculation[idExercice];
  return p ? `${p.series} × ${p.reps}` : "";
}

export function phraseDuJour(date) {
  const phrases = donnees.motivation.phrases;
  const numeroJour = Math.floor(date.getTime() / 86400000);
  return phrases[((numeroJour % phrases.length) + phrases.length) % phrases.length];
}
