namespace backend.Models;

public class LigneFacture
{
    public int Id { get; set; }
    public int FactureId { get; set; }
    public Facture Facture { get; set; } = null!;
    public int? LignePosteId { get; set; }
    public LignePoste? LignePoste { get; set; }
    public int Ordre { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal? Quantite { get; set; }
    public string? Unite { get; set; }
    public decimal? PrixUnitaire { get; set; }
    public decimal? TotalLigne { get; set; }
}
