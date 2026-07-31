using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/entreprises")]
public class EntreprisesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<EntrepriseDto>>> GetAll()
    {
        return await db.Entreprises
            .OrderBy(e => e.Nom)
            .Select(e => MapToDto(e))
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<EntrepriseDto>> Create([FromBody] EntrepriseUpsertDto dto)
    {
        var entreprise = new Entreprise
        {
            Nom = dto.Nom,
            Siret = dto.Siret,
            ContactNom = dto.ContactNom,
            ContactTel = dto.ContactTel,
            ContactEmail = dto.ContactEmail,
            Adresse = dto.Adresse
        };
        db.Entreprises.Add(entreprise);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), MapToDto(entreprise));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<EntrepriseDto>> Update(int id, [FromBody] EntrepriseUpsertDto dto)
    {
        var entreprise = await db.Entreprises.FindAsync(id);
        if (entreprise == null) return NotFound();

        entreprise.Nom = dto.Nom;
        entreprise.Siret = dto.Siret;
        entreprise.ContactNom = dto.ContactNom;
        entreprise.ContactTel = dto.ContactTel;
        entreprise.ContactEmail = dto.ContactEmail;
        entreprise.Adresse = dto.Adresse;

        await db.SaveChangesAsync();
        return MapToDto(entreprise);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entreprise = await db.Entreprises.FindAsync(id);
        if (entreprise == null) return NotFound();

        var enUsage = await db.Devis.AnyAsync(d => d.EntrepriseId == id)
            || await db.Factures.AnyAsync(f => f.EntrepriseId == id);
        if (enUsage)
            return BadRequest("Cette entreprise est liée à des devis ou factures et ne peut pas être supprimée.");

        db.Entreprises.Remove(entreprise);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static EntrepriseDto MapToDto(Entreprise e) => new()
    {
        Id = e.Id,
        Nom = e.Nom,
        Siret = e.Siret,
        ContactNom = e.ContactNom,
        ContactTel = e.ContactTel,
        ContactEmail = e.ContactEmail,
        Adresse = e.Adresse
    };
}
