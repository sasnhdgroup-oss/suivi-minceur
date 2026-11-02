// Stockage des données personnelles dans le téléphone (IndexedDB).
// Rien n'est envoyé sur internet.

const NOM_BASE = "suivi-minceur";
const VERSION_BASE = 1;
const MAGASIN = "donnees";

let basePromise = null;

function ouvrirBase() {
  if (basePromise) return basePromise;
  basePromise = new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(NOM_BASE, VERSION_BASE);
    demande.onupgradeneeded = () => {
      const base = demande.result;
      if (!base.objectStoreNames.contains(MAGASIN)) base.createObjectStore(MAGASIN);
    };
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
  return basePromise;
}

async function operation(mode, action) {
  const base = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const transaction = base.transaction(MAGASIN, mode);
    const magasin = transaction.objectStore(MAGASIN);
    const demande = action(magasin);
    transaction.oncomplete = () => resoudre(demande ? demande.result : undefined);
    transaction.onerror = () => rejeter(transaction.error);
  });
}

export function lire(cle) {
  return operation("readonly", (m) => m.get(cle));
}

export function ecrire(cle, valeur) {
  return operation("readwrite", (m) => m.put(valeur, cle));
}

export function supprimer(cle) {
  return operation("readwrite", (m) => m.delete(cle));
}

export async function toutLire() {
  const base = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const resultat = {};
    const transaction = base.transaction(MAGASIN, "readonly");
    const curseur = transaction.objectStore(MAGASIN).openCursor();
    curseur.onsuccess = () => {
      const c = curseur.result;
      if (c) { resultat[c.key] = c.value; c.continue(); }
    };
    transaction.oncomplete = () => resoudre(resultat);
    transaction.onerror = () => rejeter(transaction.error);
  });
}

// Demande au navigateur de ne pas effacer les données en cas de manque de place.
export async function demanderStockagePersistant() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (e) { /* sans importance */ }
  return false;
}
