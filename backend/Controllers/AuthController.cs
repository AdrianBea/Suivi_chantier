using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController(AppDbContext db, IPasswordHasher<User> hasher, ILogger<AuthController> logger) : ControllerBase
{
    // Email borné à 255 comme en base ; le mot de passe est plafonné car PBKDF2 hache
    // l'entrée complète — une chaîne de plusieurs Mo coûterait du CPU à chaque tentative.
    public record SignupDto([MaxLength(255)] string Email, [MaxLength(200)] string Password, string PasswordConfirmation, DateOnly? DateDebutChantier, DateOnly? DateLivraisonPrevue);
    public record CredentialsDto([MaxLength(255)] string Email, [MaxLength(200)] string Password);
    public record UserDto(int Id, string Email, bool IsAdmin, DateOnly? DateDebutChantier, DateOnly? DateLivraisonPrevue, string? Nom, string? Prenom, string? Adresse);
    public record UpdateProfileDto(string? Nom, string? Prenom, string? Adresse, DateOnly? DateDebutChantier, DateOnly? DateLivraisonPrevue);

    // Hash bidon vérifié quand l'email est inconnu : sans lui, l'absence de PBKDF2 (~100 ms)
    // rend le temps de réponse discriminant et permet d'énumérer les comptes existants.
    private static readonly string DummyHash =
        new PasswordHasher<User>().HashPassword(new User(), "mot-de-passe-inexistant");

    [EnableRateLimiting("auth")]
    [HttpPost("signup")]
    public async Task<ActionResult<UserDto>> Signup(SignupDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Email et mot de passe requis.");
        if (dto.Password.Length < 8)
            return BadRequest("Le mot de passe doit contenir au moins 8 caractères.");
        if (dto.Password != dto.PasswordConfirmation)
            return BadRequest("Les mots de passe ne correspondent pas.");
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict("Un compte existe déjà avec cet email.");

        // Le premier compte admin est promu manuellement en base (UPDATE "Users" SET "IsAdmin" = true ...) :
        // aucune route ne doit permettre d'obtenir ce flag soi-même.
        var user = new User
        {
            Email = email,
            DateDebutChantier = dto.DateDebutChantier,
            DateLivraisonPrevue = dto.DateLivraisonPrevue,
        };
        user.PasswordHash = hasher.HashPassword(user, dto.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        await SignInAsync(user);
        return Ok(ToDto(user));
    }

    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(CredentialsDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            hasher.VerifyHashedPassword(new User(), DummyHash, dto.Password); // temps constant
            logger.LogWarning("Login échoué : email inconnu {Email}", email);
            return Unauthorized("Email ou mot de passe incorrect.");
        }

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            logger.LogWarning("Login échoué : mot de passe invalide pour {UserId}", user.Id);
            return Unauthorized("Email ou mot de passe incorrect.");
        }

        logger.LogInformation("Login réussi pour {UserId}", user.Id);
        await SignInAsync(user);
        return Ok(ToDto(user));
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    // Ping pour réveiller le backend et la base Railway (plan gratuit = veille après inactivité).
    [HttpGet("ping")]
    public async Task<ActionResult> Ping()
    {
        await db.Database.CanConnectAsync();
        return Ok();
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        if (User.Identity?.IsAuthenticated != true) return Unauthorized();
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(id);
        if (user is null) return Unauthorized();
        return Ok(ToDto(user));
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateMe(UpdateProfileDto dto)
    {
        if (User.Identity?.IsAuthenticated != true) return Unauthorized();
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(id);
        if (user is null) return Unauthorized();

        user.Nom = dto.Nom?.Trim();
        user.Prenom = dto.Prenom?.Trim();
        user.Adresse = dto.Adresse?.Trim();
        user.DateDebutChantier = dto.DateDebutChantier;
        user.DateLivraisonPrevue = dto.DateLivraisonPrevue;
        await db.SaveChangesAsync();

        return Ok(ToDto(user));
    }

    private static UserDto ToDto(User user) =>
        new(user.Id, user.Email, user.IsAdmin, user.DateDebutChantier, user.DateLivraisonPrevue, user.Nom, user.Prenom, user.Adresse);

    private async Task SignInAsync(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new("IsAdmin", user.IsAdmin.ToString()),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }
}
