namespace backend.Models;

/// <summary>
/// Document annexe attaché à une facture (preuve de paiement, photo, etc.).
/// Binaire stocké en base : ne passe PAS par le pipeline d'extraction LLM
/// (pas de StatutExtraction, pas de comparaison).
/// </summary>
public class PieceJointe
{
    public int Id { get; set; }
    public int FactureId { get; set; }
    public Facture Facture { get; set; } = null!;
    public string NomFichier { get; set; } = string.Empty;
    public byte[] Data { get; set; } = [];
    public string ContentType { get; set; } = string.Empty;
    public long TailleOctets { get; set; }
    public string? Libelle { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
