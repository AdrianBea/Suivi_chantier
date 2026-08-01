using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/factures")]
public class FacturesController(AppDbContext db, IExtractionService extractionService, IComparaisonService comparaisonService) : ControllerBase
{
    [HttpPost("import")]
    public async Task<ActionResult<FactureDto>> Import(IFormFile file, [FromQuery] int? devisId, [FromForm] string? mode)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier manquant.");

        if (!file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
            && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Seuls les fichiers PDF sont acceptés.");

        if (file.Length > 50 * 1024 * 1024)
            return BadRequest("Le fichier ne doit pas dépasser 50 Mo.");

        var userId = User.GetUserId();
        if (devisId.HasValue && !await db.Devis.AnyAsync(d => d.Id == devisId && d.UserId == userId))
            return BadRequest($"Devis {devisId} introuvable.");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var extractionMode = Enum.TryParse<ExtractionMode>(mode, true, out var m) ? m : ExtractionMode.Texte;
        var facture = await extractionService.CreateFactureEntryAsync(ms.ToArray(), Path.GetFileName(file.FileName), userId, devisId);
        extractionService.StartFactureExtraction(facture.Id, extractionMode);
        return CreatedAtAction(nameof(GetById), new { id = facture.Id }, MapToDto(facture));
    }

    [HttpPost]
    public async Task<ActionResult<FactureDto>> Create([FromBody] FactureCreateDto dto)
    {
        var userId = User.GetUserId();
        int? entrepriseId = dto.EntrepriseId;
        if (entrepriseId.HasValue)
        {
            if (!await db.Entreprises.AnyAsync(e => e.Id == entrepriseId && e.UserId == userId))
                return BadRequest($"Entreprise {entrepriseId} introuvable.");
        }
        else if (!string.IsNullOrWhiteSpace(dto.EntrepriseNom))
        {
            var entreprise = await EntrepriseResolver.ResolveAsync(db, userId, dto.EntrepriseNom);
            entrepriseId = entreprise?.Id;
        }

        if (dto.DevisId.HasValue && !await db.Devis.AnyAsync(d => d.Id == dto.DevisId && d.UserId == userId))
            return BadRequest($"Devis {dto.DevisId} introuvable.");

        TypeLot? typeLot = null;
        if (!string.IsNullOrEmpty(dto.TypeLot))
        {
            if (!Enum.TryParse<TypeLot>(dto.TypeLot, out var parsed))
                return BadRequest($"Type de lot '{dto.TypeLot}' invalide.");
            typeLot = parsed;
        }

        var facture = new Facture
        {
            UserId = userId,
            EntrepriseId = entrepriseId,
            DevisId = dto.DevisId,
            NumeroFacture = dto.NumeroFacture,
            TypeLot = typeLot,
            DateFacture = dto.DateFacture,
            DateEcheance = dto.DateEcheance,
            Statut = StatutExtraction.Extrait
        };
        db.Factures.Add(facture);
        await db.SaveChangesAsync();
        await db.Entry(facture).Reference(f => f.Entreprise).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = facture.Id }, MapToDto(facture));
    }

    [HttpGet]
    public async Task<ActionResult<List<FactureDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        var items = await db.Factures
            .Include(f => f.Entreprise)
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return items.Select(f => MapToDto(f, includeLignes: false)).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FactureDto>> GetById(int id)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures
            .Include(f => f.Entreprise)
            .Include(f => f.Lignes.OrderBy(l => l.Ordre))
            .Include(f => f.PiecesJointes)
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

        if (facture == null) return NotFound();
        return MapToDto(facture);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FactureDto>> Update(int id, [FromBody] FactureUpdateDto dto)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures
            .Include(f => f.Entreprise)
            .Include(f => f.Lignes.OrderBy(l => l.Ordre))
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        TypeLot? typeLot = null;
        if (!string.IsNullOrEmpty(dto.TypeLot))
        {
            if (!Enum.TryParse<TypeLot>(dto.TypeLot, out var parsed))
                return BadRequest($"Type de lot '{dto.TypeLot}' invalide.");
            typeLot = parsed;
        }

        var wantsEntrepriseChange = dto.EntrepriseId.HasValue || !string.IsNullOrWhiteSpace(dto.EntrepriseNom);
        if (wantsEntrepriseChange)
        {
            if (facture.DevisId.HasValue)
                return BadRequest("Impossible de changer l'entreprise d'une facture liée à un devis. Déliez d'abord le devis.");

            int? newEntrepriseId = dto.EntrepriseId;
            if (!newEntrepriseId.HasValue && !string.IsNullOrWhiteSpace(dto.EntrepriseNom))
            {
                var entreprise = await EntrepriseResolver.ResolveAsync(db, userId, dto.EntrepriseNom);
                newEntrepriseId = entreprise?.Id;
            }
            else if (newEntrepriseId.HasValue && !await db.Entreprises.AnyAsync(e => e.Id == newEntrepriseId && e.UserId == userId))
            {
                return BadRequest($"Entreprise {newEntrepriseId} introuvable.");
            }
            facture.EntrepriseId = newEntrepriseId;
        }

        facture.NumeroFacture = dto.NumeroFacture;
        facture.TypeLot = typeLot;
        facture.DateFacture = dto.DateFacture;
        facture.DateEcheance = dto.DateEcheance;
        await db.SaveChangesAsync();

        // recharge l'entreprise si elle a changé
        await db.Entry(facture).Reference(f => f.Entreprise).LoadAsync();
        return MapToDto(facture);
    }

    [HttpPost("{id}/lignes")]
    public async Task<ActionResult<FactureDto>> AddLigne(int id, [FromBody] LignePosteUpsertDto dto)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures
            .Include(f => f.Entreprise)
            .Include(f => f.Lignes)
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        facture.Lignes.Add(new LigneFacture
        {
            FactureId = id,
            Ordre = dto.Ordre,
            Description = dto.Description,
            Quantite = dto.Quantite,
            Unite = dto.Unite,
            PrixUnitaire = dto.PrixUnitaire,
            TotalLigne = dto.TotalLigne
        });

        await db.SaveChangesAsync();
        return MapToDto(facture);
    }

    [HttpPut("{id}/lignes/{ligneId}")]
    public async Task<ActionResult<FactureDto>> UpdateLigne(int id, int ligneId, [FromBody] LignePosteUpsertDto dto)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures
            .Include(f => f.Entreprise)
            .Include(f => f.Lignes)
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        var ligne = facture.Lignes.FirstOrDefault(l => l.Id == ligneId);
        if (ligne == null) return NotFound();

        ligne.Ordre = dto.Ordre;
        ligne.Description = dto.Description;
        ligne.Quantite = dto.Quantite;
        ligne.Unite = dto.Unite;
        ligne.PrixUnitaire = dto.PrixUnitaire;
        ligne.TotalLigne = dto.TotalLigne;

        await db.SaveChangesAsync();
        return MapToDto(facture);
    }

    [HttpDelete("{id}/lignes/{ligneId}")]
    public async Task<ActionResult<FactureDto>> DeleteLigne(int id, int ligneId)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures
            .Include(f => f.Entreprise)
            .Include(f => f.Lignes)
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        var ligne = facture.Lignes.FirstOrDefault(l => l.Id == ligneId);
        if (ligne == null) return NotFound();

        facture.Lignes.Remove(ligne);
        await db.SaveChangesAsync();
        return MapToDto(facture);
    }

    // Recalcul manuel des totaux à partir de la somme des lignes (action explicite, jamais automatique).
    [HttpPost("{id}/recalculer")]
    public async Task<ActionResult<FactureDto>> Recalculer(int id)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures
            .Include(f => f.Entreprise)
            .Include(f => f.Lignes.OrderBy(l => l.Ordre))
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        RecomputeTotals(facture);
        await db.SaveChangesAsync();
        return MapToDto(facture);
    }

    private static void RecomputeTotals(Facture facture)
    {
        facture.TotalHt = facture.Lignes.Sum(l => l.TotalLigne ?? 0);
        var taux = facture.TvaTaux ?? 20;
        facture.TvaTaux = taux;
        facture.TvaMontant = facture.TotalHt * taux / 100;
        facture.TotalTtc = facture.TotalHt + facture.TvaMontant;
    }

    [HttpGet("{id}/comparaison")]
    public async Task<ActionResult<ComparaisonDto>> GetComparaison(int id)
    {
        try
        {
            var dto = await comparaisonService.CompareAsync(id, User.GetUserId());
            return Ok(dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPatch("{id}/lier/{devisId}")]
    public async Task<IActionResult> LierAuDevis(int id, int devisId)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        var devis = await db.Devis.FirstOrDefaultAsync(d => d.Id == devisId && d.UserId == userId);
        if (devis == null) return BadRequest($"Devis {devisId} introuvable.");
        if (devis.EntrepriseId != facture.EntrepriseId)
            return BadRequest("La facture et le devis n'appartiennent pas à la même entreprise.");

        facture.DevisId = devisId;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        db.Factures.Remove(facture);
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> GetPdf(int id)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();
        if (facture.FichierPdfData == null)
            return NotFound("Aucun PDF disponible pour cette facture.");

        // Pas de nom de fichier => Content-Disposition: inline, consultation sans téléchargement
        return File(facture.FichierPdfData, "application/pdf");
    }

    private static readonly Dictionary<string, string> AllowedPieceJointeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png"
    };

    [HttpPost("{id}/pieces-jointes")]
    public async Task<ActionResult<PieceJointeDto>> UploadPieceJointe(int id, IFormFile file, [FromForm] string? libelle)
    {
        var userId = User.GetUserId();
        var facture = await db.Factures.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (facture == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest("Fichier manquant.");

        if (file.Length > 50 * 1024 * 1024)
            return BadRequest("Le fichier ne doit pas dépasser 50 Mo.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedPieceJointeTypes.TryGetValue(extension, out var expectedContentType)
            || !string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Formats acceptés : PDF, JPG, PNG.");
        }

        var originalName = Path.GetFileName(file.FileName);
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var piece = new PieceJointe
        {
            FactureId = id,
            NomFichier = originalName,
            Data = ms.ToArray(),
            ContentType = file.ContentType,
            TailleOctets = file.Length,
            Libelle = string.IsNullOrWhiteSpace(libelle) ? null : libelle.Trim()
        };
        db.PiecesJointes.Add(piece);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPieceJointe), new { id, pieceId = piece.Id }, MapToDto(piece));
    }

    [HttpGet("{id}/pieces-jointes")]
    public async Task<ActionResult<List<PieceJointeDto>>> GetPiecesJointes(int id)
    {
        var userId = User.GetUserId();
        if (!await db.Factures.AnyAsync(f => f.Id == id && f.UserId == userId))
            return NotFound();

        var pieces = await db.PiecesJointes
            .AsNoTracking()
            .Where(p => p.FactureId == id)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();

        return pieces.Select(MapToDto).ToList();
    }

    [HttpGet("{id}/pieces-jointes/{pieceId}")]
    public async Task<IActionResult> GetPieceJointe(int id, int pieceId)
    {
        var userId = User.GetUserId();
        var piece = await db.PiecesJointes
            .AsNoTracking()
            .Where(p => p.Facture!.UserId == userId)
            .FirstOrDefaultAsync(p => p.Id == pieceId && p.FactureId == id);
        if (piece == null)
            return NotFound();

        // Pas de nom de fichier => Content-Disposition: inline, prévisualisation directe (image/PDF) côté front
        return File(piece.Data, piece.ContentType);
    }

    [HttpDelete("{id}/pieces-jointes/{pieceId}")]
    public async Task<IActionResult> DeletePieceJointe(int id, int pieceId)
    {
        var userId = User.GetUserId();
        var piece = await db.PiecesJointes
            .Where(p => p.Facture!.UserId == userId)
            .FirstOrDefaultAsync(p => p.Id == pieceId && p.FactureId == id);
        if (piece == null) return NotFound();

        db.PiecesJointes.Remove(piece);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private static PieceJointeDto MapToDto(PieceJointe p) => new()
    {
        Id = p.Id,
        NomFichier = p.NomFichier,
        ContentType = p.ContentType,
        TailleOctets = p.TailleOctets,
        Libelle = p.Libelle,
        CreatedAt = p.CreatedAt
    };

    [HttpGet("{id}/echanges")]
    public async Task<ActionResult<List<LlmExchangeDto>>> GetEchanges(int id)
    {
        var userId = User.GetUserId();
        if (!await db.Factures.AnyAsync(f => f.Id == id && f.UserId == userId))
            return NotFound();

        var echanges = await db.LlmExchanges
            .Where(e => e.TypeDocument == TypeDocument.Facture && e.DocumentId == id)
            .OrderBy(e => e.Batch)
            .Select(e => new LlmExchangeDto(e.Id, e.Batch, e.Modele, e.SystemPrompt, e.UserPrompt,
                e.NbImages, e.ReponseBrute, e.DureeMs, e.Succes, e.Erreur, e.CreatedAt))
            .ToListAsync();
        return Ok(echanges);
    }

    private static FactureDto MapToDto(Facture f, bool includeLignes = true) => new()
    {
        Id = f.Id,
        DevisId = f.DevisId,
        NumeroFacture = f.NumeroFacture,
        TypeFacture = f.TypeFacture.ToString(),
        TypeLot = f.TypeLot?.ToString(),
        DateFacture = f.DateFacture,
        DateEcheance = f.DateEcheance,
        TotalHt = f.TotalHt,
        TvaTaux = f.TvaTaux,
        TvaMontant = f.TvaMontant,
        TotalTtc = f.TotalTtc,
        Statut = f.Statut.ToString(),
        CreatedAt = f.CreatedAt,
        HasPdf = f.FichierPdfData != null,
        Entreprise = f.Entreprise == null ? null : new EntrepriseDto
        {
            Id = f.Entreprise.Id,
            Nom = f.Entreprise.Nom,
            Siret = f.Entreprise.Siret,
            ContactNom = f.Entreprise.ContactNom,
            ContactTel = f.Entreprise.ContactTel,
            ContactEmail = f.Entreprise.ContactEmail
        },
        Lignes = includeLignes
            ? f.Lignes.Select(l => new LigneFactureDto
            {
                Id = l.Id,
                Ordre = l.Ordre,
                Description = l.Description,
                Quantite = l.Quantite,
                Unite = l.Unite,
                PrixUnitaire = l.PrixUnitaire,
                TotalLigne = l.TotalLigne
            }).ToList()
            : [],
        PiecesJointes = includeLignes
            ? f.PiecesJointes.Select(MapToDto).ToList()
            : []
    };
}
