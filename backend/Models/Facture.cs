namespace backend.Models;

public enum TypeFacture { Facture, Acompte, Solde }

public class Facture
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int? DevisId { get; set; }
    public Devis? Devis { get; set; }
    public int? EntrepriseId { get; set; }
    public Entreprise? Entreprise { get; set; }
    public string? NumeroFacture { get; set; }
    public TypeFacture TypeFacture { get; set; } = TypeFacture.Facture;
    public TypeLot? TypeLot { get; set; }
    public DateOnly? DateFacture { get; set; }
    public DateOnly? DateEcheance { get; set; }
    public decimal? TotalHt { get; set; }
    public decimal? TvaTaux { get; set; }
    public decimal? TvaMontant { get; set; }
    public decimal? TotalTtc { get; set; }
    public StatutExtraction Statut { get; set; } = StatutExtraction.EnAttente;
    public byte[]? FichierPdfData { get; set; }
    public string? FichierPdfNom { get; set; }
    public string? ExtractionBrute { get; set; }
    public string? ReponseBrute { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<LigneFacture> Lignes { get; set; } = [];
    public ICollection<PieceJointe> PiecesJointes { get; set; } = [];
}
