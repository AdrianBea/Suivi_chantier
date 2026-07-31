using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public interface IComparaisonService
{
    Task<ComparaisonDto> CompareAsync(int factureId);
}

public class ComparaisonService(AppDbContext db) : IComparaisonService
{
    public async Task<ComparaisonDto> CompareAsync(int factureId)
    {
        var facture = await db.Factures
            .Include(f => f.Lignes)
            .Include(f => f.Devis).ThenInclude(d => d!.Lignes)
            .Include(f => f.Devis).ThenInclude(d => d!.Factures)
            .Include(f => f.Entreprise)
            .FirstOrDefaultAsync(f => f.Id == factureId)
            ?? throw new KeyNotFoundException($"Facture {factureId} introuvable.");

        if (facture.DevisId == null)
            throw new InvalidOperationException("Cette facture n'est pas liée à un devis.");

        var devis = facture.Devis!;
        var devisLignes = devis.Lignes.ToList();

        // Cumul HT des autres factures liées au même devis (acomptes déjà émis)
        var montantDejaFacture = devis.Factures
            .Where(f => f.Id != factureId)
            .Sum(f => f.TotalHt ?? 0);
        var resteAFacturer = (devis.TotalHt ?? 0) - montantDejaFacture;

        facture.Statut = StatutExtraction.Extrait;
        await db.SaveChangesAsync();

        var ecartTotalHt = (facture.TotalHt ?? 0) - (devis.TotalHt ?? 0);

        // Mode "Total" si la facture ne contient pas de lignes détaillées
        if (!facture.Lignes.Any())
        {
            return new ComparaisonDto
            {
                FactureId = facture.Id,
                DevisId = facture.DevisId.Value,
                EntrepriseNom = facture.Entreprise?.Nom ?? "—",
                TotalHtDevis = devis.TotalHt,
                TotalHtFacture = facture.TotalHt,
                EcartTotalHt = ecartTotalHt,
                HasDiscrepancies = Math.Abs(ecartTotalHt) > 0.01m,
                ModeComparaison = "Total",
                MontantDejaFacture = montantDejaFacture,
                ResteAFacturer = resteAFacturer,
                Lignes = []
            };
        }

        // Mode "Lignes" : matching Levenshtein, écarts calculés à la volée (non persistés)
        var matchings = facture.Lignes.Select(lf =>
        {
            var match = FindBestMatch(lf.Description, devisLignes);
            if (match != null)
                lf.LignePosteId = match.Id;
            else
                lf.LignePosteId = null;
            return (lf, match);
        }).ToList();

        await db.SaveChangesAsync();

        return new ComparaisonDto
        {
            FactureId = facture.Id,
            DevisId = facture.DevisId.Value,
            EntrepriseNom = facture.Entreprise?.Nom ?? "—",
            TotalHtDevis = devis.TotalHt,
            TotalHtFacture = facture.TotalHt,
            EcartTotalHt = ecartTotalHt,
            HasDiscrepancies = Math.Abs(ecartTotalHt) > 0.01m || matchings.Any(m => m.match == null),
            ModeComparaison = "Lignes",
            MontantDejaFacture = montantDejaFacture,
            ResteAFacturer = resteAFacturer,
            Lignes = matchings.Select(m => new LigneComparaisonDto
            {
                FactureLigneId = m.lf.Id,
                DevisLigneId = m.match?.Id,
                DescriptionFacture = m.lf.Description,
                DescriptionDevis = m.match?.Description,
                QuantiteDevis = m.match?.Quantite,
                QuantiteFacture = m.lf.Quantite,
                PrixUnitaireDevis = m.match?.PrixUnitaire,
                PrixUnitaireFacture = m.lf.PrixUnitaire,
                EcartPrix = m.match != null
                    ? (m.lf.PrixUnitaire ?? 0) - (m.match.PrixUnitaire ?? 0)
                    : m.lf.TotalLigne,
                EcartQuantite = m.match != null
                    ? (m.lf.Quantite ?? 0) - (m.match.Quantite ?? 0)
                    : null,
                NonMatche = m.match == null
            }).ToList()
        };
    }

    private static LignePoste? FindBestMatch(string description, List<LignePoste> candidates)
    {
        if (candidates.Count == 0) return null;

        var normalizedDesc = Normalize(description);
        LignePoste? best = null;
        int bestScore = int.MaxValue;

        foreach (var candidate in candidates)
        {
            var score = LevenshteinDistance(normalizedDesc, Normalize(candidate.Description));
            // accept if distance is less than 40% of the longer string
            var threshold = (int)(Math.Max(normalizedDesc.Length, Normalize(candidate.Description).Length) * 0.4);
            if (score < bestScore && score <= threshold)
            {
                bestScore = score;
                best = candidate;
            }
        }

        return best;
    }

    private static string Normalize(string s)
    {
        s = s.ToLowerInvariant().Trim();
        s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", " ");
        return s;
    }

    private static int LevenshteinDistance(string a, string b)
    {
        int[,] d = new int[a.Length + 1, b.Length + 1];
        for (int i = 0; i <= a.Length; i++) d[i, 0] = i;
        for (int j = 0; j <= b.Length; j++) d[0, j] = j;
        for (int i = 1; i <= a.Length; i++)
            for (int j = 1; j <= b.Length; j++)
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
        return d[a.Length, b.Length];
    }
}
