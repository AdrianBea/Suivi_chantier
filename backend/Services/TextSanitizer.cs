using System.Text.RegularExpressions;

namespace backend.Services;

/// <summary>
/// Masque les coordonnées bancaires du texte des PDF avant envoi au LLM.
/// Le filtre de contenu d'OpenRouter rejette la requête (HTTP 403 [CREDIT_CARD]) quand
/// le pavé de règlement d'une facture ressemble à un numéro de carte. Ces données ne
/// servent pas à l'extraction (entreprise, totaux, lignes), on les retire donc en amont.
/// </summary>
public static partial class TextSanitizer
{
    public const string Masque = "[MASQUE]";

    // PdfPig restitue les coordonnées bancaires tantôt collées, tantôt en groupes de 4 :
    // les motifs acceptent ces deux formes, mais pas un espacement arbitraire, sinon ils
    // mordent sur le texte libre des lignes de devis.

    // IBAN. Deux formes acceptées, réunies par une alternative :
    //   - collée      : FR7630004008280001234567890
    //   - en groupes  : FR76 3000 4008 2800 0123 4567 890
    // Un motif laissant les espaces libres partout avalait des descriptions de lignes
    // ("de 12 m2 de carrelage" : DE + 12 + suite alphanumérique), car DE/IT/AT/PL sont
    // aussi des mots français courants. Exiger soit aucun espace, soit un découpage
    // régulier par blocs de 4, écarte le texte libre sans rater d'IBAN réel.
    [GeneratedRegex(
        @"\b(?:FR|BE|LU|CH|DE|ES|IT|PT|NL|GB|IE|AT|PL|MC|AD)\d{2}(?:[A-Z0-9]{11,30}|(?:[ -][A-Z0-9]{4}){2,7}(?:[ -][A-Z0-9]{1,4})?)\b",
        RegexOptions.IgnoreCase)]
    private static partial Regex Iban();

    // Carte / RIB : 13 à 19 chiffres écrits en groupes de 4. Le groupage est ce qui
    // distingue une carte d'un SIRET (14 chiffres d'un bloc), qu'il faut préserver
    // car il alimente EntrepriseResolver.
    [GeneratedRegex(@"\b\d{4}(?:[ -]\d{4}){2,3}(?:[ -]\d{1,3})?\b")]
    private static partial Regex Carte();

    // BIC : uniquement s'il est explicitement libellé, sinon le motif attraperait
    // n'importe quel mot de 8 caractères.
    [GeneratedRegex(@"\b(?:BIC|SWIFT)\b\s*:?\s*[A-Z0-9]{8}(?:[A-Z0-9]{3})?\b", RegexOptions.IgnoreCase)]
    private static partial Regex Bic();

    public static string Masquer(string texte)
    {
        if (string.IsNullOrEmpty(texte)) return texte;

        // BIC en premier : sinon un IBAN qui le précède consomme le mot-clé "BIC"
        // et laisse le code nu derrière lui.
        texte = Bic().Replace(texte, Masque);
        texte = Iban().Replace(texte, Masque);
        texte = Carte().Replace(texte, Masque);
        return texte;
    }

#if DEBUG
    // ponytail: auto-test au lieu d'un projet de test — il n'y en a pas dans la solution.
    // Appelé au démarrage en DEBUG ; à migrer vers xUnit si une suite de tests apparaît.
    internal static void Demo()
    {
        // On exige qu'aucun chiffre du secret ne subsiste : un motif qui s'arrête trop tôt
        // laisserait la fin de l'IBAN en clair tout en insérant [MASQUE].
        void Masque_(string entree)
        {
            var sortie = Masquer(entree);
            System.Diagnostics.Debug.Assert(
                sortie.Contains(Masque) && !sortie.Replace(Masque, "").Any(char.IsDigit),
                $"aurait dû être entièrement masqué : {entree} -> {sortie}");
        }

        void Intact_(string entree) => System.Diagnostics.Debug.Assert(
            Masquer(entree) == entree, $"aurait dû rester intact : {entree} -> {Masquer(entree)}");

        Masque_("IBAN FR76 3000 4008 2800 0123 4567 890");
        Masque_("IBAN: FR7630004008280001234567890");
        Masque_("4970 1234 5678 9012");
        Masque_("4970-1234-5678-9012");
        Masque_("BIC : BNPAFRPPXXX");
        Masque_("BIC BNPAFRPPXXX");
        Masque_("FR76 3000 4008 2800 0123 4567 890");

        Intact_("SIRET 12345678901234");
        Intact_("SIREN 123456789");
        Intact_("Total TTC 12 345,67 EUR");
        Intact_("Devis n° 2024-00123");
        Intact_("TVA 20 %");
        Intact_("Tel 06 12 34 56 78");
        // régression : un motif IBAN trop permissif avalait ces descriptions de lignes.
        Intact_("Fourniture et pose de 12 m2 de carrelage");
        Intact_("Pose de 25 ml de plinthes");
    }
#endif
}
