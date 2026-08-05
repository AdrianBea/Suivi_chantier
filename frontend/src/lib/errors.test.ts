/**
 * Vérifie que humanizeError ne laisse jamais fuir un libellé technique vers l'écran :
 * les messages métier des controllers passent, tout le reste (HTML du proxy, "Internal
 * Server Error" de Kestrel, stack trace .NET) retombe sur un message d'accueil français.
 *
 *   node --experimental-strip-types src/lib/errors.test.ts
 *
 * Node exige l'extension explicite ; TypeScript la refuse hors
 * `allowImportingTsExtensions`, d'où le ts-expect-error local — préférable à
 * l'activation de l'option pour tout le projet, qui déteindrait sur le code applicatif.
 */
import assert from "node:assert/strict";
// @ts-expect-error -- extension requise par le runner Node, pas par le bundler
import { fetchAvecRetry, humanizeError } from "./errors.ts";

const res = (status: number, body: string) => new Response(body, { status });
const GENERIQUE_500 = "Le service a rencontré un problème de notre côté. Merci de réessayer dans un instant.";

// --- ce qui doit être masqué ---------------------------------------------------
assert.equal(await humanizeError(res(500, "")), GENERIQUE_500, "500 sans body");
assert.equal(await humanizeError(res(500, "Internal Server Error")), GENERIQUE_500, "libellé Kestrel");
assert.equal(await humanizeError(res(502, "<html><body>Bad Gateway</body></html>")),
  "Le service est momentanément injoignable. Merci de réessayer dans un instant.", "page HTML du proxy");
assert.equal(await humanizeError(res(504, "Gateway Timeout")),
  "Le service met trop de temps à répondre. Merci de réessayer dans un instant.", "timeout proxy");
assert.equal(
  await humanizeError(res(500, "System.NullReferenceException: Object reference not set\n   at Suivi.Foo(String s)")),
  GENERIQUE_500, "stack trace .NET");
assert.equal(await humanizeError(res(500, '{"title":"Internal Server Error","status":500}')),
  GENERIQUE_500, "ProblemDetails technique");
assert.equal(await humanizeError(res(404, "")), "Élément introuvable.", "404 vide");
assert.equal(await humanizeError(res(500, "x".repeat(400))), GENERIQUE_500, "dump trop long");

// --- ce qui doit passer tel quel ------------------------------------------------
assert.equal(
  await humanizeError(res(409, "Un devis n° D-2026-14 existe déjà pour cette entreprise.")),
  "Un devis n° D-2026-14 existe déjà pour cette entreprise.", "texte brut du controller");
assert.equal(
  await humanizeError(res(400, '{"message":"Vous ne pouvez pas supprimer votre propre compte."}')),
  "Vous ne pouvez pas supprimer votre propre compte.", "{ message } de AdminController");
assert.equal(
  await humanizeError(res(400, '{"title":"Une erreur de validation","detail":"Le champ Lot est invalide."}')),
  "Le champ Lot est invalide.", "detail prioritaire sur title");

// --- fetchAvecRetry : ne doit jamais rejouer une réponse HTTP -------------------
const RETRY = { timeoutMs: 20_000, retries: 2 };
let appels = 0;

// Un 401 est une réponse : la rejouer masquerait un mot de passe faux derrière trois
// tentatives. Seul l'échec réseau (fetch qui rejette) est retenté.
appels = 0;
const refus = await fetchAvecRetry(async () => { appels++; return res(401, "Email ou mot de passe incorrect."); }, RETRY);
assert.equal(refus.status, 401, "la réponse HTTP est renvoyée telle quelle");
assert.equal(appels, 1, "un 401 ne doit JAMAIS être rejoué");

appels = 0;
const cinqCents = await fetchAvecRetry(async () => { appels++; return res(500, ""); }, RETRY);
assert.equal(cinqCents.status, 500, "un 500 est une réponse, pas un échec réseau");
assert.equal(appels, 1, "un 500 ne doit pas être rejoué (POST déjà traité)");

appels = 0;
await assert.rejects(
  () => fetchAvecRetry(async () => { appels++; throw new TypeError("network"); }, RETRY),
  /Impossible de contacter le serveur/, "panne réseau persistante");
assert.equal(appels, 3, "panne réseau : 1 tentative + 2 retries");

appels = 0;
let tentativesVues = 0;
const ok = await fetchAvecRetry(
  async () => { if (++appels < 3) throw new TypeError("network"); return res(200, "{}"); },
  { ...RETRY, onRetry: () => tentativesVues++ });
assert.equal(ok.status, 200, "doit aboutir à la 3e tentative");
assert.equal(appels, 3);
assert.equal(tentativesVues, 2, "onRetry notifie chaque nouvelle tentative (animation de chargement)");

// sans option de retry, un échec réseau remonte immédiatement
appels = 0;
await assert.rejects(() => fetchAvecRetry(async () => { appels++; throw new TypeError("network"); }));
assert.equal(appels, 1, "pas de retry par défaut (imports PDF : pas de rejeu)");

console.log("humanizeError : aucun libellé technique ne fuit ✓");
console.log("fetchAvecRetry : retry réseau uniquement, jamais sur une réponse HTTP ✓");
