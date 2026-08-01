namespace backend.DTOs;

public class ComparaisonDto
{
    public int FactureId { get; set; }
    public int DevisId { get; set; }
    public string EntrepriseNom { get; set; } = string.Empty;
    public decimal? TotalTtcDevis { get; set; }
    public decimal? TotalTtcFacture { get; set; }
    public decimal EcartTotalTtc { get; set; }
    public bool HasDiscrepancies { get; set; }
    // "Lignes" si la facture contient des lignes détaillées, "Total" sinon
    public string ModeComparaison { get; set; } = "Lignes";
    // Cumul TTC de toutes les autres factures (acomptes) liées au même devis
    public decimal MontantDejaFacture { get; set; }
    // Devis.TotalTtc - MontantDejaFacture (peut être négatif si sur-facturé)
    public decimal ResteAFacturer { get; set; }
    public List<LigneComparaisonDto> Lignes { get; set; } = [];
}

public class LigneComparaisonDto
{
    public int FactureLigneId { get; set; }
    public int? DevisLigneId { get; set; }
    public string DescriptionFacture { get; set; } = string.Empty;
    public string? DescriptionDevis { get; set; }
    public decimal? QuantiteDevis { get; set; }
    public decimal? QuantiteFacture { get; set; }
    public decimal? PrixUnitaireDevis { get; set; }
    public decimal? PrixUnitaireFacture { get; set; }
    public decimal? EcartPrix { get; set; }
    public decimal? EcartQuantite { get; set; }
    public bool NonMatche { get; set; }
}
