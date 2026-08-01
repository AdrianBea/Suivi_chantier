using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Data;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize(Policy = "AdminOnly")]
public class SettingsController(ISettingsStore settingsStore, IHttpClientFactory httpClientFactory, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public ActionResult<OpenRouterSettingsDto> Get()
        => Ok(new OpenRouterSettingsDto(settingsStore.OpenRouter.Model, Mask(settingsStore.OpenRouter.ApiKey)));

    // Ne renvoie jamais le secret en clair : les 4 derniers caractères suffisent à le reconnaître.
    private static string Mask(string secret)
        => string.IsNullOrEmpty(secret) ? "" : new string('•', 8) + secret[^Math.Min(4, secret.Length)..];

    // La clé API n'est plus modifiable depuis le front, uniquement via backend/.env : seul le modèle est éditable.
    public record UpdateModelDto(string Model);

    [HttpPut]
    public ActionResult Put([FromBody] UpdateModelDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Model))
            return BadRequest("Model est requis.");

        settingsStore.UpdateOpenRouter(dto.Model.Trim(), settingsStore.OpenRouter.ApiKey);

        return NoContent();
    }

    [HttpPost("models")]
    public async Task<ActionResult<OpenRouterModelsDto>> GetModels()
    {
        var client = httpClientFactory.CreateClient("openrouter");
        settingsStore.OpenRouter.ApplyAuth(client);
        try
        {
            var response = await client.GetAsync($"{OpenRouterService.BaseUrl}/models");
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<OpenRouterModelsResponse>();
            var modelIds = body?.Data?.Select(m => m.Id).OrderBy(id => id, StringComparer.OrdinalIgnoreCase).ToList() ?? [];
            return Ok(new OpenRouterModelsDto(modelIds));
        }
        catch (Exception ex)
        {
            return StatusCode(502, $"Impossible de joindre OpenRouter : {ex.Message}");
        }
    }

    [HttpPost("reset")]
    public async Task<ActionResult> Reset()
    {
        // ponytail: ExecuteDelete par table, ordre FK (Factures/Devis avant Entreprises).
        // Les lignes partent en cascade. Passer à un TRUNCATE brut si le volume grossit.
        await db.LlmExchanges.ExecuteDeleteAsync();
        await db.Factures.ExecuteDeleteAsync();
        await db.Devis.ExecuteDeleteAsync();
        await db.Entreprises.ExecuteDeleteAsync();
        return NoContent();
    }

    [HttpPost("test")]
    public async Task<ActionResult<TestResultDto>> Test()
    {
        var settings = settingsStore.OpenRouter;
        var client = httpClientFactory.CreateClient("openrouter");
        client.Timeout = TimeSpan.FromSeconds(30);
        settings.ApplyAuth(client);
        try
        {
            var body = new
            {
                model = settings.Model,
                messages = new[] { new { role = "user", content = "Hi" } },
                max_tokens = 1
            };
            var json = JsonSerializer.Serialize(body);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(
                $"{OpenRouterService.BaseUrl}/chat/completions", content);
            response.EnsureSuccessStatusCode();
            return Ok(new TestResultDto(true, "Connexion réussie."));
        }
        catch (Exception ex)
        {
            return Ok(new TestResultDto(false, ex.Message));
        }
    }
}

public record OpenRouterSettingsDto(string Model, string ApiKey);
public record OpenRouterModelsDto(List<string> Models);
public record TestResultDto(bool Success, string Message);

file class OpenRouterModelsResponse
{
    [JsonPropertyName("data")] public List<ModelEntry>? Data { get; set; }
}

file class ModelEntry
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
}
