using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.Services;

public record LlmCallResult(string Content, int DureeMs, bool Succes, string? Erreur);

public interface IOpenRouterService
{
    Task<LlmCallResult> ExtractStructuredJsonAsync(List<byte[]> images, string systemPrompt, string userPrompt);
    Task<LlmCallResult> ExtractStructuredJsonFromTextAsync(List<string> pageTexts, string systemPrompt, string userPrompt);
}

public class OpenRouterService(IHttpClientFactory httpClientFactory, ISettingsStore settingsStore, ILogger<OpenRouterService> logger) : IOpenRouterService
{
    internal const string BaseUrl = "https://openrouter.ai/api/v1";

    public Task<LlmCallResult> ExtractStructuredJsonAsync(
        List<byte[]> images,
        string systemPrompt,
        string userPrompt)
    {
        var contentParts = new List<object>();

        foreach (var bytes in images)
        {
            var base64 = Convert.ToBase64String(bytes);
            contentParts.Add(new
            {
                type = "image_url",
                image_url = new { url = $"data:image/png;base64,{base64}" }
            });
        }

        contentParts.Add(new { type = "text", text = userPrompt });

        return SendAsync(systemPrompt, contentParts);
    }

    public async Task<LlmCallResult> ExtractStructuredJsonFromTextAsync(
        List<string> pageTexts,
        string systemPrompt,
        string userPrompt)
    {
        // Mode texte : le message user est une simple string (format OpenAI standard, déjà validé par SettingsController.Test).
        // Les coordonnées bancaires sont masquées ici : le filtre d'OpenRouter rejette sinon
        // la requête en 403 [CREDIT_CARD], et elles ne servent pas à l'extraction.
        var pagesMasquees = pageTexts.Select(TextSanitizer.Masquer);
        var userContent = userPrompt + "\n\n" + string.Join("\n\n--- page ---\n\n", pagesMasquees);
        return await SendAsync(systemPrompt, userContent);
    }

    private async Task<LlmCallResult> SendAsync(string systemPrompt, object userContent)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var settings = settingsStore.OpenRouter;
        var httpClient = httpClientFactory.CreateClient("openrouter");
        httpClient.BaseAddress = new Uri(BaseUrl.TrimEnd('/') + '/');
        httpClient.Timeout = TimeSpan.FromMinutes(5);
        settings.ApplyAuth(httpClient);

        var requestBody = new
        {
            model = settings.Model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userContent }
            },
            temperature = 0.1,
            max_tokens = 4096
        };

        var json = JsonSerializer.Serialize(requestBody);
        // Métadonnées seulement : les logs d'hébergement sont consultables hors du modèle
        // d'autorisation de l'app, le contenu des documents ne doit pas y figurer.
        logger.LogInformation(
            "OpenRouter requête → url={Url} modèle={Model} apiKeyPresente={HasKey} tailleBody={BodyBytes}o",
            httpClient.BaseAddress + "chat/completions",
            settings.Model,
            !string.IsNullOrWhiteSpace(settings.ApiKey),
            Encoding.UTF8.GetByteCount(json));
        // Le contenu reste disponible pour le debug en dev, et en base via LlmExchange.
        var userContentPreview = userContent is string s ? Truncate(s, 2000) : "[contenu multimodal (images)]";
        logger.LogDebug(
            "OpenRouter requête (contenu) → systemPrompt={SystemPromptPreview} userContent={UserContentPreview}",
            Truncate(systemPrompt, 500),
            userContentPreview);

        try
        {
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("chat/completions", content);
            var headers = string.Join(", ", response.Headers
                .Where(h => h.Key is "x-ratelimit-remaining" or "x-ratelimit-limit" or "retry-after")
                .Select(h => $"{h.Key}={string.Join('/', h.Value)}"));

            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                logger.LogError(
                    "OpenRouter réponse en erreur ← statut={StatusCode} après {DureeMs}ms headers=[{Headers}] body={Body}",
                    (int)response.StatusCode, sw.ElapsedMilliseconds, headers, Truncate(errBody, 4000));

                if (errBody.Contains("content filter", StringComparison.OrdinalIgnoreCase))
                    logger.LogError(
                        "OpenRouter a bloqué la requête via son filtre de contenu : le document envoyé contient "
                        + "une séquence non masquée par TextSanitizer (coordonnées bancaires ou assimilées).");
                return new LlmCallResult("", (int)sw.ElapsedMilliseconds, false,
                    $"HTTP {(int)response.StatusCode} : {errBody}");
            }

            var rawBody = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<OpenRouterResponse>(rawBody);
            var contentText = result?.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
            logger.LogInformation(
                "OpenRouter réponse ← statut={StatusCode} en {DureeMs}ms modèle={Model} headers=[{Headers}] tailleReponse={ContentLength}car",
                (int)response.StatusCode, sw.ElapsedMilliseconds, settings.Model, headers, contentText.Length);
            logger.LogDebug("OpenRouter réponse (contenu) ← {ContentPreview}", Truncate(contentText, 1000));

            if (string.IsNullOrWhiteSpace(contentText))
                logger.LogWarning("OpenRouter réponse 200 mais contenu vide, body brut={RawBody}", Truncate(rawBody, 2000));

            return new LlmCallResult(contentText, (int)sw.ElapsedMilliseconds, true, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "OpenRouter appel échoué après {DureeMs}ms, type={ExceptionType} url={Url} modèle={Model}",
                sw.ElapsedMilliseconds, ex.GetType().Name, httpClient.BaseAddress + "chat/completions", settings.Model);
            return new LlmCallResult("", (int)sw.ElapsedMilliseconds, false, ex.Message);
        }
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + $"...[tronqué, {s.Length}car au total]";
}

file class OpenRouterResponse
{
    [JsonPropertyName("choices")]
    public List<Choice>? Choices { get; set; }
}

file class Choice
{
    [JsonPropertyName("message")]
    public Message? Message { get; set; }
}

file class Message
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
