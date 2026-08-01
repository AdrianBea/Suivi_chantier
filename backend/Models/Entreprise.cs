namespace backend.Models;

public class Entreprise
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string? Siret { get; set; }
    public string? ContactNom { get; set; }
    public string? ContactTel { get; set; }
    public string? ContactEmail { get; set; }
    public string? Adresse { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Devis> Devis { get; set; } = [];
    public ICollection<Facture> Factures { get; set; } = [];
}
