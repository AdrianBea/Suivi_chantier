namespace backend.DTOs;

public record AdminUserDto(
    int Id,
    string Email,
    string? Nom,
    string? Prenom,
    bool IsAdmin,
    DateTime CreatedAt,
    int NbDevis,
    int NbFactures,
    int NbEntreprises,
    long OctetsStockes);

public record SetAdminDto(bool IsAdmin);

/// <summary>
/// Version allégée de <see cref="LlmExchangeDto"/> pour les listes :
/// sans les prompts ni la réponse brute, qui pèsent plusieurs Ko chacun.
/// </summary>
public record LlmExchangeListDto(
    int Id,
    string TypeDocument,
    int DocumentId,
    int Batch,
    string Modele,
    int NbImages,
    int DureeMs,
    bool Succes,
    string? Erreur,
    DateTime CreatedAt);

public record ModeleStatDto(string Modele, int Total, int Echecs, double DureeMoyenneMs);

public record JourStatDto(DateOnly Jour, int Total, int Echecs);

public record LlmStatsDto(
    int Total,
    int Echecs,
    double TauxSucces,
    double DureeMoyenneMs,
    int DureeP95Ms,
    List<ModeleStatDto> ParModele,
    List<JourStatDto> SeptDerniersJours);

public record HealthDto(
    bool DbConnectee,
    string Version,
    double UptimeHeures,
    int NbUtilisateurs,
    long TailleBaseOctets,
    long OctetsPdfStockes,
    int DevisEnErreur,
    int FacturesEnErreur);
