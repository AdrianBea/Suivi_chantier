namespace backend.Models;

public enum TypeDocument { Devis, Facture }

/// <summary>
/// Trace d'un appel au LLM : ce qui a été envoyé, ce qui est revenu, combien de temps,
/// et si ça a réussi. Un enregistrement par batch de pages.
/// </summary>
public class LlmExchange
{
    public int Id { get; set; }
    public TypeDocument TypeDocument { get; set; }
    public int DocumentId { get; set; }
    public int Batch { get; set; }
    public string Modele { get; set; } = "";
    public string SystemPrompt { get; set; } = "";
    public string UserPrompt { get; set; } = "";
    public int NbImages { get; set; }
    public string? ReponseBrute { get; set; }
    public int DureeMs { get; set; }
    public bool Succes { get; set; }
    public string? Erreur { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
