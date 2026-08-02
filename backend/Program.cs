using System.Threading.RateLimiting;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

DotEnv.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables(prefix: "SUIVI_CHANTIER_");

// Doit rester aligné sur UploadLimits.MaxBytes et sur proxyClientMaxBodySize (front),
// sinon un upload trop gros est tronqué en amont au lieu d'être rejeté proprement.
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = UploadLimits.MaxBytes);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Derrière le proxy Railway, RemoteIpAddress est celle du proxy : sans ceci tous les
// visiteurs partagent un seul compteur (un attaquant bloque le login de tout le monde).
// KnownNetworks/Proxies vidés car l'IP du proxy Railway n'est pas connue à l'avance et
// n'est joignable que par lui — le backend n'est pas exposé en direct.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

// ponytail: rate limiter natif .NET 8, fenêtre fixe par IP sur les routes d'auth uniquement.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "inconnu",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5) }));
});

builder.Services.AddSingleton<ISettingsStore, SettingsStore>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// La connection string est fixée au démarrage via appsettings/.env (ConnectionStrings:Default).
builder.Services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Default"),
        // ponytail: Railway met la DB en veille après inactivité ; le retry absorbe le délai de réveil au lieu de faire échouer le 1er login.
        npgsql => npgsql.EnableRetryOnFailure(maxRetryCount: 6, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null)));
builder.Services.AddHttpClient("openrouter");
builder.Services.AddTransient<IOpenRouterService, OpenRouterService>();

builder.Services.AddScoped<IPdfImageService, PdfImageService>();
builder.Services.AddScoped<IExtractionService, ExtractionService>();
builder.Services.AddScoped<IComparaisonService, ComparaisonService>();

// En prod le front passe par le proxy same-origin de Next : aucune politique CORS n'est
// nécessaire. L'enregistrer quand même ouvrirait un accès cross-origin authentifié
// (AllowCredentials) depuis un localhost:3000 hostile vers le backend public.
if (builder.Environment.IsDevelopment())
    builder.Services.AddCors(opt => opt.AddPolicy("frontend", p =>
        p.WithOrigins("http://localhost:3000").AllowAnyMethod().AllowAnyHeader().AllowCredentials()));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "suivi_chantier_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        // ponytail: SameSite=Lax + SecurePolicy dev-friendly ; à revoir si front/back finissent sur des domaines différents en prod.
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        // 7 j et non 30 : le ticket est auto-porteur, un cookie volé reste valable jusqu'à
        // expiration (aucune révocation côté serveur) et le claim IsAdmin est figé au login.
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
    });

builder.Services.AddAuthorization(options =>
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("IsAdmin", "True")));

builder.Services.AddHttpLogging(o =>
{
    o.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestMethod
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration;
});

var app = builder.Build();

// Doit précéder tout ce qui lit l'IP ou le schéma (rate limiter, HSTS) pour qu'ils voient
// la requête d'origine et non celle du proxy Railway.
app.UseForwardedHeaders();

#if DEBUG
TextSanitizer.Demo();
UploadLimits.Demo();
#endif

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpLogging();

app.UseExceptionHandler(a => a.Run(async ctx =>
{
    var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    app.Logger.LogError(ex, "Unhandled exception on {Path}", ctx.Request.Path);
    ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await ctx.Response.WriteAsync("Une erreur inattendue est survenue. Merci de réessayer.");
}));

if (app.Environment.IsDevelopment())
    app.UseCors("frontend");
else
    // Railway termine déjà le TLS en amont : UseHsts suffit à instruire le navigateur.
    // Pas de UseHttpsRedirection — le trafic interne proxy→backend est en HTTP et une
    // redirection le casserait ; c'est le proxy qui force HTTPS côté public.
    app.UseHsts();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireAuthorization();
app.Run();
