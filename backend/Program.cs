using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<ISettingsStore, SettingsStore>();

// La connection string est relue depuis le SettingsStore (singleton, à jour) à chaque
// création de contexte => changer la BDD dans les paramètres prend effet sans redémarrage.
var bootstrapCs = builder.Configuration.GetConnectionString("Default")!;
var serverVersion = ServerVersion.AutoDetect(bootstrapCs);
builder.Services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseMySql(sp.GetRequiredService<ISettingsStore>().Database.ToConnectionString(), serverVersion));
builder.Services.AddHttpClient("lmstudio");
builder.Services.AddTransient<ILmStudioService, LmStudioService>();

builder.Services.AddScoped<IPdfImageService, PdfImageService>();
builder.Services.AddScoped<IExtractionService, ExtractionService>();
builder.Services.AddScoped<IComparaisonService, ComparaisonService>();

builder.Services.AddCors(opt => opt.AddPolicy("frontend", p =>
    p.WithOrigins("http://localhost:3000").AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseAuthorization();
app.MapControllers();
app.Run();
