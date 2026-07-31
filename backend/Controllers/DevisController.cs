using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/devis")]
public class DevisController(AppDbContext db, IExtractionService extractionService, IConfiguration config) : ControllerBase
{
    [HttpPost("import")]
    public async Task<ActionResult<DevisDto>> Import(IFormFile file, [FromForm] string? mode)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier manquant.");

        if (!file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
            && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Seuls les fichiers PDF sont acceptés.");

        if (file.Length > 50 * 1024 * 1024)
            return BadRequest("Le fichier ne doit pas dépasser 50 Mo.");

        var uploadDir = Path.Combine(config["Uploads:BasePath"] ?? "uploads", "devis");
        Directory.CreateDirectory(uploadDir);
        var fileName = $"{Guid.NewGuid()}-{Path.GetFileName(file.FileName)}";
        var filePath = Path.Combine(uploadDir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream);

        var extractionMode = Enum.TryParse<ExtractionMode>(mode, true, out var m) ? m : ExtractionMode.Image;
        var devis = await extractionService.CreateDevisEntryAsync(filePath);
        extractionService.StartDevisExtraction(devis.Id, filePath, extractionMode);
        return CreatedAtAction(nameof(GetById), new { id = devis.Id }, MapToDto(devis));
    }

    [HttpPost]
    public async Task<ActionResult<DevisDto>> Create([FromBody] DevisCreateDto dto)
    {
        int? entrepriseId = dto.EntrepriseId;
        if (entrepriseId.HasValue)
        {
            if (!await db.Entreprises.AnyAsync(e => e.Id == entrepriseId))
                return BadRequest($"Entreprise {entrepriseId} introuvable.");
        }
        else if (!string.IsNullOrWhiteSpace(dto.EntrepriseNom))
        {
            var entreprise = await EntrepriseResolver.ResolveAsync(db, dto.EntrepriseNom);
            entrepriseId = entreprise?.Id;
        }

        TypeLot? typeLot = null;
        if (!string.IsNullOrEmpty(dto.TypeLot))
        {
            if (!Enum.TryParse<TypeLot>(dto.TypeLot, out var parsed))
                return BadRequest($"Type de lot '{dto.TypeLot}' invalide.");
            typeLot = parsed;
        }

        var devis = new Devis
        {
            EntrepriseId = entrepriseId,
            NumeroDevis = dto.NumeroDevis,
            Lot = dto.Lot,
            TypeLot = typeLot,
            DateDevis = dto.DateDevis,
            Statut = StatutExtraction.Extrait
        };
        db.Devis.Add(devis);
        await db.SaveChangesAsync();
        await db.Entry(devis).Reference(d => d.Entreprise).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = devis.Id }, MapToDto(devis));
    }

    [HttpGet]
    public async Task<ActionResult<List<DevisDto>>> GetAll(
        [FromQuery] string? lot,
        [FromQuery] string? statut,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = db.Devis
            .Include(d => d.Entreprise)
            .AsQueryable();

        if (!string.IsNullOrEmpty(lot))
            query = query.Where(d => d.Lot != null && d.Lot.Contains(lot));

        if (!string.IsNullOrEmpty(statut) && Enum.TryParse<StatutExtraction>(statut, true, out var statutEnum))
            query = query.Where(d => d.Statut == statutEnum);

        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return items.Select(d => MapToDto(d, includeLignes: false)).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DevisDto>> GetById(int id)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes.OrderBy(l => l.Ordre))
            .FirstOrDefaultAsync(d => d.Id == id);

        if (devis == null) return NotFound();
        return MapToDto(devis);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<DevisDto>> Update(int id, [FromBody] DevisUpdateDto dto)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes.OrderBy(l => l.Ordre))
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        int? entrepriseId = dto.EntrepriseId;
        if (entrepriseId.HasValue)
        {
            if (!await db.Entreprises.AnyAsync(e => e.Id == entrepriseId))
                return BadRequest($"Entreprise {entrepriseId} introuvable.");
        }
        else if (!string.IsNullOrWhiteSpace(dto.EntrepriseNom))
        {
            var entreprise = await EntrepriseResolver.ResolveAsync(db, dto.EntrepriseNom);
            entrepriseId = entreprise?.Id;
        }

        TypeLot? typeLot = null;
        if (!string.IsNullOrEmpty(dto.TypeLot))
        {
            if (!Enum.TryParse<TypeLot>(dto.TypeLot, out var parsed))
                return BadRequest($"Type de lot '{dto.TypeLot}' invalide.");
            typeLot = parsed;
        }

        devis.NumeroDevis = dto.NumeroDevis;
        devis.Lot = dto.Lot;
        devis.TypeLot = typeLot;
        devis.DateDevis = dto.DateDevis;
        devis.EntrepriseId = entrepriseId;
        devis.TvaTaux = dto.TvaTaux;
        // les totaux sont saisis à la main (plus de recalcul depuis les lignes) ; TVA montant = TTC - HT
        devis.TotalHt = dto.TotalHt;
        devis.TotalTtc = dto.TotalTtc;
        devis.TvaMontant = dto.TotalTtc - dto.TotalHt;

        await db.SaveChangesAsync();
        await db.Entry(devis).Reference(d => d.Entreprise).LoadAsync();
        return MapToDto(devis);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var devis = await db.Devis.FindAsync(id);
        if (devis == null) return NotFound();

        // suppression explicite des lignes côté application, sans dépendre du cascade DB
        var lignes = db.LignesPoste.Where(l => l.DevisId == id);
        db.LignesPoste.RemoveRange(lignes);

        db.Devis.Remove(devis);
        await db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(devis.FichierPdfPath))
        {
            try { System.IO.File.Delete(devis.FichierPdfPath); } catch { /* best effort */ }
        }

        return NoContent();
    }

    [HttpPost("{id}/pdf")]
    public async Task<ActionResult<DevisDto>> AttachPdf(int id, IFormFile file)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes.OrderBy(l => l.Ordre))
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest("Fichier manquant.");

        if (!file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
            && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Seuls les fichiers PDF sont acceptés.");

        if (file.Length > 50 * 1024 * 1024)
            return BadRequest("Le fichier ne doit pas dépasser 50 Mo.");

        var uploadDir = Path.Combine(config["Uploads:BasePath"] ?? "uploads", "devis");
        Directory.CreateDirectory(uploadDir);
        var fileName = $"{Guid.NewGuid()}-{Path.GetFileName(file.FileName)}";
        var filePath = Path.Combine(uploadDir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream);

        // remplace l'ancien document s'il y en avait un
        if (!string.IsNullOrEmpty(devis.FichierPdfPath))
        {
            try { System.IO.File.Delete(devis.FichierPdfPath); } catch { /* best effort */ }
        }
        devis.FichierPdfPath = filePath;
        await db.SaveChangesAsync();
        return MapToDto(devis);
    }

    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> GetPdf(int id)
    {
        var devis = await db.Devis.FindAsync(id);
        if (devis == null) return NotFound();
        if (string.IsNullOrEmpty(devis.FichierPdfPath) || !System.IO.File.Exists(devis.FichierPdfPath))
            return NotFound("Aucun PDF disponible pour ce devis.");

        var stream = System.IO.File.OpenRead(devis.FichierPdfPath);
        // Pas de nom de fichier => Content-Disposition: inline, consultation dans l'iframe sans téléchargement
        return File(stream, "application/pdf");
    }

    [HttpGet("{id}/echanges")]
    public async Task<ActionResult<List<LlmExchangeDto>>> GetEchanges(int id)
    {
        var echanges = await db.LlmExchanges
            .Where(e => e.TypeDocument == TypeDocument.Devis && e.DocumentId == id)
            .OrderBy(e => e.Batch)
            .Select(e => new LlmExchangeDto(e.Id, e.Batch, e.Modele, e.SystemPrompt, e.UserPrompt,
                e.NbImages, e.ReponseBrute, e.DureeMs, e.Succes, e.Erreur, e.CreatedAt))
            .ToListAsync();
        return Ok(echanges);
    }

    [HttpPost("{id}/lignes")]
    public async Task<ActionResult<DevisDto>> AddLigne(int id, [FromBody] LignePosteUpsertDto dto)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        devis.Lignes.Add(new LignePoste
        {
            DevisId = id,
            Ordre = dto.Ordre,
            Description = dto.Description,
            Quantite = dto.Quantite,
            Unite = dto.Unite,
            PrixUnitaire = dto.PrixUnitaire,
            TotalLigne = dto.TotalLigne
        });

        await db.SaveChangesAsync();
        return MapToDto(devis);
    }

    [HttpPut("{id}/lignes/{ligneId}")]
    public async Task<ActionResult<DevisDto>> UpdateLigne(int id, int ligneId, [FromBody] LignePosteUpsertDto dto)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        var ligne = devis.Lignes.FirstOrDefault(l => l.Id == ligneId);
        if (ligne == null) return NotFound();

        ligne.Ordre = dto.Ordre;
        ligne.Description = dto.Description;
        ligne.Quantite = dto.Quantite;
        ligne.Unite = dto.Unite;
        ligne.PrixUnitaire = dto.PrixUnitaire;
        ligne.TotalLigne = dto.TotalLigne;

        await db.SaveChangesAsync();
        return MapToDto(devis);
    }

    [HttpDelete("{id}/lignes/{ligneId}")]
    public async Task<ActionResult<DevisDto>> DeleteLigne(int id, int ligneId)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        var ligne = devis.Lignes.FirstOrDefault(l => l.Id == ligneId);
        if (ligne == null) return NotFound();

        devis.Lignes.Remove(ligne);
        await db.SaveChangesAsync();
        return MapToDto(devis);
    }

    [HttpDelete("{id}/lignes")]
    public async Task<ActionResult<DevisDto>> DeleteAllLignes(int id)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        db.LignesPoste.RemoveRange(devis.Lignes);
        devis.Lignes.Clear();
        await db.SaveChangesAsync();
        return MapToDto(devis);
    }

    // Recalcul manuel des totaux à partir de la somme des lignes (action explicite, jamais automatique).
    [HttpPost("{id}/recalculer")]
    public async Task<ActionResult<DevisDto>> Recalculer(int id)
    {
        var devis = await db.Devis
            .Include(d => d.Entreprise)
            .Include(d => d.Lignes.OrderBy(l => l.Ordre))
            .FirstOrDefaultAsync(d => d.Id == id);
        if (devis == null) return NotFound();

        RecomputeTotals(devis);
        await db.SaveChangesAsync();
        return MapToDto(devis);
    }

    private static void RecomputeTotals(Devis devis)
    {
        devis.TotalHt = devis.Lignes.Sum(l => l.TotalLigne ?? 0);
        var taux = devis.TvaTaux ?? 20;
        devis.TvaTaux = taux;
        devis.TvaMontant = devis.TotalHt * taux / 100;
        devis.TotalTtc = devis.TotalHt + devis.TvaMontant;
    }

    private static DevisDto MapToDto(Devis d, bool includeLignes = true) => new()
    {
        Id = d.Id,
        NumeroDevis = d.NumeroDevis,
        Lot = d.Lot,
        TypeLot = d.TypeLot?.ToString(),
        DateDevis = d.DateDevis,
        DateValidite = d.DateValidite,
        DelaiExecution = d.DelaiExecution,
        TotalHt = d.TotalHt,
        TvaTaux = d.TvaTaux,
        TvaMontant = d.TvaMontant,
        TotalTtc = d.TotalTtc,
        Statut = d.Statut.ToString(),
        CreatedAt = d.CreatedAt,
        HasPdf = !string.IsNullOrEmpty(d.FichierPdfPath) && System.IO.File.Exists(d.FichierPdfPath),
        Entreprise = d.Entreprise == null ? null : new EntrepriseDto
        {
            Id = d.Entreprise.Id,
            Nom = d.Entreprise.Nom,
            Siret = d.Entreprise.Siret,
            ContactNom = d.Entreprise.ContactNom,
            ContactTel = d.Entreprise.ContactTel,
            ContactEmail = d.Entreprise.ContactEmail
        },
        Lignes = includeLignes
            ? d.Lignes.Select(l => new LignePosteDto
            {
                Id = l.Id,
                Ordre = l.Ordre,
                Description = l.Description,
                Quantite = l.Quantite,
                Unite = l.Unite,
                PrixUnitaire = l.PrixUnitaire,
                TotalLigne = l.TotalLigne
            }).ToList()
            : []
    };
}
