// Silhouettes animées des exercices, dessinées en SVG (aucune image ni vidéo).
// Chaque mouvement est décrit dans data/mouvements.json par deux positions (départ et fin).
// Les bras et les jambes sont recalculés à chaque image pour garder des longueurs constantes.
import { donnees } from "./donnees.js";

const NS = "http://www.w3.org/2000/svg";
const SOL = 160;
const actives = new Set();
let boucle = null;
const reduireAnimations = window.matchMedia("(prefers-reduced-motion: reduce)");

const observateur = "IntersectionObserver" in window
  ? new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        const anim = e.target.__animation;
        if (!anim) return;
        anim.visible = e.isIntersecting;
      });
    }, { rootMargin: "80px" })
  : null;

function direction(angle) {
  const r = (angle * Math.PI) / 180;
  return [Math.sin(r), Math.cos(r)];
}
const plus = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const melange = (a, b, t) => a + (b - a) * t;
const melangePoint = (a, b, t) => [melange(a[0], b[0], t), melange(a[1], b[1], t)];

// Calcule l'articulation du milieu (coude ou genou) entre A et B.
function articulation(A, B, l1, l2, preference) {
  let dx = B[0] - A[0], dy = B[1] - A[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const dMax = l1 + l2 - 0.01, dMin = Math.abs(l1 - l2) + 0.01;
  const dEff = Math.min(Math.max(d, dMin), dMax);
  const base = Math.atan2(dy, dx);
  const a = Math.acos((l1 * l1 + dEff * dEff - l2 * l2) / (2 * l1 * dEff));
  const c1 = [A[0] + Math.cos(base + a) * l1, A[1] + Math.sin(base + a) * l1];
  const c2 = [A[0] + Math.cos(base - a) * l1, A[1] + Math.sin(base - a) * l1];
  const milieu = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const score = (c) => (c[0] - milieu[0]) * preference[0] + (c[1] - milieu[1]) * preference[1];
  const coude = score(c1) >= score(c2) ? c1 : c2;
  // Si la cible est trop loin, la main ou le pied s'arrête au bout du membre.
  const bout = d > dMax ? plus(A, [dx / d, dy / d], dMax) : B;
  return [coude, bout];
}

function squelette(mouvement, pose) {
  const L = donnees.mouvements.longueurs;
  const t = direction(pose.torse);
  const hanche = pose.hanche;
  const epaule = plus(hanche, t, L.torse);
  const tete = plus(epaule, t, L.cou);
  const face = mouvement.vue === "face";
  const eh = face ? mouvement.ecartHanches || 0 : 0;
  const ee = face ? mouvement.ecartEpaules || 0 : 0;
  const perp = [-t[1], t[0]];
  const hancheN = plus(hanche, perp, eh), hancheF = plus(hanche, perp, -eh);
  const epauleN = plus(epaule, perp, ee), epauleF = plus(epaule, perp, -ee);
  const p = mouvement.plis;
  const [coudeN, mainN] = articulation(epauleN, pose.mainN, L.bras, L.avantBras, p.coudeN);
  const [coudeF, mainF] = articulation(epauleF, pose.mainF, L.bras, L.avantBras, p.coudeF);
  const [genouN, piedN] = articulation(hancheN, pose.piedN, L.cuisse, L.tibia, p.genouN);
  const [genouF, piedF] = articulation(hancheF, pose.piedF, L.cuisse, L.tibia, p.genouF);
  return { hanche, epaule, tete, hancheN, hancheF, epauleN, epauleF, coudeN, mainN, coudeF, mainF, genouN, piedN, genouF, piedF };
}

function poseIntermediaire(a, b, t) {
  return {
    hanche: melangePoint(a.hanche, b.hanche, t),
    torse: melange(a.torse, b.torse, t),
    mainN: melangePoint(a.mainN, b.mainN, t),
    mainF: melangePoint(a.mainF, b.mainF, t),
    piedN: melangePoint(a.piedN, b.piedN, t),
    piedF: melangePoint(a.piedF, b.piedF, t),
  };
}

const adoucir = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// Avancement du mouvement (0 = départ, 1 = fin) selon le rythme [aller, pause, retour, pause].
function avancement(rythme, secondes) {
  const [aller, pause, retour, pauseDepart] = rythme;
  const total = aller + pause + retour + pauseDepart;
  let s = secondes % total;
  if (s < aller) return { t: adoucir(s / aller), etape: "aller" };
  s -= aller;
  if (s < pause) return { t: 1, etape: "pause" };
  s -= pause;
  if (s < retour) return { t: 1 - adoucir(s / retour), etape: "retour" };
  return { t: 0, etape: "pauseDepart" };
}

function el(nom, attributs, parent) {
  const n = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attributs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

// Crée le dessin et renvoie une fonction qui le met à jour pour une pose donnée.
function construire(svg, mouvement) {
  svg.setAttribute("viewBox", "0 0 200 170");
  svg.innerHTML = "";
  const decor = el("g", { class: "anim-decor" }, svg);
  el("line", { x1: 4, y1: SOL + 1.5, x2: 196, y2: SOL + 1.5, class: "anim-sol" }, decor);
  for (const d of mouvement.decor || []) {
    if (d.type === "rect") el("rect", { x: d.x, y: d.y, width: d.l, height: d.h, rx: 3, class: "anim-objet" }, decor);
    if (d.type === "ligne") el("line", { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, "stroke-width": d.e, class: "anim-trait" }, decor);
  }
  const face = mouvement.vue === "face";
  const loin = el("g", { class: face ? "anim-corps" : "anim-corps anim-loin" }, svg);
  const corps = el("g", { class: "anim-corps" }, svg);
  const objets = el("g", { class: "anim-accessoires" }, svg);

  const membre = (g) => el("polyline", { class: "anim-membre", fill: "none" }, g);
  const pied = (g) => el("line", { class: "anim-pied" }, g);
  const jambeF = membre(loin), piedFEl = pied(loin), brasF = membre(loin);
  const torse = el("line", { class: "anim-torse" }, corps);
  const tete = el("circle", { r: donnees.mouvements.longueurs.tete, class: "anim-tete" }, corps);
  const jambeN = membre(corps), piedNEl = pied(corps), brasN = membre(corps);
  const bassin = face ? el("line", { class: "anim-torse" }, corps) : null;
  const epaules = face ? el("polyline", { class: "anim-membre" }, corps) : null;

  const acc = (mouvement.accessoires || []).map((a) => {
    const g = el("g", {}, objets);
    if (a.type === "haltere") { el("rect", { x: -8, y: -3.5, width: 16, height: 7, rx: 2, class: "anim-poids" }, g); }
    if (a.type === "haltere_vertical") { el("rect", { x: -4, y: -10, width: 8, height: 20, rx: 2, class: "anim-poids" }, g); }
    if (a.type === "disque") { el("circle", { r: a.r || 12, class: "anim-poids anim-disque" }, g); }
    if (a.type === "barre") { if (a.l) el("line", { x1: -a.l / 2, y1: 0, x2: a.l / 2, y2: 0, class: "anim-barre" }, g); }
    if (a.type === "plateau") { el("line", { x1: 0, y1: 0, x2: 0, y2: 0, class: "anim-barre anim-plateau" }, g); }
    if (a.type === "rouleau") { el("circle", { r: 6, class: "anim-poids" }, g); }
    if (a.type === "coussin") { el("rect", { x: -6, y: -5, width: 12, height: 10, rx: 3, class: "anim-poids" }, g); }
    if (a.type === "poignee") { el("rect", { x: -7, y: -2.5, width: 14, height: 5, rx: 2, class: "anim-poids" }, g); }
    if (a.type === "cable") { el("line", { class: "anim-cable" }, g); }
    return { a, g };
  });

  const pts = (...p) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  const placerPied = (ligne, genou, cheville) => {
    if (face) { ligne.setAttribute("x1", cheville[0]); ligne.setAttribute("y1", cheville[1]); ligne.setAttribute("x2", cheville[0]); ligne.setAttribute("y2", cheville[1]); return; }
    const v = [cheville[0] - genou[0], cheville[1] - genou[1]];
    const n = Math.hypot(v[0], v[1]) || 1;
    const bout = plus(cheville, [v[1] / n, -v[0] / n], 9);
    ligne.setAttribute("x1", cheville[0].toFixed(1)); ligne.setAttribute("y1", cheville[1].toFixed(1));
    ligne.setAttribute("x2", bout[0].toFixed(1)); ligne.setAttribute("y2", bout[1].toFixed(1));
  };

  return (pose) => {
    const s = squelette(mouvement, pose);
    jambeF.setAttribute("points", pts(s.hancheF, s.genouF, s.piedF));
    jambeN.setAttribute("points", pts(s.hancheN, s.genouN, s.piedN));
    brasF.setAttribute("points", pts(s.epauleF, s.coudeF, s.mainF));
    brasN.setAttribute("points", pts(s.epauleN, s.coudeN, s.mainN));
    placerPied(piedFEl, s.genouF, s.piedF);
    placerPied(piedNEl, s.genouN, s.piedN);
    torse.setAttribute("x1", s.hanche[0].toFixed(1)); torse.setAttribute("y1", s.hanche[1].toFixed(1));
    torse.setAttribute("x2", s.epaule[0].toFixed(1)); torse.setAttribute("y2", s.epaule[1].toFixed(1));
    tete.setAttribute("cx", s.tete[0].toFixed(1)); tete.setAttribute("cy", s.tete[1].toFixed(1));
    if (bassin) { bassin.setAttribute("x1", s.hancheN[0]); bassin.setAttribute("y1", s.hancheN[1]); bassin.setAttribute("x2", s.hancheF[0]); bassin.setAttribute("y2", s.hancheF[1]); }
    if (epaules) { epaules.setAttribute("points", pts(s.epauleN, s.epauleF)); }
    for (const { a, g } of acc) {
      if (a.type === "cable") {
        const p = s[a.de]; const l = g.firstChild;
        l.setAttribute("x1", p[0].toFixed(1)); l.setAttribute("y1", p[1].toFixed(1));
        l.setAttribute("x2", a.vers[0]); l.setAttribute("y2", a.vers[1]);
        continue;
      }
      const p = s[a.sur] || s.hanche;
      g.setAttribute("transform", `translate(${p[0].toFixed(1)},${(p[1] + (a.dy || 0)).toFixed(1)})`);
      if (a.type === "plateau") {
        const r = (a.angle * Math.PI) / 180, l = a.l / 2, ligne = g.firstChild;
        ligne.setAttribute("x1", (Math.cos(r) * l).toFixed(1)); ligne.setAttribute("y1", (Math.sin(r) * l).toFixed(1));
        ligne.setAttribute("x2", (-Math.cos(r) * l).toFixed(1)); ligne.setAttribute("y2", (-Math.sin(r) * l).toFixed(1));
      }
    }
  };
}

function tourner(temps) {
  for (const anim of actives) {
    if (!anim.svg.isConnected) { actives.delete(anim); if (observateur) observateur.unobserve(anim.svg); continue; }
    if (!anim.visible) continue;
    const { t } = avancement(anim.rythme, (temps - anim.debut) / 1000);
    anim.dessiner(poseIntermediaire(anim.depart, anim.fin, t));
  }
  boucle = actives.size ? requestAnimationFrame(tourner) : null;
}

// Place une silhouette animée dans l'élément <svg> donné.
export function animer(svg, idExercice) {
  const mouvement = donnees.mouvements.mouvements[idExercice];
  if (!mouvement) return;
  const dessiner = construire(svg, mouvement);
  const { depart, fin } = mouvement.poses;
  svg.setAttribute("role", "img");
  if (reduireAnimations.matches) {
    // Animations réduites : on montre la position d'arrivée, sans mouvement.
    dessiner(poseIntermediaire(depart, fin, 1));
    return;
  }
  dessiner(depart);
  const anim = { svg, dessiner, depart, fin, rythme: mouvement.rythme, debut: performance.now(), visible: !observateur };
  svg.__animation = anim;
  if (observateur) observateur.observe(svg);
  actives.add(anim);
  if (!boucle) boucle = requestAnimationFrame(tourner);
}

// Anime tous les <svg data-animation="id"> présents dans le conteneur.
export function animerTout(conteneur) {
  conteneur.querySelectorAll("svg[data-animation]").forEach((svg) => animer(svg, svg.dataset.animation));
}

export function texteRythme(idExercice) {
  const m = donnees.mouvements.mouvements[idExercice];
  if (!m) return "";
  return m.rythme;
}
