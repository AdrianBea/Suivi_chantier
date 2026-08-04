using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Suppression des données d'un utilisateur, dans l'ordre imposé par les FK.
/// Un seul endroit connaît cet ordre : la RAZ (SettingsController) et la suppression
/// de compte (AdminController) passent toutes les deux par ici.
/// </summary>
public static class UserPurge
{
    /// <summary>
    /// Efface entreprises, devis, factures et traces LLM de l'utilisateur.
    /// Ne supprime PAS la ligne User elle-même.
    /// </summary>
    public static async Task PurgeDataAsync(AppDbContext db, int userId)
    {
        // ponytail: ExecuteDelete par table, ordre FK (Factures/Devis avant Entreprises).
        // Les lignes partent en cascade. Passer à un TRUNCATE brut si le volume grossit.

        // LlmExchange ne porte pas de UserId : on le purge par jointure sur DocumentId,
        // AVANT de supprimer les devis/factures dont dépend cette résolution.
        var devisIds = await db.Devis.Where(d => d.UserId == userId).Select(d => d.Id).ToListAsync();
        var factureIds = await db.Factures.Where(f => f.UserId == userId).Select(f => f.Id).ToListAsync();
        await db.LlmExchanges
            .Where(e => (e.TypeDocument == TypeDocument.Devis && devisIds.Contains(e.DocumentId))
                     || (e.TypeDocument == TypeDocument.Facture && factureIds.Contains(e.DocumentId)))
            .ExecuteDeleteAsync();

        await db.Factures.Where(f => f.UserId == userId).ExecuteDeleteAsync();
        await db.Devis.Where(d => d.UserId == userId).ExecuteDeleteAsync();
        await db.Entreprises.Where(e => e.UserId == userId).ExecuteDeleteAsync();
    }
}
