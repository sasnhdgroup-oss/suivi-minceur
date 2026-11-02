// Historique des charges et des répétitions par exercice (gardé dans le téléphone).
import { lire, ecrire } from "./stockage.js";

export async function historique() {
  return (await lire("charges")) || {};
}

// Dernière séance enregistrée pour cet exercice, avant la date donnée.
export async function derniereFois(idExercice, avantDate) {
  const h = await historique();
  const liste = (h[idExercice] || []).filter((x) => x.date < avantDate);
  return liste.length ? liste[liste.length - 1] : null;
}

export async function enregistrerCharges(idExercice, date, series, hausse) {
  const h = await historique();
  const liste = (h[idExercice] || []).filter((x) => x.date !== date);
  liste.push({ date, series, hausse: Boolean(hausse) });
  liste.sort((a, b) => a.date.localeCompare(b.date));
  h[idExercice] = liste;
  await ecrire("charges", h);
}

// Objectif de répétitions lu dans la dose (« 10-12 », « 12 par jambe », « 30 s par côté », « 30 m »).
export function cible(texte) {
  const t = String(texte || "");
  const m = t.match(/(\d+)(?:\s*(?:-|à)\s*(\d+))?/);
  const min = m ? Number(m[1]) : 10;
  const max = m && m[2] ? Number(m[2]) : min;
  let unite = "rép.";
  if (/\d\s*s\b/.test(t)) unite = "s";
  else if (/\d\s*m\b/.test(t)) unite = "m";
  const precision = /par (jambe|bras|côté)/.exec(t);
  return { min, max, unite, precision: precision ? precision[0] : "" };
}
