namespace backend.DTOs;

public class FactureDto
{
    public int Id { get; set; }
    public int? DevisId { get; set; }
    public string? NumeroFacture { get; set; }
    public string TypeFacture { get; set; } = "Facture";
    public string? TypeLot { get; set; }
    public DateOnly? DateFacture { get; set; }
    public DateOnly? DateEcheance { get; set; }
    public decimal? TotalHt { get; set; }
    public decimal? TvaTaux { get; set; }
    public decimal? TvaMontant { get; set; }
    public decimal? TotalTtc { get; set; }
    public string Statut { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool HasPdf { get; set; }
    public EntrepriseDto? Entreprise { get; set; }
    public List<LigneFactureDto> Lignes { get; set; } = [];
    public List<PieceJointeDto> PiecesJointes { get; set; } = [];
}

public class PieceJointeDto
{
    public int Id { get; set; }
    public string NomFichier { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long TailleOctets { get; set; }
    public string? Libelle { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LigneFactureDto
{
    public int Id { get; set; }
    public int Ordre { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal? Quantite { get; set; }
    public string? Unite { get; set; }
    public decimal? PrixUnitaire { get; set; }
    public decimal? TotalLigne { get; set; }
    // EcartPrix et EcartQuantite sont calculés à la volée dans ComparaisonDto, pas stockés ici
}

public class FactureUpdateDto
{
    public int? EntrepriseId { get; set; }
    public string? EntrepriseNom { get; set; }
    public string? NumeroFacture { get; set; }
    public string? TypeLot { get; set; }
    public DateOnly? DateFacture { get; set; }
    public DateOnly? DateEcheance { get; set; }
}

public class FactureCreateDto
{
    public int? EntrepriseId { get; set; }
    public string? EntrepriseNom { get; set; }
    public int? DevisId { get; set; }
    public string? NumeroFacture { get; set; }
    public string? TypeLot { get; set; }
    public DateOnly? DateFacture { get; set; }
    public DateOnly? DateEcheance { get; set; }
}
