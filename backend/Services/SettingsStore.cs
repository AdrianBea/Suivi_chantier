namespace backend.Services;

public class OpenRouterSettings
{
    public string Model { get; set; } = "";
    public string ApiKey { get; set; } = "";

    public void ApplyAuth(HttpClient client)
    {
        if (!string.IsNullOrWhiteSpace(ApiKey))
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ApiKey);
    }
}

public interface ISettingsStore
{
    OpenRouterSettings OpenRouter { get; }
}

public class SettingsStore : ISettingsStore
{
    public SettingsStore(IConfiguration config)
    {
        OpenRouter = new OpenRouterSettings
        {
            Model  = config["OpenRouter:Model"]  ?? "",
            ApiKey = config["OpenRouter:ApiKey"] ?? ""
        };
    }

    public OpenRouterSettings OpenRouter { get; }
}
