// Suivi jour par jour : ce qui a été fait (gardé dans le téléphone).
import { lire, ecrire, toutLire } from "./stockage.js";
import { contenuDuJour, elementsACocher } from "./journee.js";
import { dateDepuisTexte } from "./dates.js";

const cle = (date) => `suivi-${date}`;

export async function lireSuivi(dateTexte) {
  return (await lire(cle(dateTexte))) || { coches: {}, faite: false };
}

export async function cocher(dateTexte, element, valeur) {
  const s = await lireSuivi(dateTexte);
  if (valeur) s.coches[element] = new Date().toISOString();
  else delete s.coches[element];
  const contenu = contenuDuJour(dateDepuisTexte(dateTexte));
  const tous = elementsACocher(contenu);
  s.faite = tous.length > 0 && tous.every((e) => s.coches[e]);
  s.misAJourLe = new Date().toISOString();
  await ecrire(cle(dateTexte), s);
  return s;
}

export async function toutCocher(dateTexte, valeur) {
  const contenu = contenuDuJour(dateDepuisTexte(dateTexte));
  const s = { coches: {}, faite: false };
  if (valeur) {
    const maintenant = new Date().toISOString();
    elementsACocher(contenu).forEach((e) => { s.coches[e] = maintenant; });
    s.faite = true;
  }
  s.misAJourLe = new Date().toISOString();
  await ecrire(cle(dateTexte), s);
  return s;
}

// Tous les suivis, par date (pour le calendrier).
export async function tousLesSuivis() {
  const tout = await toutLire();
  const res = {};
  for (const [k, v] of Object.entries(tout)) if (k.startsWith("suivi-")) res[k.slice(6)] = v;
  return res;
}

// Progression d'une journée : nombre d'éléments faits sur le total.
export function progression(contenu, suivi) {
  const tous = elementsACocher(contenu);
  const faits = tous.filter((e) => suivi && suivi.coches && suivi.coches[e]).length;
  return { faits, total: tous.length, faite: tous.length > 0 && faits === tous.length };
}
