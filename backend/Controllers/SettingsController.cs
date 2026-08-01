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
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                return Ok(new TestResultDto(false,
                    $"HTTP {(int)response.StatusCode} {response.ReasonPhrase} — {Truncate(errorBody)}"));
            }
            return Ok(new TestResultDto(true, "Connexion réussie."));
        }
        catch (TaskCanceledException)
        {
            return Ok(new TestResultDto(false, "Délai dépassé (30s) : OpenRouter n'a pas répondu à temps."));
        }
        catch (HttpRequestException ex)
        {
            return Ok(new TestResultDto(false, $"Erreur réseau : {ex.Message}"));
        }
        catch (Exception ex)
        {
            return Ok(new TestResultDto(false, $"{ex.GetType().Name} : {ex.Message}"));
        }
    }

    private static string Truncate(string s, int max = 500)
        => string.IsNullOrEmpty(s) ? "(réponse vide)" : s.Length > max ? s[..max] + "…" : s;
}

public record OpenRouterSettingsDto(string Model, string ApiKey);
public record TestResultDto(bool Success, string Message);
