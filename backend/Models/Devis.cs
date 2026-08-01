namespace backend.Models;

public enum StatutExtraction { EnAttente, Extrait, Erreur }

public enum TypeLot
{
    TerrassementVrd,
    GrosOeuvre,
    CharpenteCouverture,
    Menuiserie,
    Platrerie,
    PlomberieSanitaire,
    Electricite,
    IsolationAuSol,
    Chauffage,
    ChapeLiquide,
    Carrelage,
    IsolationDesCombles,
    Facades,
    Permis,
    MaitriseOeuvre
}

public class Devis
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int? EntrepriseId { get; set; }
    public Entreprise? Entreprise { get; set; }
    public string? NumeroDevis { get; set; }
    public string? Lot { get; set; }
    public TypeLot? TypeLot { get; set; }
    public DateOnly? DateDevis { get; set; }
    public DateOnly? DateValidite { get; set; }
    public string? DelaiExecution { get; set; }
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

    public ICollection<LignePoste> Lignes { get; set; } = [];
    public ICollection<Facture> Factures { get; set; } = [];
}
