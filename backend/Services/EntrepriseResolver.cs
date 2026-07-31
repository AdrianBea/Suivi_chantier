using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public static class EntrepriseResolver
{
    // Résout une entreprise à partir d'un nom et/ou d'un SIRET : matche par SIRET si fourni,
    // sinon par nom (insensible à la casse), sinon crée une nouvelle ligne. Retourne null si ni nom ni siret.
    public static async Task<Entreprise?> ResolveAsync(
        AppDbContext db,
        string? nom,
        string? siret = null,
        string? contactNom = null,
        string? contactTel = null,
        string? contactEmail = null,
        string? adresse = null)
    {
        nom = string.IsNullOrWhiteSpace(nom) ? null : nom.Trim();
        siret = string.IsNullOrWhiteSpace(siret) ? null : siret.Trim();
        if (nom == null && siret == null) return null;

        Entreprise? entreprise = siret != null
            ? await db.Entreprises.FirstOrDefaultAsync(e => e.Siret == siret)
            : null;

        if (entreprise == null && nom != null)
            entreprise = await db.Entreprises.FirstOrDefaultAsync(e => e.Nom.ToLower() == nom.ToLower());

        if (entreprise == null)
        {
            entreprise = new Entreprise
            {
                Nom = nom ?? "Inconnu",
                Siret = siret,
                ContactNom = contactNom,
                ContactTel = contactTel,
                ContactEmail = contactEmail,
                Adresse = adresse
            };
            db.Entreprises.Add(entreprise);
            await db.SaveChangesAsync();
        }

        return entreprise;
    }
}
