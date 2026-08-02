using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class DevisDto
{
    public int Id { get; set; }
    public string? NumeroDevis { get; set; }
    public string? Lot { get; set; }
    public string? TypeLot { get; set; }
    public DateOnly? DateDevis { get; set; }
    public DateOnly? DateValidite { get; set; }
    public string? DelaiExecution { get; set; }
    public decimal? TotalHt { get; set; }
    public decimal? TvaTaux { get; set; }
    public decimal? TvaMontant { get; set; }
    public decimal? TotalTtc { get; set; }
    public string Statut { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool HasPdf { get; set; }
    public string? FichierPdfNom { get; set; }
    public EntrepriseDto? Entreprise { get; set; }
    public List<LignePosteDto> Lignes { get; set; } = [];
}

public class LignePosteDto
{
    public int Id { get; set; }
    public int Ordre { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal? Quantite { get; set; }
    public string? Unite { get; set; }
    public decimal? PrixUnitaire { get; set; }
    public decimal? TotalLigne { get; set; }
}

// Bornes d'entrée. Sur les colonnes bornées en base (NumeroDevis 100, Siret 20…) elles
// transforment un 500 PostgreSQL en 400 lisible ; sur les colonnes `text` (Lot, Description)
// elles plafonnent simplement une saisie libre sinon illimitée.
public class LignePosteUpsertDto
{
    public int Ordre { get; set; }
    [MaxLength(2000)] public string Description { get; set; } = string.Empty;
    public decimal? Quantite { get; set; }
    [MaxLength(50)] public string? Unite { get; set; }
    public decimal? PrixUnitaire { get; set; }
    public decimal? TotalLigne { get; set; }
}

public class DevisUpdateDto
{
    [MaxLength(100)] public string? NumeroDevis { get; set; }
    [MaxLength(255)] public string? Lot { get; set; }
    public string? TypeLot { get; set; }
    public DateOnly? DateDevis { get; set; }
    public int? EntrepriseId { get; set; }
    [MaxLength(255)] public string? EntrepriseNom { get; set; }
    public decimal? TvaTaux { get; set; }
    public decimal? TotalHt { get; set; }
    public decimal? TotalTtc { get; set; }
}

public class DevisCreateDto
{
    public int? EntrepriseId { get; set; }
    [MaxLength(255)] public string? EntrepriseNom { get; set; }
    [MaxLength(100)] public string? NumeroDevis { get; set; }
    [MaxLength(255)] public string? Lot { get; set; }
    public string? TypeLot { get; set; }
    public DateOnly? DateDevis { get; set; }
}

public class EntrepriseDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string? Siret { get; set; }
    public string? ContactNom { get; set; }
    public string? ContactTel { get; set; }
    public string? ContactEmail { get; set; }
    public string? Adresse { get; set; }
}

public class EntrepriseUpsertDto
{
    [Required, MaxLength(255)] public string Nom { get; set; } = string.Empty;
    [MaxLength(20)] public string? Siret { get; set; }
    [MaxLength(255)] public string? ContactNom { get; set; }
    [MaxLength(50)] public string? ContactTel { get; set; }
    [MaxLength(255)] public string? ContactEmail { get; set; }
    [MaxLength(500)] public string? Adresse { get; set; }
}
