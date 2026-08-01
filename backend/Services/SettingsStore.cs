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
    void UpdateOpenRouter(string model, string apiKey);
}

public class SettingsStore : ISettingsStore
{
    private readonly string _envPath;
    private OpenRouterSettings _openRouter;

    public SettingsStore(IConfiguration config, IWebHostEnvironment env)
    {
        _envPath = Path.Combine(env.ContentRootPath, ".env");

        _openRouter = new OpenRouterSettings
        {
            Model  = config["OpenRouter:Model"]  ?? "",
            ApiKey = config["OpenRouter:ApiKey"] ?? ""
        };
    }

    public OpenRouterSettings OpenRouter => _openRouter;

    public void UpdateOpenRouter(string model, string apiKey)
    {
        _openRouter = new OpenRouterSettings { Model = model, ApiKey = apiKey };
        PersistEnvValue("SUIVI_CHANTIER_OpenRouter__ApiKey", apiKey);
        PersistEnvValue("SUIVI_CHANTIER_OpenRouter__Model", model);
    }

    // ponytail: réécrit modèle et clé dans backend/.env (gitignoré) — sans ça le modèle
    // choisi dans Paramètres était perdu à chaque redémarrage.
    private void PersistEnvValue(string key, string value)
    {
        var lines = File.Exists(_envPath) ? File.ReadAllLines(_envPath).ToList() : [];
        var idx = lines.FindIndex(l => l.TrimStart().StartsWith(key + "="));
        var line = $"{key}={value}";
        if (idx >= 0) lines[idx] = line;
        else lines.Add(line);
        File.WriteAllLines(_envPath, lines);
    }
}
