namespace backend.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsAdmin { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateOnly? DateDebutChantier { get; set; }
    public DateOnly? DateLivraisonPrevue { get; set; }
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public string? Adresse { get; set; }
}
