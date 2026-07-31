using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Entreprise> Entreprises => Set<Entreprise>();
    public DbSet<Devis> Devis => Set<Devis>();
    public DbSet<LignePoste> LignesPoste => Set<LignePoste>();
    public DbSet<Facture> Factures => Set<Facture>();
    public DbSet<LigneFacture> LignesFacture => Set<LigneFacture>();
    public DbSet<LlmExchange> LlmExchanges => Set<LlmExchange>();
    public DbSet<PieceJointe> PiecesJointes => Set<PieceJointe>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Devis>()
            .Property(d => d.Statut)
            .HasConversion<string>();

        modelBuilder.Entity<Facture>()
            .Property(f => f.Statut)
            .HasConversion<string>();

        modelBuilder.Entity<Facture>()
            .Property(f => f.TypeFacture)
            .HasConversion<string>();

        modelBuilder.Entity<LlmExchange>()
            .Property(e => e.TypeDocument)
            .HasConversion<string>()
            .HasMaxLength(20); // borné pour permettre l'index

        modelBuilder.Entity<LlmExchange>()
            .HasIndex(e => new { e.TypeDocument, e.DocumentId });

        // Siret unique, plusieurs NULL autorisés (entreprises sans SIRET)
        modelBuilder.Entity<Entreprise>()
            .HasIndex(e => e.Siret)
            .IsUnique();

        // Longueur bornée pour permettre l'index unique
        modelBuilder.Entity<Devis>()
            .Property(d => d.NumeroDevis)
            .HasMaxLength(100);

        modelBuilder.Entity<Facture>()
            .Property(f => f.NumeroFacture)
            .HasMaxLength(100);

        modelBuilder.Entity<Entreprise>()
            .Property(e => e.Siret)
            .HasMaxLength(20);

        // Evite double import du même numéro de devis pour la même entreprise
        modelBuilder.Entity<Devis>()
            .HasIndex(d => new { d.EntrepriseId, d.NumeroDevis })
            .IsUnique()
            .HasFilter("\"NumeroDevis\" IS NOT NULL");

        // Evite double import du même numéro de facture pour la même entreprise
        modelBuilder.Entity<Facture>()
            .HasIndex(f => new { f.EntrepriseId, f.NumeroFacture })
            .IsUnique()
            .HasFilter("\"NumeroFacture\" IS NOT NULL");

        // Précision explicite requise sur PostgreSQL (pas de défaut MySQL decimal(65,30) à hériter).
        modelBuilder.Entity<Devis>().Property(d => d.TotalHt).HasPrecision(18, 2);
        modelBuilder.Entity<Devis>().Property(d => d.TvaTaux).HasPrecision(18, 2);
        modelBuilder.Entity<Devis>().Property(d => d.TvaMontant).HasPrecision(18, 2);
        modelBuilder.Entity<Devis>().Property(d => d.TotalTtc).HasPrecision(18, 2);

        modelBuilder.Entity<Facture>().Property(f => f.TotalHt).HasPrecision(18, 2);
        modelBuilder.Entity<Facture>().Property(f => f.TvaTaux).HasPrecision(18, 2);
        modelBuilder.Entity<Facture>().Property(f => f.TvaMontant).HasPrecision(18, 2);
        modelBuilder.Entity<Facture>().Property(f => f.TotalTtc).HasPrecision(18, 2);

        modelBuilder.Entity<LignePoste>().Property(l => l.Quantite).HasPrecision(18, 2);
        modelBuilder.Entity<LignePoste>().Property(l => l.PrixUnitaire).HasPrecision(18, 2);
        modelBuilder.Entity<LignePoste>().Property(l => l.TotalLigne).HasPrecision(18, 2);

        modelBuilder.Entity<LigneFacture>().Property(l => l.Quantite).HasPrecision(18, 2);
        modelBuilder.Entity<LigneFacture>().Property(l => l.PrixUnitaire).HasPrecision(18, 2);
        modelBuilder.Entity<LigneFacture>().Property(l => l.TotalLigne).HasPrecision(18, 2);

        modelBuilder.Entity<Devis>()
            .HasOne(d => d.Entreprise)
            .WithMany(e => e.Devis)
            .HasForeignKey(d => d.EntrepriseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<LignePoste>()
            .HasOne(l => l.Devis)
            .WithMany(d => d.Lignes)
            .HasForeignKey(l => l.DevisId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Facture>()
            .HasOne(f => f.Devis)
            .WithMany(d => d.Factures)
            .HasForeignKey(f => f.DevisId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Facture>()
            .HasOne(f => f.Entreprise)
            .WithMany(e => e.Factures)
            .HasForeignKey(f => f.EntrepriseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<LigneFacture>()
            .HasOne(l => l.Facture)
            .WithMany(f => f.Lignes)
            .HasForeignKey(l => l.FactureId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LigneFacture>()
            .HasOne(l => l.LignePoste)
            .WithMany()
            .HasForeignKey(l => l.LignePosteId)
            .OnDelete(DeleteBehavior.SetNull);

        // Bornes raisonnables sur les champs texte (pas d'index dessus, mais évite le type texte illimité par défaut)
        modelBuilder.Entity<PieceJointe>()
            .Property(p => p.NomFichier)
            .HasMaxLength(255);

        modelBuilder.Entity<PieceJointe>()
            .Property(p => p.CheminFichier)
            .HasMaxLength(500);

        modelBuilder.Entity<PieceJointe>()
            .Property(p => p.ContentType)
            .HasMaxLength(100);

        modelBuilder.Entity<PieceJointe>()
            .Property(p => p.Libelle)
            .HasMaxLength(255);

        modelBuilder.Entity<PieceJointe>()
            .HasOne(p => p.Facture)
            .WithMany(f => f.PiecesJointes)
            .HasForeignKey(p => p.FactureId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
