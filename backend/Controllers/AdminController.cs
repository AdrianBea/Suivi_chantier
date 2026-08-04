using System.Reflection;
using backend.DTOs;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>
/// Supervision multi-comptes. SEUL endroit du backend qui lit les données d'autres
/// utilisateurs : partout ailleurs la règle est WHERE UserId = moi. Chaque méthode
/// ici s'en affranchit délibérément, d'où le [Authorize(Policy = "AdminOnly")]
/// posé au niveau de la classe.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db, ILogger<AdminController> logger) : ControllerBase
{
    // .NET 8 accepte l'ID IANA sur Windows comme sur Linux. Repli sur UTC si l'image
    // n'embarque pas de base tz : un graphe décalé vaut mieux qu'une page en erreur.
    private static readonly TimeZoneInfo ParisTz = ResolveParisTz();

    private static TimeZoneInfo ResolveParisTz()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Europe/Paris"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.Utc; }
        catch (InvalidTimeZoneException) { return TimeZoneInfo.Utc; }
    }

    // ---------- Comptes ----------

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers()
    {
        var users = await db.Users.OrderBy(u => u.Email).ToListAsync();

        // Un GroupBy par table plutôt qu'une sous-requête par utilisateur (N+1).
        // Length sur bytea se traduit en length() côté SQL : les PDF ne remontent pas.
        // Devis sans PDF -> length(NULL) = NULL, ignoré par sum() (d'où le ?? 0 final).
        var devisStats = await db.Devis
            .GroupBy(d => d.UserId)
            .Select(g => new { UserId = g.Key, Nb = g.Count(), Octets = g.Sum(d => (long?)(d.FichierPdfData!.Length)) ?? 0 })
            .ToDictionaryAsync(x => x.UserId);

        var factureStats = await db.Factures
            .GroupBy(f => f.UserId)
            .Select(g => new { UserId = g.Key, Nb = g.Count(), Octets = g.Sum(f => (long?)(f.FichierPdfData!.Length)) ?? 0 })
            .ToDictionaryAsync(x => x.UserId);

        var entrepriseCounts = await db.Entreprises
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, Nb = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Nb);

        // Les pièces jointes portent leur taille en clair, pas besoin de toucher au binaire.
        var pieceOctets = await db.PiecesJointes
            .GroupBy(p => p.Facture!.UserId)
            .Select(g => new { UserId = g.Key, Octets = g.Sum(p => p.TailleOctets) })
            .ToDictionaryAsync(x => x.UserId, x => x.Octets);

        return users.Select(u =>
        {
            devisStats.TryGetValue(u.Id, out var d);
            factureStats.TryGetValue(u.Id, out var f);
            entrepriseCounts.TryGetValue(u.Id, out var nbEntreprises);
            pieceOctets.TryGetValue(u.Id, out var octetsPieces);
            return new AdminUserDto(
                u.Id, u.Email, u.Nom, u.Prenom, u.IsAdmin, u.CreatedAt,
                d?.Nb ?? 0, f?.Nb ?? 0, nbEntreprises,
                (d?.Octets ?? 0) + (f?.Octets ?? 0) + octetsPieces);
        }).ToList();
    }

    [HttpPatch("users/{id}/admin")]
    public async Task<ActionResult> SetAdmin(int id, [FromBody] SetAdminDto dto)
    {
        // Se retirer son propre statut peut laisser l'app sans aucun admin : la
        // repromotion se ferait alors en SQL à la main. On refuse côté serveur.
        if (id == User.GetUserId())
            return BadRequest(new { message = "Vous ne pouvez pas modifier votre propre statut administrateur." });

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        // Le garde-fou ci-dessus ne suffit pas à deux admins : A peut rétrograder B
        // puis B rétrograder A. On compte les admins restants, seul invariant qui tienne.
        if (user.IsAdmin && !dto.IsAdmin && !await db.Users.AnyAsync(u => u.IsAdmin && u.Id != id))
            return BadRequest(new { message = "Ce compte est le dernier administrateur : promouvez quelqu'un d'autre avant de lui retirer ses droits." });

        user.IsAdmin = dto.IsAdmin;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("users/{id}")]
    public async Task<ActionResult> DeleteUser(int id)
    {
        if (id == User.GetUserId())
            return BadRequest(new { message = "Vous ne pouvez pas supprimer votre propre compte." });

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        // Les FK User -> Entreprise/Devis/Facture sont en Restrict : rien ne part en
        // cascade, il faut vider les données avant de retirer la ligne User.
        // Transaction explicite : chaque ExecuteDelete est autocommit, une coupure en
        // cours de purge laisserait sinon un compte vivant sans ses devis/factures.
        await using var tx = await db.Database.BeginTransactionAsync();
        await UserPurge.PurgeDataAsync(db, id);
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return NoContent();
    }

    // ---------- Observabilité LLM ----------

    [HttpGet("llm/stats")]
    public async Task<ActionResult<LlmStatsDto>> GetLlmStats()
    {
        var total = await db.LlmExchanges.CountAsync();
        if (total == 0)
            return new LlmStatsDto(0, 0, 0, 0, 0, [], []);

        var echecs = await db.LlmExchanges.CountAsync(e => !e.Succes);
        var dureeMoyenne = await db.LlmExchanges.AverageAsync(e => (double)e.DureeMs);

        // p95 par offset : suffisant à ce volume, pas besoin de fonction fenêtre.
        // Le clamp évite de dépasser la dernière ligne (FirstOrDefault renverrait 0,
        // soit un p95 affiché sous la moyenne).
        var p95 = await db.LlmExchanges
            .OrderBy(e => e.DureeMs)
            .Skip(Math.Min((int)(total * 0.95), total - 1))
            .Select(e => e.DureeMs)
            .FirstOrDefaultAsync();

        // Projection en type anonyme puis mapping : EF ne matérialise pas de record
        // positionnel directement dans un GroupBy.
        var parModeleBrut = await db.LlmExchanges
            .GroupBy(e => e.Modele)
            .Select(g => new
            {
                Modele = g.Key,
                Total = g.Count(),
                Echecs = g.Count(e => !e.Succes),
                Duree = g.Average(e => (double)e.DureeMs),
            })
            .ToListAsync();

        var parModele = parModeleBrut
            .OrderByDescending(m => m.Total)
            .Select(m => new ModeleStatDto(m.Modele, m.Total, m.Echecs, m.Duree))
            .ToList();

        // DateTimeKind.Utc explicite : la colonne est un timestamptz, Npgsql refuse
        // un DateTime Unspecified en paramètre.
        var depuis = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(-6), DateTimeKind.Utc);

        // Regroupement par jour fait en C# : sur 7 jours le volume est trivial, et
        // GroupBy(e => e.CreatedAt.Date) ne se traduit pas côté Npgsql.
        var recents = await db.LlmExchanges
            .Where(e => e.CreatedAt >= depuis)
            .Select(e => new { e.CreatedAt, e.Succes })
            .ToListAsync();

        // Découpage des jours en heure française, pas en UTC : un import à 01h30 le 4
        // est stocké 23h30 UTC le 3 et serait compté la veille. Le filtre `depuis` reste
        // en UTC (paramètre timestamptz), il ratisse simplement un peu large.
        var jours = recents
            .Select(r => new { Jour = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(r.CreatedAt, ParisTz)), r.Succes })
            .ToList();

        var aujourdhui = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ParisTz));

        var septJours = Enumerable.Range(0, 7)
            .Select(i => aujourdhui.AddDays(i - 6))
            .Select(jour => new JourStatDto(
                jour,
                jours.Count(r => r.Jour == jour),
                jours.Count(r => r.Jour == jour && !r.Succes)))
            .ToList();

        return new LlmStatsDto(
            total, echecs, (double)(total - echecs) / total,
            dureeMoyenne, p95, parModele, septJours);
    }

    [HttpGet("llm/exchanges")]
    public async Task<ActionResult<List<LlmExchangeListDto>>> GetLlmExchanges(
        [FromQuery] bool? succes,
        [FromQuery] string? modele,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.LlmExchanges.AsQueryable();
        if (succes.HasValue) query = query.Where(e => e.Succes == succes.Value);
        if (!string.IsNullOrEmpty(modele)) query = query.Where(e => e.Modele == modele);

        return await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new LlmExchangeListDto(
                e.Id, e.TypeDocument.ToString(), e.DocumentId, e.Batch, e.Modele,
                e.NbImages, e.DureeMs, e.Succes, e.Erreur, e.CreatedAt))
            .ToListAsync();
    }

    [HttpGet("llm/exchanges/{id}")]
    public async Task<ActionResult<LlmExchangeDto>> GetLlmExchange(int id)
    {
        var e = await db.LlmExchanges.FindAsync(id);
        if (e is null) return NotFound();

        return new LlmExchangeDto(
            e.Id, e.Batch, e.Modele, e.SystemPrompt, e.UserPrompt,
            e.NbImages, e.ReponseBrute, e.DureeMs, e.Succes, e.Erreur, e.CreatedAt);
    }

    // ---------- Santé ----------

    [HttpGet("health")]
    public async Task<ActionResult<HealthDto>> GetHealth()
    {
        var dbOk = await db.Database.CanConnectAsync();
        if (!dbOk)
            return new HealthDto(false, Version(), Uptime(), 0, 0, 0, 0, 0);

        // Indicateur optionnel : sur une instance managée le rôle peut ne pas avoir le
        // droit de lire la taille. On dégrade à 0 plutôt que de faire échouer la page.
        long tailleBase = 0;
        try
        {
            // Ouvrir AVANT de créer la commande, et refermer dans tous les cas :
            // OpenConnectionAsync incrémente un compteur interne à EF, sans le Close
            // correspondant la connexion reste hors du pool jusqu'à la fin de la requête.
            await db.Database.OpenConnectionAsync();
            try
            {
                await using var cmd = db.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = "SELECT pg_database_size(current_database())";
                tailleBase = Convert.ToInt64(await cmd.ExecuteScalarAsync());
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Taille de la base indisponible");
        }

        var octetsDevis = await db.Devis.SumAsync(d => (long?)(d.FichierPdfData!.Length)) ?? 0;
        var octetsFactures = await db.Factures.SumAsync(f => (long?)(f.FichierPdfData!.Length)) ?? 0;
        var octetsPieces = await db.PiecesJointes.SumAsync(p => (long?)p.TailleOctets) ?? 0;

        return new HealthDto(
            true,
            Version(),
            Uptime(),
            await db.Users.CountAsync(),
            tailleBase,
            octetsDevis + octetsFactures + octetsPieces,
            await db.Devis.CountAsync(d => d.Statut == StatutExtraction.Erreur),
            await db.Factures.CountAsync(f => f.Statut == StatutExtraction.Erreur));
    }

    private static string Version()
        => Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "inconnue";

    private static double Uptime()
        => Math.Round(Environment.TickCount64 / 3_600_000.0, 1);
}
