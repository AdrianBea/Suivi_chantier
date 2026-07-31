namespace backend.DTOs;

public record LlmExchangeDto(
    int Id,
    int Batch,
    string Modele,
    string SystemPrompt,
    string UserPrompt,
    int NbImages,
    string? ReponseBrute,
    int DureeMs,
    bool Succes,
    string? Erreur,
    DateTime CreatedAt);
