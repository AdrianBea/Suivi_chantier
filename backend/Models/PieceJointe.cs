namespace backend.Models;

/// <summary>
/// Document annexe attaché à une facture (preuve de paiement, photo, etc.).
/// Simple fichier stocké sur disque et référencé en base : ne passe PAS par le
/// pipeline d'extraction LLM (pas de StatutExtraction, pas de comparaison).
/// </summary>
public class PieceJointe
{
    public int Id { get; set; }
    public int FactureId { get; set; }
    public Facture Facture { get; set; } = null!;
    public string NomFichier { get; set; } = string.Empty;
    public string CheminFichier { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long TailleOctets { get; set; }
    public string? Libelle { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
