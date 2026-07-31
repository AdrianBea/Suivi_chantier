using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;

DotEnv.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables(prefix: "SUIVI_CHANTIER_");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<ISettingsStore, SettingsStore>();

// La connection string est fixée au démarrage via appsettings/.env (ConnectionStrings:Default).
builder.Services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")));
builder.Services.AddHttpClient("openrouter");
builder.Services.AddTransient<IOpenRouterService, OpenRouterService>();

builder.Services.AddScoped<IPdfImageService, PdfImageService>();
builder.Services.AddScoped<IExtractionService, ExtractionService>();
builder.Services.AddScoped<IComparaisonService, ComparaisonService>();

builder.Services.AddCors(opt => opt.AddPolicy("frontend", p =>
    p.WithOrigins("http://localhost:3000").AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseAuthorization();
app.MapControllers();
app.Run();
