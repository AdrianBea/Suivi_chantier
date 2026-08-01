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
                    nom: entrepriseNode["nom"]?.GetValue<string>(),
                    siret: entrepriseNode["siret"]?.GetValue<string>(),
                    contactNom: entrepriseNode["contact_nom"]?.GetValue<string>(),
                    contactTel: entrepriseNode["contact_tel"]?.GetValue<string>(),
                    contactEmail: entrepriseNode["contact_email"]?.GetValue<string>(),
                    adresse: entrepriseNode["adresse"]?.GetValue<string>());

                devis.EntrepriseId = entreprise?.Id;
            }

            if (lastDevisNode != null)
            {
                devis.NumeroDevis = lastDevisNode["numero"]?.GetValue<string>();
                devis.Lot = lastDevisNode["lot"]?.GetValue<string>();
                devis.TypeLot = ParseTypeLot(lastDevisNode["type_lot"]?.GetValue<string>());
                devis.DateDevis = ParseDate(lastDevisNode["date_devis"]?.GetValue<string>());
                devis.DateValidite = ParseDate(lastDevisNode["date_validite"]?.GetValue<string>());
                devis.DelaiExecution = lastDevisNode["delai_execution"]?.GetValue<string>();
                devis.TvaTaux = ParseDecimal(lastDevisNode["tva_taux"]);
            }

            var lignes = allLignes
                .Select((l, idx) => new LignePoste
                {
                    DevisId = devis.Id,
                    Ordre = l["ordre"]?.GetValue<int>() ?? idx + 1,
                    Description = l["description"]?.GetValue<string>() ?? string.Empty,
                    Quantite = ParseDecimal(l["quantite"]),
                    Unite = l["unite"]?.GetValue<string>(),
                    PrixUnitaire = ParseDecimal(l["prix_unitaire"]),
                    TotalLigne = ParseDecimal(l["total_ligne"])
                })
                .Where(l => !string.IsNullOrWhiteSpace(l.Description))
                .ToList();

            db.LignesPoste.AddRange(lignes);
            devis.Lignes = lignes;

            // seul le TTC vient du LLM, source de vérité ; HT et montant de TVA se saisissent à la main.
            if (lastDevisNode != null)
                devis.TotalTtc = ParseDecimal(lastDevisNode["total_ttc"]);

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
                    nom: entrepriseNode["nom"]?.GetValue<string>(),
                    siret: entrepriseNode["siret"]?.GetValue<string>(),
                    contactNom: entrepriseNode["contact_nom"]?.GetValue<string>(),
                    contactTel: entrepriseNode["contact_tel"]?.GetValue<string>(),
                    contactEmail: entrepriseNode["contact_email"]?.GetValue<string>(),
                    adresse: entrepriseNode["adresse"]?.GetValue<string>());

                facture.EntrepriseId = entreprise?.Id;
            }

            if (lastFactureNode != null)
            {
                facture.NumeroFacture = lastFactureNode["numero"]?.GetValue<string>();
                facture.TypeLot = ParseTypeLot(lastFactureNode["type_lot"]?.GetValue<string>());
                facture.DateFacture = ParseDate(lastFactureNode["date_facture"]?.GetValue<string>());
                facture.DateEcheance = ParseDate(lastFactureNode["date_echeance"]?.GetValue<string>());
                facture.TvaTaux = ParseDecimal(lastFactureNode["tva_taux"]);
            }

            var lignes = allLignes
                .Select((l, idx) => new LigneFacture
                {
                    FactureId = facture.Id,
                    Ordre = l["ordre"]?.GetValue<int>() ?? idx + 1,
                    Description = l["description"]?.GetValue<string>() ?? string.Empty,
                    Quantite = ParseDecimal(l["quantite"]),
                    Unite = l["unite"]?.GetValue<string>(),
                    PrixUnitaire = ParseDecimal(l["prix_unitaire"]),
                    TotalLigne = ParseDecimal(l["total_ligne"])
                })
                .Where(l => !string.IsNullOrWhiteSpace(l.Description))
                .ToList();

            db.LignesFacture.AddRange(lignes);
            facture.Lignes = lignes;

            // seul le TTC vient du LLM, source de vérité ; HT et montant de TVA se saisissent à la main.
            if (lastFactureNode != null)
                facture.TotalTtc = ParseDecimal(lastFactureNode["total_ttc"]);

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

    private static JsonNode? ParseJson(string raw)
    {
        var cleaned = raw.Trim();
        // strip markdown code fences if present
        cleaned = Regex.Replace(cleaned, @"^```[a-z]*\s*", "", RegexOptions.Multiline);
        cleaned = Regex.Replace(cleaned, @"```\s*$", "", RegexOptions.Multiline);
        cleaned = cleaned.Trim();

        try { return JsonNode.Parse(cleaned); }
        catch
        {
            // try to extract first {...} block
            var match = Regex.Match(cleaned, @"\{[\s\S]*\}");
            if (match.Success)
            {
                try { return JsonNode.Parse(match.Value); }
                catch { /* on tente la réparation ci-dessous */ }
            }
            // réponse LLM tronquée (contexte insuffisant) : ferme les crochets/accolades
            // ouverts pour récupérer au moins les lignes complètes avant la coupure
            return TryRepairTruncatedJson(cleaned);
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

        try { return JsonNode.Parse(sb.ToString()); }
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
        catch { return null; }
    }
}
