// Contenu détaillé d'une journée du programme : quoi faire, à quelle heure, avec quelles doses.
import { donnees } from "./donnees.js";
import { infosDuJour, texteDate } from "./dates.js";
import { formatDuree, nombre } from "./outils.js";
import { exercicesSeance } from "./profil.js";

// « 15 » → « 15 répétitions » ; « 12 par jambe » reste tel quel.
export function texteReps(reps) {
  return /^\d+(-\d+)?$/.test(String(reps)) ? `${String(reps).replace("-", " à ")} répétitions` : reps;
}

export function doseDetaillee(idExercice, idSeance, phase) {
  const e = donnees.programme.exercices[idExercice];
  if (idSeance === "G") {
    const d = phase.gainage.exercices[idExercice] || "30 s";
    return { principal: d, secondaire: `${phase.gainage.tours} tours`, series: phase.gainage.tours };
  }
  let p = phase.musculation[idExercice];
  if (!p) {
    // Exercice de remplacement : même nombre de séries que l'exercice d'origine.
    const c = exercicesSeance(idSeance).changements.find((x) => x.nouveau === idExercice);
    const origine = c ? phase.musculation[c.ancien] : null;
    const series = origine ? origine.series : 2;
    p = { series, reps: e && e.mesure === "duree" ? "30 s" : "15" };
  }
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
      const liste = exercicesSeance(b.seance).exercices;
      bloc.court = b.type === "gainage" ? `${phase.gainage.tours} tours de ${liste.length} exercices` : `${liste.length} exercices`;
      bloc.exercices = liste.map((id) => {
        const e = p.exercices[id];
        return { id, nom: e.nom, emoji: e.emoji, explication: e.explication, repos: e.reposSecondes, dose: doseDetaillee(id, b.seance, phase) };
      });
      if (b.type === "gainage") bloc.lignes.push(`Enchaîner les ${liste.length} exercices, puis recommencer : ${phase.gainage.tours} tours.`);
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

// Conseils pour ajuster les menus du programme aux objectifs personnels.
export function ajustementRepas(totalCalories, totalProteines, cible) {
  const marge = 150;
  const conseils = [];
  const ecartCal = cible.calories - (totalCalories + marge);
  if (ecartCal >= 150) {
    conseils.push(`🔼 Il vous manque environ ${nombre(Math.round(ecartCal / 50) * 50)} calories : ajoutez ${ecartCal >= 300 ? "une collation (yaourt grec et 10 amandes, ≈ 220 calories) et une portion de féculent au déjeuner (≈ 180 calories)" : "une collation (yaourt grec et 10 amandes, ≈ 220 calories)"}.`);
  } else if (ecartCal <= -150) {
    conseils.push(`🔽 Ce menu dépasse votre cible d'environ ${nombre(Math.round(-ecartCal / 50) * 50)} calories : prenez une demi-portion de féculent au dîner (≈ −90) et une seule cuillère d'huile par jour (≈ −90).`);
  }
  const ecartProt = cible.proteines - totalProteines;
  if (ecartProt >= 15) conseils.push(`🥩 Il manque environ ${Math.round(ecartProt)} g de protéines : ajoutez un yaourt très riche en protéines (type skyr, 200 g ≈ 22 g de protéines, 130 calories) en collation.`);
  else if (ecartProt >= 6) conseils.push(`🥩 Il manque environ ${Math.round(ecartProt)} g de protéines : ajoutez 1 œuf dur ou un yaourt grec (≈ 7 à 9 g).`);
  return conseils;
}
