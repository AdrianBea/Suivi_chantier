using System.Text.Json;
using System.Text.Json.Nodes;

namespace backend.Services;

public class LmStudioSettings
{
    public string BaseUrl { get; set; } = "http://localhost:1234/v1/";
    public string Model { get; set; } = "local-model";
    public string ApiKey { get; set; } = "";

    // OpenRouter et LM Studio parlent la même API OpenAI ; la seule différence est ce header.
    public void ApplyAuth(HttpClient client)
    {
        if (!string.IsNullOrWhiteSpace(ApiKey))
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ApiKey);
    }
}

public class DatabaseSettings
{
    public string Server { get; set; } = "localhost";
    public string Database { get; set; } = "";
    public string User { get; set; } = "";
    public string Password { get; set; } = "";

    public static DatabaseSettings FromConnectionString(string cs)
    {
        var parts = cs.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0].Trim().ToLowerInvariant(), p => p[1].Trim());

        return new DatabaseSettings
        {
            Server   = parts.GetValueOrDefault("server") ?? "localhost",
            Database = parts.GetValueOrDefault("database") ?? "",
            User     = parts.GetValueOrDefault("user") ?? "",
            Password = parts.GetValueOrDefault("password") ?? "",
        };
    }

    public string ToConnectionString()
        => $"Server={Server};Database={Database};User={User};Password={Password};";
}

public interface ISettingsStore
{
    LmStudioSettings LmStudio { get; }
    DatabaseSettings Database { get; }
    void UpdateLmStudio(string baseUrl, string model, string apiKey);
    void UpdateDatabase(DatabaseSettings db);
}

public class SettingsStore : ISettingsStore
{
    private readonly string _appSettingsPath;
    private LmStudioSettings _lmStudio;
    private DatabaseSettings _database;

    public SettingsStore(IConfiguration config, IWebHostEnvironment env)
    {
        _appSettingsPath = Path.Combine(env.ContentRootPath, "appsettings.json");

        _lmStudio = new LmStudioSettings
        {
            BaseUrl = config["LmStudio:BaseUrl"] ?? "http://localhost:1234/v1/",
            Model   = config["LmStudio:Model"]   ?? "local-model",
            ApiKey  = config["LmStudio:ApiKey"]  ?? ""
        };

        var cs = config.GetConnectionString("Default") ?? "";
        _database = DatabaseSettings.FromConnectionString(cs);
    }

    public LmStudioSettings LmStudio => _lmStudio;
    public DatabaseSettings Database => _database;

    public void UpdateLmStudio(string baseUrl, string model, string apiKey)
    {
        _lmStudio = new LmStudioSettings { BaseUrl = baseUrl, Model = model, ApiKey = apiKey };
        PersistToJson(json =>
        {
            json["LmStudio"] ??= new JsonObject();
            json["LmStudio"]!["BaseUrl"] = baseUrl;
            json["LmStudio"]!["Model"]   = model;
            json["LmStudio"]!["ApiKey"]  = apiKey;
        });
    }

    public void UpdateDatabase(DatabaseSettings db)
    {
        _database = db;
        PersistToJson(json =>
        {
            json["ConnectionStrings"] ??= new JsonObject();
            json["ConnectionStrings"]!["Default"] = db.ToConnectionString();
        });
    }

    private void PersistToJson(Action<JsonObject> mutate)
    {
        var text = File.ReadAllText(_appSettingsPath);
        var root = JsonNode.Parse(text)?.AsObject() ?? new JsonObject();
        mutate(root);
        File.WriteAllText(_appSettingsPath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }
}
