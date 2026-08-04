using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public interface IExtractionService
{
    Task<Devis> CreateDevisEntryAsync(byte[] pdfData, string pdfNom, int userId);
    void StartDevisExtraction(int devisId, ExtractionMode mode);
    Task<Facture> CreateFactureEntryAsync(byte[] pdfData, string pdfNom, int userId, int? devisId);
    void StartFactureExtraction(int factureId, ExtractionMode mode);
}

public class ExtractionService(
    AppDbContext db,
    IServiceScopeFactory scopeFactory,
    ISettingsStore settingsStore,
    ILogger<ExtractionService> logger) : IExtractionService
{
    // ponytail: seuil heuristique, ajuster si des PDF natifs peu denses basculent à tort en image
    private const int MinTextChars = 50;

    private const string DevisSystemPrompt = """
        You are a document data extraction assistant. You receive the pages of a French construction quote (devis), either as images or as extracted text, and must return ONLY valid JSON, with no markdown, no explanation, no code fences.

        Return this exact schema:
        {
          "entreprise": {
            "nom": "",
            "siret": null,
            "contact_nom": null,
            "contact_tel": null,
            "contact_email": null,
            "adresse": null
          },
          "devis": {
            "numero": null,
            "lot": null,
            "type_lot": null,
            "date_devis": null,
            "date_validite": null,
            "delai_execution": null,
            "tva_taux": null,
            "total_ht": null,
            "tva_montant": null,
            "total_ttc": null
          },
          "lignes": [
            {
              "ordre": 1,
              "description": "",
              "quantite": null,
              "unite": null,
              "prix_unitaire": null,
              "total_ligne": null
            }
          ]
        }

        Rules:
        - All monetary values are numbers (no currency symbols).
        - "total_ttc" is the final amount including tax (TTC / "Net à payer" / "Total TTC") for the whole document. If several totals appear, take the grand total, not a subtotal or an intermediate page total.
        - "total_ht" is the total before tax (HT / "Total HT") for the whole document, and "tva_montant" is the total VAT amount (montant de TVA). Read them directly from the document — do not compute them yourself.
        - "total_ht", "tva_montant" and "total_ttc" must be rounded to exactly 2 decimal places.
        - Dates are ISO 8601 (YYYY-MM-DD).
        - If a field is absent, use null — never omit the key.
        - "type_lot" must be exactly one of these values (or null if none clearly applies): TERRASSEMENT_VRD, GROS_OEUVRE, CHARPENTE_COUVERTURE, MENUISERIE, PLATRERIE, PLOMBERIE_SANITAIRE, ELECTRICITE, ISOLATION_AU_SOL, CHAUFFAGE, CHAPE_LIQUIDE, CARRELAGE, ISOLATION_DES_COMBLES, FACADES, PERMIS, MAITRISE_OEUVRE.
        - Return JSON only. No other text.
        """;

    private const string FactureSystemPrompt = """
        You are a document data extraction assistant. You receive the pages of a French construction invoice (facture), either as images or as extracted text, and must return ONLY valid JSON, with no markdown, no explanation, no code fences.

        Return this exact schema:
        {
          "entreprise": {
            "nom": "",
            "siret": null,
            "contact_nom": null,
            "contact_tel": null,
            "contact_email": null,
            "adresse": null
          },
          "facture": {
            "numero": null,
            "type_lot": null,
            "date_facture": null,
            "date_echeance": null,
            "tva_taux": null,
            "total_ht": null,
            "tva_montant": null,
            "total_ttc": null
          },
          "lignes": [
            {
              "ordre": 1,
              "description": "",
              "quantite": null,
              "unite": null,
              "prix_unitaire": null,
              "total_ligne": null
            }
          ]
        }

        Rules:
        - All monetary values are numbers (no currency symbols).
        - "total_ttc" is the final amount including tax (TTC / "Net à payer" / "Total TTC") for the whole document. If several totals appear, take the grand total, not a subtotal or an intermediate page total.
        - "total_ht" is the total before tax (HT / "Total HT") for the whole document, and "tva_montant" is the total VAT amount (montant de TVA). Read them directly from the document — do not compute them yourself.
        - "total_ht", "tva_montant" and "total_ttc" must be rounded to exactly 2 decimal places.
        - Dates are ISO 8601 (YYYY-MM-DD).
        - If a field is absent, use null — never omit the key.
        - "type_lot" must be exactly one of these values (or null if none clearly applies): TERRASSEMENT_VRD, GROS_OEUVRE, CHARPENTE_COUVERTURE, MENUISERIE, PLATRERIE, PLOMBERIE_SANITAIRE, ELECTRICITE, ISOLATION_AU_SOL, CHAUFFAGE, CHAPE_LIQUIDE, CARRELAGE, ISOLATION_DES_COMBLES, FACADES, PERMIS, MAITRISE_OEUVRE.
        - Return JSON only. No other text.
        """;

    public async Task<Devis> CreateDevisEntryAsync(byte[] pdfData, string pdfNom, int userId)
    {
        var devis = new Devis
        {
            UserId = userId,
            FichierPdfData = pdfData,
            FichierPdfNom = pdfNom,
            Statut = StatutExtraction.EnAttente
        };
        db.Devis.Add(devis);
        await db.SaveChangesAsync();
        return devis;
    }

    public void StartDevisExtraction(int devisId, ExtractionMode mode)
    {
        _ = Task.Run(() => RunDevisExtractionAsync(devisId, mode));
    }

    private async Task RunDevisExtractionAsync(int devisId, ExtractionMode mode)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pdfImageService = scope.ServiceProvider.GetRequiredService<IPdfImageService>();
        var openRouterService = scope.ServiceProvider.GetRequiredService<IOpenRouterService>();

        var devis = await db.Devis.FirstOrDefaultAsync(d => d.Id == devisId);
        if (devis == null || devis.FichierPdfData == null) return;
        var pdfData = devis.FichierPdfData;

        try
        {
            // Mode texte : extraire la couche texte ; si vide/scanné -> fallback image.
            List<string> textPages = [];
            if (mode == ExtractionMode.Texte)
            {
                try { textPages = pdfImageService.ExtractTextPages(pdfData); }
                catch (Exception ex) { logger.LogWarning(ex, "Extraction texte échouée pour devis {DevisId}, fallback image", devisId); }

                if (textPages.Sum(p => p.Count(c => !char.IsWhiteSpace(c))) < MinTextChars)
                {
                    logger.LogInformation("Devis {DevisId} : couche texte insuffisante, fallback en mode image", devisId);
                    mode = ExtractionMode.Image;
                }
            }

            var images = mode == ExtractionMode.Image
                ? await pdfImageService.ConvertToImagesAsync(pdfData)
                : [];
            var pageCount = mode == ExtractionMode.Image ? images.Count : textPages.Count;

            // send pages in batches of 4 to avoid context overflow
            var allLignes = new List<JsonNode>();
            var rawResponses = new List<string>();
            JsonNode? lastDevisNode = null;
            JsonNode? entrepriseNode = null;

            for (int i = 0; i < pageCount; i += 4)
            {
                using var _ = logger.BeginScope("DevisId={DevisId} Batch={Batch}", devisId, i / 4 + 1);
                var userPrompt = $"Extract all data from the following page(s) of a French construction quote (devis).";
                LlmCallResult call;
                int nbPages;
                if (mode == ExtractionMode.Image)
                {
                    var batch = images.Skip(i).Take(4).ToList();
                    nbPages = batch.Count;
                    call = await openRouterService.ExtractStructuredJsonAsync(batch, DevisSystemPrompt, userPrompt);
                }
                else
                {
                    var batch = textPages.Skip(i).Take(4).ToList();
                    nbPages = batch.Count;
                    call = await openRouterService.ExtractStructuredJsonFromTextAsync(batch, DevisSystemPrompt, userPrompt);
                }
                rawResponses.Add(call.Content);

                db.LlmExchanges.Add(new LlmExchange
                {
                    TypeDocument = TypeDocument.Devis,
                    DocumentId   = devis.Id,
                    Batch        = i / 4 + 1,
                    Modele       = settingsStore.OpenRouter.Model,
                    SystemPrompt = DevisSystemPrompt,
                    UserPrompt   = userPrompt,
                    NbImages     = mode == ExtractionMode.Image ? nbPages : 0,
                    ReponseBrute = call.Content,
                    DureeMs      = call.DureeMs,
                    Succes       = call.Succes,
                    Erreur       = call.Erreur,
                });

                var parsed = call.Succes ? ParseJson(call.Content) : null;
                if (parsed != null)
                {
                    if (i == 0) entrepriseNode = parsed["entreprise"];
                    // ponytail: on ne remplace le noeud devis que si le batch apporte un TTC,
                    // sinon un dernier batch sans bloc total ecraserait le montant deja trouve.
                    var devisNode = parsed["devis"];
                    if (lastDevisNode == null || devisNode?["total_ttc"] is not null)
                        lastDevisNode = devisNode;
                    if (parsed["lignes"] is JsonArray lignesArr)
                        allLignes.AddRange(lignesArr.OfType<JsonNode>());
                }
            }

            devis.ExtractionBrute = JsonSerializer.Serialize(new { entreprise = entrepriseNode, devis = lastDevisNode, lignes = allLignes });
            // réponse(s) LLM telle(s) quelle(s), avant parsing — un batch par bloc
            devis.ReponseBrute = string.Join("\n\n---\n\n", rawResponses);

            if (entrepriseNode != null)
            {
                var entreprise = await EntrepriseResolver.ResolveAsync(
                    db,
                    devis.UserId,
                    nom: ParseString(entrepriseNode["nom"]),
                    siret: ParseString(entrepriseNode["siret"]),
                    contactNom: ParseString(entrepriseNode["contact_nom"]),
                    contactTel: ParseString(entrepriseNode["contact_tel"]),
                    contactEmail: ParseString(entrepriseNode["contact_email"]),
                    adresse: ParseString(entrepriseNode["adresse"]));

                devis.EntrepriseId = entreprise?.Id;
            }

            if (lastDevisNode != null)
            {
                devis.NumeroDevis = await FreeOrNullAsync(
                    ParseString(lastDevisNode["numero"]),
                    n => db.Devis.AnyAsync(d => d.UserId == devis.UserId
                        && d.EntrepriseId == devis.EntrepriseId
                        && d.NumeroDevis == n
                        && d.Id != devis.Id));
                devis.Lot = ParseString(lastDevisNode["lot"]);
                devis.TypeLot = ParseTypeLot(ParseString(lastDevisNode["type_lot"]));
                devis.DateDevis = ParseDate(ParseString(lastDevisNode["date_devis"]));
                devis.DateValidite = ParseDate(ParseString(lastDevisNode["date_validite"]));
                devis.DelaiExecution = ParseString(lastDevisNode["delai_execution"]);
                devis.TvaTaux = ParseDecimal(lastDevisNode["tva_taux"]);
            }

            var lignes = allLignes
                .OfType<JsonObject>()
                .Select((l, idx) => new LignePoste
                {
                    DevisId = devis.Id,
                    Ordre = ParseInt(l["ordre"]) ?? idx + 1,
                    Description = ParseString(l["description"]) ?? string.Empty,
                    Quantite = ParseDecimal(l["quantite"]),
                    Unite = ParseString(l["unite"]),
                    PrixUnitaire = ParseDecimal(l["prix_unitaire"]),
                    TotalLigne = ParseDecimal(l["total_ligne"])
                })
                .Where(l => !string.IsNullOrWhiteSpace(l.Description))
                .ToList();

            db.LignesPoste.AddRange(lignes);
            devis.Lignes = lignes;

            // total_ht, tva_montant et total_ttc viennent tous du LLM tels quels, aucun recalcul.
            if (lastDevisNode != null)
            {
                devis.TotalHt = ParseDecimal(lastDevisNode["total_ht"]);
                devis.TvaMontant = ParseDecimal(lastDevisNode["tva_montant"]);
                devis.TotalTtc = ParseDecimal(lastDevisNode["total_ttc"]);
            }

            // aucune donnée exploitable => réponse LLM vide ou tronquée (souvent contexte trop court)
            devis.Statut = (lignes.Count == 0 && lastDevisNode == null && entrepriseNode == null)
                ? StatutExtraction.Erreur
                : StatutExtraction.Extrait;
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Extraction failed for devis {DevisId}", devisId);
            devis.Statut = StatutExtraction.Erreur;
            await db.SaveChangesAsync();
        }
    }

    public async Task<Facture> CreateFactureEntryAsync(byte[] pdfData, string pdfNom, int userId, int? devisId)
    {
        var facture = new Facture
        {
            UserId = userId,
            FichierPdfData = pdfData,
            FichierPdfNom = pdfNom,
            Statut = StatutExtraction.EnAttente,
            DevisId = devisId
        };
        db.Factures.Add(facture);
        await db.SaveChangesAsync();
        return facture;
    }

    public void StartFactureExtraction(int factureId, ExtractionMode mode)
    {
        _ = Task.Run(() => RunFactureExtractionAsync(factureId, mode));
    }

    private async Task RunFactureExtractionAsync(int factureId, ExtractionMode mode)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pdfImageService = scope.ServiceProvider.GetRequiredService<IPdfImageService>();
        var openRouterService = scope.ServiceProvider.GetRequiredService<IOpenRouterService>();

        var facture = await db.Factures.FirstOrDefaultAsync(f => f.Id == factureId);
        if (facture == null || facture.FichierPdfData == null) return;
        var pdfData = facture.FichierPdfData;

        try
        {
            // Mode texte : extraire la couche texte ; si vide/scanné -> fallback image.
            List<string> textPages = [];
            if (mode == ExtractionMode.Texte)
            {
                try { textPages = pdfImageService.ExtractTextPages(pdfData); }
                catch (Exception ex) { logger.LogWarning(ex, "Extraction texte échouée pour facture {FactureId}, fallback image", factureId); }

                if (textPages.Sum(p => p.Count(c => !char.IsWhiteSpace(c))) < MinTextChars)
                {
                    logger.LogInformation("Facture {FactureId} : couche texte insuffisante, fallback en mode image", factureId);
                    mode = ExtractionMode.Image;
                }
            }

            var images = mode == ExtractionMode.Image
                ? await pdfImageService.ConvertToImagesAsync(pdfData)
                : [];
            var pageCount = mode == ExtractionMode.Image ? images.Count : textPages.Count;

            var allLignes = new List<JsonNode>();
            var rawResponses = new List<string>();
            JsonNode? lastFactureNode = null;
            JsonNode? entrepriseNode = null;

            for (int i = 0; i < pageCount; i += 4)
            {
                using var _ = logger.BeginScope("FactureId={FactureId} Batch={Batch}", factureId, i / 4 + 1);
                var userPrompt = $"Extract all data from the following page(s) of a French construction invoice (facture).";
                LlmCallResult call;
                int nbPages;
                if (mode == ExtractionMode.Image)
                {
                    var batch = images.Skip(i).Take(4).ToList();
                    nbPages = batch.Count;
                    call = await openRouterService.ExtractStructuredJsonAsync(batch, FactureSystemPrompt, userPrompt);
                }
                else
                {
                    var batch = textPages.Skip(i).Take(4).ToList();
                    nbPages = batch.Count;
                    call = await openRouterService.ExtractStructuredJsonFromTextAsync(batch, FactureSystemPrompt, userPrompt);
                }
                rawResponses.Add(call.Content);

                db.LlmExchanges.Add(new LlmExchange
                {
                    TypeDocument = TypeDocument.Facture,
                    DocumentId   = facture.Id,
                    Batch        = i / 4 + 1,
                    Modele       = settingsStore.OpenRouter.Model,
                    SystemPrompt = FactureSystemPrompt,
                    UserPrompt   = userPrompt,
                    NbImages     = mode == ExtractionMode.Image ? nbPages : 0,
                    ReponseBrute = call.Content,
                    DureeMs      = call.DureeMs,
                    Succes       = call.Succes,
                    Erreur       = call.Erreur,
                });

                var parsed = call.Succes ? ParseJson(call.Content) : null;
                if (parsed != null)
                {
                    if (i == 0) entrepriseNode = parsed["entreprise"];
                    // ponytail: on ne remplace le noeud facture que si le batch apporte un TTC,
                    // sinon un dernier batch sans bloc total ecraserait le montant deja trouve.
                    var factureNode = parsed["facture"];
                    if (lastFactureNode == null || factureNode?["total_ttc"] is not null)
                        lastFactureNode = factureNode;
                    if (parsed["lignes"] is JsonArray lignesArr)
                        allLignes.AddRange(lignesArr.OfType<JsonNode>());
                }
            }

            facture.ExtractionBrute = JsonSerializer.Serialize(new { entreprise = entrepriseNode, facture = lastFactureNode, lignes = allLignes });
            // réponse(s) LLM telle(s) quelle(s), avant parsing — un batch par bloc
            facture.ReponseBrute = string.Join("\n\n---\n\n", rawResponses);

            if (entrepriseNode != null)
            {
                var entreprise = await EntrepriseResolver.ResolveAsync(
                    db,
                    facture.UserId,
                    nom: ParseString(entrepriseNode["nom"]),
                    siret: ParseString(entrepriseNode["siret"]),
                    contactNom: ParseString(entrepriseNode["contact_nom"]),
                    contactTel: ParseString(entrepriseNode["contact_tel"]),
                    contactEmail: ParseString(entrepriseNode["contact_email"]),
                    adresse: ParseString(entrepriseNode["adresse"]));

                facture.EntrepriseId = entreprise?.Id;
            }

            if (lastFactureNode != null)
            {
                facture.NumeroFacture = await FreeOrNullAsync(
                    ParseString(lastFactureNode["numero"]),
                    n => db.Factures.AnyAsync(f => f.UserId == facture.UserId
                        && f.EntrepriseId == facture.EntrepriseId
                        && f.NumeroFacture == n
                        && f.Id != facture.Id));
                facture.TypeLot = ParseTypeLot(ParseString(lastFactureNode["type_lot"]));
                facture.DateFacture = ParseDate(ParseString(lastFactureNode["date_facture"]));
                facture.DateEcheance = ParseDate(ParseString(lastFactureNode["date_echeance"]));
                facture.TvaTaux = ParseDecimal(lastFactureNode["tva_taux"]);
            }

            var lignes = allLignes
                .OfType<JsonObject>()
                .Select((l, idx) => new LigneFacture
                {
                    FactureId = facture.Id,
                    Ordre = ParseInt(l["ordre"]) ?? idx + 1,
                    Description = ParseString(l["description"]) ?? string.Empty,
                    Quantite = ParseDecimal(l["quantite"]),
                    Unite = ParseString(l["unite"]),
                    PrixUnitaire = ParseDecimal(l["prix_unitaire"]),
                    TotalLigne = ParseDecimal(l["total_ligne"])
                })
                .Where(l => !string.IsNullOrWhiteSpace(l.Description))
                .ToList();

            db.LignesFacture.AddRange(lignes);
            facture.Lignes = lignes;

            // total_ht, tva_montant et total_ttc viennent tous du LLM tels quels, aucun recalcul.
            if (lastFactureNode != null)
            {
                facture.TotalHt = ParseDecimal(lastFactureNode["total_ht"]);
                facture.TvaMontant = ParseDecimal(lastFactureNode["tva_montant"]);
                facture.TotalTtc = ParseDecimal(lastFactureNode["total_ttc"]);
            }

            // aucune donnée exploitable => réponse LLM vide ou tronquée (souvent contexte trop court)
            facture.Statut = (lignes.Count == 0 && lastFactureNode == null && entrepriseNode == null)
                ? StatutExtraction.Erreur
                : StatutExtraction.Extrait;
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Extraction failed for facture {FactureId}", factureId);
            facture.Statut = StatutExtraction.Erreur;
            await db.SaveChangesAsync();
        }
    }

    // Le numero vient du LLM : il peut deja exister (reimport du meme PDF, numero mal lu).
    // L'index unique ferait planter tout le SaveChanges et perdrait l'extraction entiere,
    // donc on prefere garder le document sans numero.
    // ponytail: on ne desambigue pas (pas de suffixe "-2"), l'utilisateur corrige a la main si besoin.
    private static async Task<string?> FreeOrNullAsync(string? numero, Func<string, Task<bool>> dejaPris)
        => string.IsNullOrWhiteSpace(numero) || await dejaPris(numero) ? null : numero;

    private static JsonNode? ParseJson(string raw)
    {
        var cleaned = raw.Trim();
        // strip markdown code fences if present
        cleaned = Regex.Replace(cleaned, @"^```[a-z]*\s*", "", RegexOptions.Multiline);
        cleaned = Regex.Replace(cleaned, @"```\s*$", "", RegexOptions.Multiline);
        cleaned = cleaned.Trim();

        JsonNode? node;
        try { node = ParseViaDocument(cleaned); }
        catch
        {
            // try to extract first {...} block
            var match = Regex.Match(cleaned, @"\{[\s\S]*\}");
            node = null;
            if (match.Success)
            {
                try { node = ParseViaDocument(match.Value); }
                catch { /* on tente la réparation ci-dessous */ }
            }
            // réponse LLM tronquée (contexte insuffisant) : ferme les crochets/accolades
            // ouverts pour récupérer au moins les lignes complètes avant la coupure
            node ??= TryRepairTruncatedJson(cleaned);
        }

        return node;
    }

    // JsonNode.Parse accepte un objet JSON avec des clés dupliquées, mais lève une
    // ArgumentException dès le premier accès indexeur (JsonObject.InitializeDictionary).
    // On passe donc par JsonDocument (tolérant) et on reconstruit nous-mêmes le JsonNode,
    // en ne gardant que la dernière valeur par clé — même comportement que System.Text.Json standard.
    private static JsonNode? ParseViaDocument(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return FromElement(doc.RootElement);
    }

    private static JsonNode? FromElement(JsonElement el)
    {
        switch (el.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new JsonObject();
                foreach (var prop in el.EnumerateObject())
                    obj[prop.Name] = FromElement(prop.Value);
                return obj;
            case JsonValueKind.Array:
                var arr = new JsonArray();
                foreach (var item in el.EnumerateArray())
                    arr.Add(FromElement(item));
                return arr;
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                return null;
            default:
                // JsonValue.Create(el) garde une référence lazy vers le JsonDocument source ;
                // Clone() détache l'élément pour qu'il survive au Dispose() du JsonDocument (using).
                return JsonValue.Create(el.Clone());
        }
    }

    private static JsonNode? TryRepairTruncatedJson(string s)
    {
        var start = s.IndexOf('{');
        if (start < 0) return null;
        s = s[start..];

        // supprime une dernière entrée incomplète : coupe après le dernier séparateur propre
        var lastComplete = s.LastIndexOfAny(['}', ']']);
        if (lastComplete < 0) return null;
        s = s[..(lastComplete + 1)];

        // rééquilibre les ouvrants restants, en respectant les chaînes
        var stack = new Stack<char>();
        bool inString = false, escaped = false;
        foreach (var c in s)
        {
            if (escaped) { escaped = false; continue; }
            if (c == '\\') { escaped = true; continue; }
            if (c == '"') { inString = !inString; continue; }
            if (inString) continue;
            if (c is '{' or '[') stack.Push(c);
            else if (c is '}' or ']' && stack.Count > 0) stack.Pop();
        }
        var sb = new StringBuilder(s.TrimEnd().TrimEnd(','));
        foreach (var open in stack)
            sb.Append(open == '{' ? '}' : ']');

        try { return ParseViaDocument(sb.ToString()); }
        catch { return null; }
    }

    private static TypeLot? ParseTypeLot(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim().Replace("_", "").Replace(" ", "").Replace("'", "");
        foreach (var t in Enum.GetValues<TypeLot>())
            if (t.ToString().Equals(normalized, StringComparison.OrdinalIgnoreCase))
                return t;
        return null;
    }

    private static DateOnly? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateOnly.TryParse(value, out var d) ? d : null;
    }

    private static decimal? ParseDecimal(JsonNode? node)
    {
        if (node == null) return null;
        try { return node.GetValue<decimal>(); }
        catch
        {
            // le LLM renvoie parfois un nombre en texte (virgule française, espaces, %) au lieu d'un JSON number
            var s = ParseString(node);
            if (string.IsNullOrWhiteSpace(s)) return null;
            s = s.Replace(" ", "").Replace(" ", "").Replace("%", "").Replace(".", "").Replace(",", ".");
            return decimal.TryParse(s, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
        }
    }

    private static int? ParseInt(JsonNode? node)
    {
        if (node == null) return null;
        try { return node.GetValue<int>(); }
        catch
        {
            var s = ParseString(node);
            return int.TryParse(s, out var i) ? i : null;
        }
    }

    private static string? ParseString(JsonNode? node)
    {
        if (node == null) return null;
        try { return node.GetValue<string>(); }
        catch
        {
            // le champ attendu en string arrive parfois en number/bool selon l'humeur du LLM
            try { return node.ToJsonString().Trim('"'); }
            catch { return null; }
        }
    }
}
