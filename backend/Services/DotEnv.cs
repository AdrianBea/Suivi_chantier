namespace backend.Services;

// ponytail: parseur .env minimal (clé=valeur, lignes vides/# ignorées) ; pas de dépendance
// DotNetEnv pour un besoin aussi simple.
public static class DotEnv
{
    public static void Load(string path)
    {
        if (!File.Exists(path)) return;

        foreach (var line in File.ReadAllLines(path))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#')) continue;

            var idx = trimmed.IndexOf('=');
            if (idx < 0) continue;

            var key = trimmed[..idx].Trim();
            var value = trimmed[(idx + 1)..].Trim();
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
