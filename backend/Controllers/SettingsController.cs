using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Data;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(ISettingsStore settingsStore, IHttpClientFactory httpClientFactory, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public ActionResult<FullSettingsDto> Get()
        => Ok(new FullSettingsDto(
            new LmStudioSettingsDto(settingsStore.LmStudio.BaseUrl, settingsStore.LmStudio.Model, settingsStore.LmStudio.ApiKey),
            new DatabaseSettingsDto(
                settingsStore.Database.Server,
                settingsStore.Database.Database,
                settingsStore.Database.User,
                settingsStore.Database.Password)));

    [HttpPut]
    public ActionResult Put([FromBody] FullSettingsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.LmStudio.BaseUrl) || string.IsNullOrWhiteSpace(dto.LmStudio.Model))
            return BadRequest("BaseUrl et Model sont requis.");

        settingsStore.UpdateLmStudio(dto.LmStudio.BaseUrl.Trim(), dto.LmStudio.Model.Trim(), (dto.LmStudio.ApiKey ?? "").Trim());
        settingsStore.UpdateDatabase(new DatabaseSettings
        {
            Server   = dto.Database.Server.Trim(),
            Database = dto.Database.Database.Trim(),
            User     = dto.Database.User.Trim(),
            Password = dto.Database.Password.Trim(),
        });

        return NoContent();
    }

    [HttpGet("models")]
    public async Task<ActionResult<LmStudioModelsDto>> GetModels([FromQuery] string? baseUrl, [FromQuery] string? apiKey)
    {
        // Utilise l'URL/clé du formulaire si fournies (test avant enregistrement), sinon celles persistées.
        var effective = new LmStudioSettings
        {
            BaseUrl = string.IsNullOrWhiteSpace(baseUrl) ? settingsStore.LmStudio.BaseUrl : baseUrl,
            ApiKey  = string.IsNullOrWhiteSpace(apiKey)  ? settingsStore.LmStudio.ApiKey  : apiKey,
        };
        var client = httpClientFactory.CreateClient("lmstudio");
        effective.ApplyAuth(client);
        baseUrl = effective.BaseUrl.TrimEnd('/');
        try
        {
            var response = await client.GetAsync($"{baseUrl}/models");
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<LmStudioModelsResponse>();
            var modelIds = body?.Data?.Select(m => m.Id).OrderBy(id => id, StringComparer.OrdinalIgnoreCase).ToList() ?? [];
            return Ok(new LmStudioModelsDto(modelIds));
        }
        catch (Exception ex)
        {
            return StatusCode(502, $"Impossible de joindre LM Studio : {ex.Message}");
        }
    }

    [HttpPost("test-db")]
    public async Task<ActionResult<TestResultDto>> TestDb()
    {
        var db = settingsStore.Database;
        var connStr = $"Server={db.Server};Database={db.Database};User={db.User};Password={db.Password};Connection Timeout=5;";
        try
        {
            await using var conn = new MySqlConnector.MySqlConnection(connStr);
            await conn.OpenAsync();
            return Ok(new TestResultDto(true, $"Connecté à {db.Database} sur {db.Server}."));
        }
        catch (Exception ex)
        {
            return Ok(new TestResultDto(false, ex.Message));
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
        var settings = settingsStore.LmStudio;
        var client = httpClientFactory.CreateClient("lmstudio");
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
                $"{settings.BaseUrl.TrimEnd('/')}/chat/completions", content);
            response.EnsureSuccessStatusCode();
            return Ok(new TestResultDto(true, "Connexion réussie."));
        }
        catch (Exception ex)
        {
            return Ok(new TestResultDto(false, ex.Message));
        }
    }
}

public record LmStudioSettingsDto(string BaseUrl, string Model, string ApiKey);
public record DatabaseSettingsDto(string Server, string Database, string User, string Password);
public record FullSettingsDto(LmStudioSettingsDto LmStudio, DatabaseSettingsDto Database);
public record LmStudioModelsDto(List<string> Models);
public record TestResultDto(bool Success, string Message);

file class LmStudioModelsResponse
{
    [JsonPropertyName("data")] public List<ModelEntry>? Data { get; set; }
}

file class ModelEntry
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
}
