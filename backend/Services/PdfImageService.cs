using PDFtoImage;
using SkiaSharp;

namespace backend.Services;

public interface IPdfImageService
{
    Task<List<string>> ConvertToImagesAsync(string pdfPath, string outputDir);

    /// <summary>Texte de chaque page du PDF (une string par page). Vide si pas de couche texte (PDF scanné).</summary>
    List<string> ExtractTextPages(string pdfPath);
}

public class PdfImageService : IPdfImageService
{
    public async Task<List<string>> ConvertToImagesAsync(string pdfPath, string outputDir)
    {
        Directory.CreateDirectory(outputDir);
        var paths = new List<string>();

        await using var pdfStream = File.OpenRead(pdfPath);
        var bitmaps = Conversion.ToImages(pdfStream);

        int pageIndex = 0;
        foreach (var bitmap in bitmaps)
        {
            var outputPath = Path.Combine(outputDir, $"page-{pageIndex:D3}.png");
            using var image = SKImage.FromBitmap(bitmap);
            using var data = image.Encode(SKEncodedImageFormat.Png, 100);
            await File.WriteAllBytesAsync(outputPath, data.ToArray());
            paths.Add(outputPath);
            bitmap.Dispose();
            pageIndex++;
        }

        return paths;
    }

    public List<string> ExtractTextPages(string pdfPath)
    {
        // PdfPig lit la couche texte native ; un PDF scanné renvoie des pages vides -> le fallback image se déclenche en amont.
        using var doc = UglyToad.PdfPig.PdfDocument.Open(pdfPath);
        return doc.GetPages().Select(p => p.Text).ToList();
    }
}
