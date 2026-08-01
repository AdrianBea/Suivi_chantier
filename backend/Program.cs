using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

DotEnv.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables(prefix: "SUIVI_CHANTIER_");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<ISettingsStore, SettingsStore>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// La connection string est fixée au démarrage via appsettings/.env (ConnectionStrings:Default).
builder.Services.AddDbContext<AppDbContext>((sp, opt) =>
    opt.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")));
builder.Services.AddHttpClient("openrouter");
builder.Services.AddTransient<IOpenRouterService, OpenRouterService>();

builder.Services.AddScoped<IPdfImageService, PdfImageService>();
builder.Services.AddScoped<IExtractionService, ExtractionService>();
builder.Services.AddScoped<IComparaisonService, ComparaisonService>();

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
        options.ExpireTimeSpan = TimeSpan.FromDays(30);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
    });

builder.Services.AddAuthorization(options =>
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("IsAdmin", "True")));

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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireAuthorization();
app.Run();
