using PDFtoImage;
using SkiaSharp;

namespace backend.Services;

public interface IPdfImageService
{
    Task<List<byte[]>> ConvertToImagesAsync(byte[] pdfData);

    /// <summary>Texte de chaque page du PDF (une string par page). Vide si pas de couche texte (PDF scanné).</summary>
    List<string> ExtractTextPages(byte[] pdfData);
}

public class PdfImageService : IPdfImageService
{
    public Task<List<byte[]>> ConvertToImagesAsync(byte[] pdfData)
    {
        var images = new List<byte[]>();

        using var pdfStream = new MemoryStream(pdfData);
        var bitmaps = Conversion.ToImages(pdfStream);

        foreach (var bitmap in bitmaps)
        {
            using var image = SKImage.FromBitmap(bitmap);
            using var data = image.Encode(SKEncodedImageFormat.Png, 100);
            images.Add(data.ToArray());
            bitmap.Dispose();
        }

        return Task.FromResult(images);
    }

    public List<string> ExtractTextPages(byte[] pdfData)
    {
        // PdfPig lit la couche texte native ; un PDF scanné renvoie des pages vides -> le fallback image se déclenche en amont.
        using var doc = UglyToad.PdfPig.PdfDocument.Open(pdfData);
        return doc.GetPages().Select(p => p.Text).ToList();
    }
}
