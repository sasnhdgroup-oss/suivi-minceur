// Contenu détaillé d'une journée du programme : quoi faire, à quelle heure, avec quelles doses.
import { donnees } from "./donnees.js";
import { infosDuJour, texteDate } from "./dates.js";
import { formatDuree, nombre } from "./outils.js";

// « 15 » → « 15 répétitions » ; « 12 par jambe » reste tel quel.
export function texteReps(reps) {
  return /^\d+(-\d+)?$/.test(String(reps)) ? `${String(reps).replace("-", " à ")} répétitions` : reps;
}

export function doseDetaillee(idExercice, idSeance, phase) {
  if (idSeance === "G") {
    return { principal: phase.gainage.exercices[idExercice], secondaire: `${phase.gainage.tours} tours`, series: phase.gainage.tours };
  }
  const p = phase.musculation[idExercice];
  return { principal: texteReps(p.reps), secondaire: `${p.series} série${p.series > 1 ? "s" : ""}`, series: p.series, court: `${p.series} × ${p.reps}` };
}

function detailIntervalles(phase) {
  const i = phase.intervalles;
  const total = Math.round((i.cycles * (i.effort.duree + i.recuperation.duree)) / 60);
  return {
    court: `${i.cycles} × (${formatDuree(i.effort.duree)} à ${i.effort.pente} % · ${formatDuree(i.recuperation.duree)} à ${i.recuperation.pente} %)`,
    lignes: [
      `${i.cycles} cycles, environ ${total} minutes au total`,
      `⬆️ Effort : ${formatDuree(i.effort.duree)} à ${i.effort.pente} % de pente, ${nombre(i.effort.vitesse)} km/h`,
      `⬇️ Récupération : ${formatDuree(i.recuperation.duree)} à ${i.recuperation.pente} % de pente, ${nombre(i.recuperation.vitesse)} km/h`,
    ],
  };
}

export function contenuDuJour(date) {
  const p = donnees.programme;
  const infos = infosDuJour(date);
  const cleDate = texteDate(date);
  if (infos.avantDebut) return { infos, cleDate, avantDebut: true, blocs: [], titre: "Avant le programme", theme: "repos", emoji: "⏳" };

  if (infos.estPreparation) {
    return {
      infos, cleDate, titre: "Préparation", theme: "repos", emoji: "🗓️",
      blocs: p.preparation.liste.map((texte, i) => ({ id: `prep${i}`, nom: texte, type: "preparation", cochable: true })),
    };
  }

  const jour = infos.jour;
  const phase = infos.phase;
  const blocs = jour.blocs.map((b, i) => {
    const bloc = { id: `b${i}`, heure: b.heure, nom: b.nom, emoji: b.emoji, type: b.type, dureeMinutes: b.dureeMinutes, cochable: b.type !== "douche", lignes: [] };
    if (b.type === "musculation" || b.type === "gainage") {
      const s = p.seances[b.seance];
      bloc.seance = b.seance;
      bloc.cochable = false;
      bloc.court = b.type === "gainage" ? `${phase.gainage.tours} tours de ${s.exercices.length} exercices` : `${s.exercices.length} exercices`;
      bloc.exercices = s.exercices.map((id) => {
        const e = p.exercices[id];
        return { id, nom: e.nom, emoji: e.emoji, explication: e.explication, repos: e.reposSecondes, dose: doseDetaillee(id, b.seance, phase) };
      });
      if (b.type === "gainage") bloc.lignes.push(`Enchaîner les ${s.exercices.length} exercices, puis recommencer : ${phase.gainage.tours} tours.`);
    } else if (b.type === "intervalles") {
      const d = detailIntervalles(phase); bloc.court = d.court; bloc.lignes = d.lignes;
    } else if (b.type === "pente_continue") {
      bloc.court = phase.penteContinue.texte; bloc.lignes = [`Allure régulière à ${nombre(p.vitesses.recuperation)} - ${nombre(p.vitesses.effort)} km/h`];
    } else if (b.type === "echauffement") {
      bloc.court = "10 min de vélo ou de tapis, allure facile";
    } else if (b.type === "etirements") {
      bloc.court = "10 min : cuisses, fessiers, dos, épaules";
    } else if (b.type === "aquagym") {
      bloc.court = "Cours collectif d'environ 1 heure";
    } else if (b.type === "douche") {
      bloc.court = `Fin impérative à ${p.finImperative}`;
    } else if (b.type === "balade") {
      bloc.court = "Marche active, à votre rythme";
    } else if (b.type === "cuisine") {
      bloc.court = "Préparer les repas de la semaine (voir l'onglet Repas)";
    }
    return bloc;
  });

  return { infos, cleDate, titre: jour.titre, theme: jour.theme, emoji: jour.emoji, blocs };
}

// Liste des cases à cocher d'une journée (clé → libellé).
export function elementsACocher(contenu) {
  const liste = [];
  for (const b of contenu.blocs) {
    if (b.exercices) b.exercices.forEach((e) => liste.push(`${b.id}:${e.id}`));
    else if (b.cochable) liste.push(b.id);
  }
  return liste;
}
