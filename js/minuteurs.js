// Outils de la séance guidée : sons, vibrations, écran maintenu allumé, confettis.
// Tout est gratuit et intégré au navigateur.

let contexteAudio = null;

// Sur iPhone, le son doit être « débloqué » par un premier appui de l'utilisatrice.
export function debloquerSon() {
  try {
    if (!contexteAudio) contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
    if (contexteAudio.state === "suspended") contexteAudio.resume();
  } catch (e) { /* pas de son disponible */ }
}

function bip(frequence, duree, debut = 0, volume = 0.25) {
  if (!contexteAudio) return;
  const t = contexteAudio.currentTime + debut;
  const osc = contexteAudio.createOscillator();
  const gain = contexteAudio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  osc.connect(gain).connect(contexteAudio.destination);
  osc.start(t);
  osc.stop(t + duree + 0.05);
}

// « fin » : fin du repos ; « effort » / « recuperation » : changement de phase ; « tic » : 3 dernières secondes.
export function son(type) {
  try {
    if (type === "tic") bip(660, 0.12, 0, 0.15);
    else if (type === "effort") { bip(880, 0.18); bip(1175, 0.25, 0.2); }
    else if (type === "recuperation") { bip(660, 0.18); bip(520, 0.3, 0.2); }
    else if (type === "bravo") { [523, 659, 784, 1047].forEach((f, i) => bip(f, 0.22, i * 0.15)); }
    else { bip(880, 0.2); bip(880, 0.2, 0.28); bip(1175, 0.35, 0.56); }
  } catch (e) { /* sans importance */ }
}

export function vibrer(motif = [200, 100, 200]) {
  try { if (navigator.vibrate) navigator.vibrate(motif); } catch (e) { /* iPhone : pas de vibration, le son la remplace */ }
}

// Écran maintenu allumé pendant la séance (Wake Lock API).
let verrou = null;
let veutEcranAllume = false;

export async function garderEcranAllume() {
  veutEcranAllume = true;
  if (!("wakeLock" in navigator)) return false;
  try {
    verrou = await navigator.wakeLock.request("screen");
    verrou.addEventListener("release", () => { verrou = null; });
    return true;
  } catch (e) {
    return false;
  }
}

export function libererEcran() {
  veutEcranAllume = false;
  if (verrou) { verrou.release().catch(() => {}); verrou = null; }
}

export const ecranMaintenu = () => Boolean(verrou);

// Le verrou saute quand on quitte l'application : on le reprend au retour.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && veutEcranAllume && !verrou) garderEcranAllume();
});

// Pluie de confettis (petit script maison, sans bibliothèque).
export function confettis(duree = 3500) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const toile = document.createElement("canvas");
  toile.className = "confettis";
  toile.setAttribute("aria-hidden", "true");
  document.body.appendChild(toile);
  const ctx = toile.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const redimensionner = () => { toile.width = innerWidth * ratio; toile.height = innerHeight * ratio; };
  redimensionner();
  const couleurs = ["#F2611D", "#C2185B", "#5B3CC4", "#1D5FC2", "#047857", "#FBBF24"];
  const morceaux = Array.from({ length: 140 }, () => ({
    x: Math.random() * toile.width, y: -Math.random() * toile.height * 0.6,
    l: (6 + Math.random() * 6) * ratio, h: (8 + Math.random() * 8) * ratio,
    vy: (2 + Math.random() * 3) * ratio, vx: (Math.random() - 0.5) * 2 * ratio,
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.2,
    c: couleurs[Math.floor(Math.random() * couleurs.length)],
  }));
  const debut = performance.now();
  function dessiner(t) {
    ctx.clearRect(0, 0, toile.width, toile.height);
    const fondu = Math.max(0, 1 - Math.max(0, t - debut - duree + 800) / 800);
    ctx.globalAlpha = fondu;
    for (const m of morceaux) {
      m.x += m.vx; m.y += m.vy; m.a += m.va;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a);
      ctx.fillStyle = m.c; ctx.fillRect(-m.l / 2, -m.h / 2, m.l, m.h);
      ctx.restore();
    }
    if (t - debut < duree) requestAnimationFrame(dessiner); else toile.remove();
  }
  requestAnimationFrame(dessiner);
}

export function formatChrono(secondes) {
  const s = Math.max(0, Math.ceil(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
