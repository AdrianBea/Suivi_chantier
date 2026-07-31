namespace backend.Models;

public class LignePoste
{
    public int Id { get; set; }
    public int DevisId { get; set; }
    public Devis Devis { get; set; } = null!;
    public int Ordre { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal? Quantite { get; set; }
    public string? Unite { get; set; }
    public decimal? PrixUnitaire { get; set; }
    public decimal? TotalLigne { get; set; }
}
