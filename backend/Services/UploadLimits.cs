namespace backend.Services;

/// <summary>
/// Limites d'upload partagées. La valeur doit rester alignée sur les DEUX couches
/// situées en amont, sinon un fichier trop gros est tronqué au lieu d'être rejeté :
///   - proxy Next (frontend/next.config.ts -> experimental.proxyClientMaxBodySize)
///   - Kestrel (backend/Program.cs -> MaxRequestBodySize)
/// </summary>
public static class UploadLimits
{
    public const long MaxBytes = 25 * 1024 * 1024;
    public const string MaxLabel = "25 Mo";

    /// <summary>
    /// Valide un PDF sur sa signature réelle plutôt que sur le ContentType et le nom de
    /// fichier, tous deux fournis par le client. Retourne le message d'erreur, ou null si OK.
    /// </summary>
    public static string? ValidatePdf(IFormFile? file, byte[] contenu)
    {
        if (file == null || file.Length == 0) return "Fichier manquant.";
        if (file.Length > MaxBytes) return $"Le fichier ne doit pas dépasser {MaxLabel}.";
        // %PDF- : les 5 premiers octets de tout PDF (ISO 32000-1 §7.5.2).
        if (contenu.Length < 5 || contenu[0] != 0x25 || contenu[1] != 0x50
            || contenu[2] != 0x44 || contenu[3] != 0x46 || contenu[4] != 0x2D)
            return "Le fichier n'est pas un PDF valide.";
        return null;
    }

    internal static void Demo()
    {
        // Un .jpg renommé en .pdf déclaré application/pdf passait l'ancienne validation
        // (OU logique sur des données fournies par le client) : la signature doit le rejeter.
        var jpeg = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 };
        var pdf = System.Text.Encoding.ASCII.GetBytes("%PDF-1.7\n%âãÏÓ");

        System.Diagnostics.Debug.Assert(
            ValidatePdf(new FakeFile(pdf.Length), pdf) is null, "un vrai PDF doit être accepté");
        System.Diagnostics.Debug.Assert(
            ValidatePdf(new FakeFile(jpeg.Length), jpeg) is not null, "un JPEG déguisé doit être rejeté");
        System.Diagnostics.Debug.Assert(
            ValidatePdf(new FakeFile(MaxBytes + 1), pdf) is not null, "au-delà de la limite doit être rejeté");
        System.Diagnostics.Debug.Assert(
            ValidatePdf(null, []) is not null, "un fichier absent doit être rejeté");
    }

    // ponytail: seul Length est lu par ValidatePdf, le reste du contrat IFormFile ne sert pas.
    private sealed class FakeFile(long length) : IFormFile
    {
        public long Length => length;
        public string ContentType => "application/pdf";
        public string FileName => "test.pdf";
        public string Name => "file";
        public string ContentDisposition => "";
        public IHeaderDictionary Headers => new HeaderDictionary();
        public void CopyTo(Stream target) => throw new NotSupportedException();
        public Task CopyToAsync(Stream target, CancellationToken token = default) => throw new NotSupportedException();
        public Stream OpenReadStream() => throw new NotSupportedException();
    }
}
