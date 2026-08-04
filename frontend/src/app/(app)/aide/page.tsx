import Link from "next/link";

export const metadata = { title: "Aide — Le Point Travaux" };

// ponytail: page statique, aucun state — server component, <details> natif pour la FAQ

const CARD: React.CSSProperties = { background: "var(--nm-base)", border: "1px solid var(--nm-border)", borderRadius: 10, padding: 28 };
const CARD_TITLE: React.CSSProperties = { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nm-text-muted)", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 20 };
const H2: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: "var(--nm-text-primary)", marginBottom: 10, letterSpacing: "-0.01em" };
const P: React.CSSProperties = { fontSize: 13, color: "var(--nm-text-muted)", lineHeight: 1.75 };
const MONO: React.CSSProperties = { fontFamily: "var(--font-jetbrains-mono)", fontSize: 12, color: "var(--nm-text-tertiary)" };
const SECTION_GAP = 22;

const STEPS = [
  {
    n: "1",
    title: "Renseignez votre chantier",
    body: <>Dans <A href="/parametres">Paramètres</A>, saisissez votre nom, l&apos;adresse du chantier et les dates de début et de livraison prévue. Ces informations alimentent l&apos;en-tête du tableau de bord.</>,
  },
  {
    n: "2",
    title: "Importez vos devis",
    body: <>Sur <A href="/import">Import</A>, choisissez le type <B>Devis</B>, puis glissez vos PDF. Chaque fichier part en analyse : l&apos;IA lit le document et en extrait l&apos;entreprise, les dates, les montants et le détail des lignes.</>,
  },
  {
    n: "3",
    title: "Vérifiez ce qui a été extrait",
    body: <>Une extraction automatique n&apos;est jamais fiable à 100 %. Ouvrez chaque devis depuis <A href="/devis">Devis</A>, comparez avec le PDF affiché à côté, et corrigez les lignes fausses via <B>Modifier</B>. C&apos;est l&apos;étape la plus importante : tout le reste s&apos;appuie dessus.</>,
  },
  {
    n: "4",
    title: "Importez les factures au fil du chantier",
    body: <>Même écran d&apos;import, en sélectionnant le type <B>Facture</B>. Vérifiez-les comme les devis. Vous pouvez y joindre des pièces (bons de livraison, photos, PV de réception) depuis la fiche de la facture.</>,
  },
  {
    n: "5",
    title: "Rapprochez facture et devis",
    body: <>Une facture liée à un devis peut être comparée ligne à ligne. Le bouton <B>Voir les écarts</B> apparaît en haut de la fiche facture dès qu&apos;un devis lui est rattaché.</>,
  },
  {
    n: "6",
    title: "Suivez le budget",
    body: <>Le <A href="/">Tableau de bord</A> agrège tout : budget prévu (somme des devis), montant engagé (somme des factures), avancement global et répartition par lot.</>,
  },
];

const FAQ = [
  {
    q: "Mon document reste bloqué sur « En attente »",
    a: <>L&apos;analyse prend de quelques secondes à une minute selon le nombre de pages. La liste se rafraîchit toute seule. Si le statut passe à <B>Erreur</B>, le PDF est probablement illisible (scan de mauvaise qualité, fichier protégé) ou le service d&apos;IA est injoignable — voyez la question suivante.</>,
  },
  {
    q: "L'extraction échoue systématiquement, sur tous les documents",
    a: <>L&apos;application confie la lecture des PDF à un service d&apos;analyse externe. S&apos;il est indisponible, aucune extraction ne peut aboutir : tous les documents passent en <B>Erreur</B> quelques secondes après l&apos;import. Réessayez plus tard ; si le problème persiste, contactez la personne qui administre l&apos;application.</>,
  },
  {
    q: "Les montants extraits sont faux",
    a: <>Corrigez-les à la main : ouvrez le document, cliquez sur <B>Modifier</B>, ajustez les lignes concernées puis enregistrez. Les totaux se recalculent à partir des lignes. Si l&apos;extraction est trop mauvaise pour être rattrapée, supprimez le document et réimportez-le.</>,
  },
  {
    q: "Comment lier une facture à un devis ?",
    a: <>Le lien se fait à la création manuelle de la facture : sur <A href="/factures">Factures</A> → <B>Ajouter manuellement</B>, choisissez le devis dans la liste déroulante. L&apos;entreprise est alors reprise du devis. Une facture <em>importée</em> n&apos;est pas rattachée automatiquement, et le rattachement après coup n&apos;est pas encore disponible dans l&apos;interface.</>,
  },
  {
    q: "Comment lire la comparaison devis / facture ?",
    a: <>Les lignes de la facture sont rapprochées de celles du devis par ressemblance des libellés — les intitulés n&apos;ont donc pas besoin d&apos;être identiques. Trois cas : ligne conforme, ligne avec un écart de montant, et ligne <B>surlignée en orange</B> qui n&apos;a aucune correspondance dans le devis (facturation d&apos;un poste non prévu, ou libellé trop différent pour être reconnu). L&apos;écart total TTC est affiché en haut de l&apos;écran.</>,
  },
  {
    q: "À quoi sert la page Entreprises ?",
    a: <>C&apos;est le répertoire de vos artisans, alimenté automatiquement à chaque import. Vous pouvez y compléter le SIRET et les coordonnées du contact, utiles quand il faut rappeler une entreprise à propos d&apos;un écart de facturation.</>,
  },
  {
    q: "Puis-je saisir un devis sans avoir de PDF ?",
    a: <>Oui. Sur <A href="/devis">Devis</A> ou <A href="/factures">Factures</A>, utilisez <B>Ajouter manuellement</B>, puis saisissez les lignes une à une depuis la fiche. Vous pourrez joindre le PDF plus tard.</>,
  },
  {
    q: "Comment supprimer un document ?",
    a: <>Ouvrez sa fiche et cliquez sur <B>Supprimer</B>. Depuis l&apos;écran d&apos;import, un document mal extrait peut être écarté directement avec <B>Refuser — infos incorrectes</B>. Dans les deux cas la suppression est définitive.</>,
  },
  {
    q: "Mes données sont-elles visibles par les autres utilisateurs ?",
    a: <>Non. Chaque compte ne voit que ses propres devis, factures et entreprises.</>,
  },
];

export default function AidePage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px clamp(16px, 4vw, 40px) 72px" }}>

      {/* En-tête */}
      <header style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--nm-accent)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", marginBottom: 8 }}>Guide · Le Point Travaux</div>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 700, color: "var(--nm-text-primary)", letterSpacing: "-0.01em" }}>Aide et prise en main</h1>
        <p style={{ ...P, marginTop: 8, maxWidth: 620 }}>
          Le Point Travaux centralise les devis et factures de votre chantier. Vous déposez vos PDF, l&apos;application en extrait
          automatiquement les montants et les lignes, puis compare ce qui est facturé à ce qui avait été devisé.
        </p>
      </header>

      {/* Parcours en 6 étapes */}
      <section style={{ ...CARD, marginBottom: SECTION_GAP }}>
        <div style={CARD_TITLE}>Prise en main en 6 étapes</div>
        <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 22 }}>
          {STEPS.map(({ n, title, body }) => (
            <li key={n} style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, background: "var(--nm-accent-soft-bg)", color: "var(--nm-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-jetbrains-mono)", fontSize: 12, fontWeight: 700 }}>
                {n}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={H2}>{title}</h2>
                <p style={P}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Statuts */}
      <section style={{ ...CARD, marginBottom: SECTION_GAP }}>
        <div style={CARD_TITLE}>Comprendre les statuts</div>
        <p style={{ ...P, marginBottom: 18 }}>Chaque devis et chaque facture porte l&apos;un de ces trois états :</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Statut label="EN ATTENTE" bg="var(--nm-accent-soft-bg)" color="var(--nm-warning)">
            Le document est enregistré, l&apos;IA est en train de le lire. Aucune action de votre part : l&apos;écran se met à jour tout seul.
          </Statut>
          <Statut label="EXTRAIT" bg="var(--nm-success-bg)" color="var(--nm-success)">
            Les données ont été récupérées. <B>Relisez-les</B> : c&apos;est à vous de valider ce que l&apos;IA a compris.
          </Statut>
          <Statut label="ERREUR" bg="var(--nm-danger-bg)" color="var(--nm-danger)">
            La lecture a échoué. Réimportez le document, changez de mode de traitement, ou saisissez-le manuellement.
          </Statut>
        </div>
      </section>

      {/* Repères de lecture du tableau de bord */}
      <section style={{ ...CARD, marginBottom: SECTION_GAP }}>
        <div style={CARD_TITLE}>Lire le tableau de bord</div>
        <dl className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "14px 20px", alignItems: "baseline" }}>
          <Def term="Budget prévu">Somme des montants TTC de tous vos devis. C&apos;est votre enveloppe contractuelle.</Def>
          <Def term="Engagé">Somme des montants TTC de toutes vos factures, et sa part du budget prévu.</Def>
          <Def term="Avancement global">La même proportion, en anneau. Attention : c&apos;est un avancement <em>financier</em>, pas un avancement de travaux.</Def>
          <Def term="En attente">Nombre de factures pas encore rapprochées d&apos;un devis.</Def>
          <Def term="Conformité">Part de vos factures dont l&apos;extraction a abouti.</Def>
          <Def term="Budget par lot">Engagé / prévu pour chaque corps de métier. Une barre verte signale un lot dont l&apos;enveloppe est consommée.</Def>
        </dl>
      </section>

      {/* FAQ */}
      <section style={{ ...CARD, marginBottom: SECTION_GAP }}>
        <div style={CARD_TITLE}>Questions fréquentes</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {FAQ.map(({ q, a }, i) => (
            <details key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--nm-base-sunken)" }}>
              <summary style={{ cursor: "pointer", padding: "14px 0", fontSize: 13, fontWeight: 500, color: "var(--nm-text-secondary)", listStyle: "revert" }}>
                {q}
              </summary>
              <p style={{ ...P, padding: "0 0 16px 18px" }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Bonnes pratiques */}
      <section style={CARD}>
        <div style={CARD_TITLE}>Quelques réflexes utiles</div>
        <ul style={{ display: "flex", flexDirection: "column", gap: 11, paddingLeft: 18 }}>
          {[
            "Importez le devis avant la première facture du même artisan : sans devis de référence, aucune comparaison n'est possible.",
            "Relisez systématiquement une extraction avant de vous fier aux totaux. Une ligne mal lue fausse tout le suivi budgétaire.",
            "Préférez le PDF d'origine à une photo ou un scan reprographié : plus le document est net, meilleure est l'extraction.",
            "Joignez les bons de livraison et PV de réception à la facture concernée — tout reste au même endroit le jour où il faut contester une ligne.",
          ].map((t) => (
            <li key={t} style={{ ...P, listStyleType: "disc" }}>{t}</li>
          ))}
        </ul>
        <p style={{ ...MONO, marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--nm-base-sunken)" }}>
          Une question sans réponse ici ? Les écrans <A href="/devis">Devis</A> et <A href="/factures">Factures</A> conservent
          la trace complète de chaque analyse, PDF d&apos;origine inclus.
        </p>
      </section>
    </div>
  );
}

// ─── petits helpers de présentation ──────────────────────────────────────────

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: "var(--nm-accent)", textDecoration: "none", fontWeight: 500 }}>{children}</Link>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "var(--nm-text-secondary)", fontWeight: 600 }}>{children}</strong>;
}

function Statut({ label, bg, color, children }: { label: string; bg: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "var(--font-jetbrains-mono)", background: bg, color, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
        {label}
      </span>
      <p style={P}>{children}</p>
    </div>
  );
}

function Def({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ fontSize: 12, fontWeight: 600, color: "var(--nm-text-secondary)" }}>{term}</dt>
      <dd style={P}>{children}</dd>
    </>
  );
}
