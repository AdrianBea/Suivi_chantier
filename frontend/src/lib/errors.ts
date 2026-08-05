// Traduction des erreurs HTTP en messages destinés à l'utilisateur.
// Module autonome (aucun import) : c'est ce qui permet de l'exécuter directement
// via `node --experimental-strip-types src/lib/errors.test.ts`.

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "La demande n'a pas pu être traitée.",
  403: "Action non autorisée.",
  404: "Élément introuvable.",
  409: "Cette action entre en conflit avec des données existantes.",
  413: "Le fichier envoyé est trop volumineux.",
  429: "Trop de requêtes, merci de réessayer dans un instant.",
  500: "Le service a rencontré un problème de notre côté. Merci de réessayer dans un instant.",
  502: "Le service est momentanément injoignable. Merci de réessayer dans un instant.",
  503: "Le service est en cours de redémarrage. Merci de réessayer dans un instant.",
  504: "Le service met trop de temps à répondre. Merci de réessayer dans un instant.",
};

// Un body technique ne doit jamais atteindre l'écran : ASP.NET, Kestrel et le proxy Next
// produisent des libellés anglais ("Internal Server Error", "Bad Gateway"), du HTML de page
// d'erreur, ou une stack trace. On ne garde que ce qui ressemble à une phrase écrite pour
// l'utilisateur, le reste retombe sur FALLBACK_MESSAGES.
export function isHumanMessage(text: string): boolean {
  const t = text.trim();
  return (
    t.length > 0 &&
    t.length <= 300 &&
    !t.startsWith("<") && // page d'erreur HTML du proxy
    !t.includes("\n   at ") && // stack trace .NET
    !/^(internal server error|bad gateway|service unavailable|gateway time-?out|not found|bad request|forbidden|conflict|unauthorized|an error occurred.*)$/i.test(t)
  );
}

// Les controllers renvoient un texte brut lisible ; ASP.NET peut aussi renvoyer un
// ProblemDetails JSON (ex. erreurs de model binding), un `{ message }` (AdminController)
// ou un body vide (NotFound()) : on ramène tout ça à un message humain unique.
export async function humanizeError(res: Response): Promise<string> {
  const fallback = FALLBACK_MESSAGES[res.status] ?? "Une erreur inattendue est survenue. Merci de réessayer.";
  const text = await res.text().catch(() => "");
  if (!text) return fallback;

  let candidate = text;
  try {
    const problem = JSON.parse(text);
    if (typeof problem === "object" && problem !== null) {
      candidate = [problem.message, problem.detail, problem.title].find((v) => typeof v === "string" && v.trim()) ?? "";
    }
  } catch {
    // corps texte brut du controller : on le garde tel quel
  }
  return isHumanMessage(candidate) ? candidate.trim() : fallback;
}

// Le backend Railway (plan gratuit) s'endort après inactivité : le premier appel doit
// réveiller l'instance ET la base, ce qui dépasse largement une seconde.
export interface Retry {
  timeoutMs: number;
  retries: number;
  onRetry?: (tentative: number) => void;
}

// Ne retente QUE les échecs où le serveur n'a rien traité (panne réseau, timeout).
// Une réponse HTTP est renvoyée telle quelle : la rejouer dupliquerait un POST déjà
// pris en compte, et masquerait un 401 « mot de passe incorrect » derrière 3 essais.
export async function fetchAvecRetry(envoyer: () => Promise<Response>, retry?: Retry): Promise<Response> {
  for (let tentative = 0; ; tentative++) {
    try {
      return await envoyer();
    } catch {
      if (!retry || tentative >= retry.retries) {
        throw new Error("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
      }
      retry.onRetry?.(tentative + 1);
    }
  }
}
