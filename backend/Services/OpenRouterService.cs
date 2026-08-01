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

public class OpenRouterService(IHttpClientFactory httpClientFactory, ISettingsStore settingsStore) : IOpenRouterService
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
        var userContent = userPrompt + "\n\n" + string.Join("\n\n--- page ---\n\n", pageTexts);
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
        try
        {
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("chat/completions", content);
            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                return new LlmCallResult("", (int)sw.ElapsedMilliseconds, false,
                    $"HTTP {(int)response.StatusCode} : {errBody}");
            }

            var result = await response.Content.ReadFromJsonAsync<OpenRouterResponse>();
            var contentText = result?.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
            return new LlmCallResult(contentText, (int)sw.ElapsedMilliseconds, true, null);
        }
        catch (Exception ex)
        {
            return new LlmCallResult("", (int)sw.ElapsedMilliseconds, false, ex.Message);
        }
    }
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
