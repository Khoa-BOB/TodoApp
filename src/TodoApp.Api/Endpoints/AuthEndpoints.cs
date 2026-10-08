using System.Net.Mail;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using TodoApp.Api.Auth;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repository;
using TodoApp.Api.Service;

namespace TodoApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/auth");

        auth.MapGet("/me", async (ClaimsPrincipal caller, HttpContext http, UserService users, CancellationToken ct) =>
        {
            http.Response.Headers.CacheControl = "no-store";
            if (!Guid.TryParse(caller.FindFirstValue(ClaimTypes.NameIdentifier), out var id))
                return Results.Unauthorized();
            var user = await users.GetByIdAsync(id, ct);
            return user is null ? Results.Unauthorized() : Results.Ok(new
            {
                response = UserResponse.FromDomain(user),
                role = caller.IsInRole("Admin") ? Role.Admin : Role.User
            });
        }).RequireAuthorization();

        auth.MapGet("/csrf", (HttpContext http, IAntiforgery antiforgery) =>
        {
            http.Response.Headers.CacheControl = "no-store";
            return Results.Ok(new { csrfToken = antiforgery.GetAndStoreTokens(http).RequestToken });
        }).AllowAnonymous();

        auth.MapPost("/login", async (
            LoginRequest body,
            HttpContext http,
            IHostEnvironment environment,
            IPasswordHasher<string> hasher, 
            UserService users, 
            ITokenService issuer, 
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrEmpty(body.Password))
                return Results.Unauthorized();

            var email = string.Equals(body.Email.Trim(), "admin", StringComparison.OrdinalIgnoreCase)
                ? "admin@example.com"
                : body.Email;
            var providedPassword = body.Password;

            var user = await users.GetByEmailAsync(email,ct);

            if (user is null || 
                hasher.VerifyHashedPassword(user.Email, user.HashedPassword, providedPassword) == PasswordVerificationResult.Failed)
            {
                return Results.Unauthorized();
            }

            var role = user.Role;

            // Issue token here
            var (token, expiresAt) = issuer.createAccessToken(user.ID, user.Role.ToString());

            http.Response.Cookies.Append("access_token",token, new CookieOptions
            {
                HttpOnly = true,
                Secure = !environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = expiresAt
            });

            http.Response.Headers.CacheControl = "no-store";
            return Results.Ok(new LoginResponse(expiresAt, UserResponse.FromDomain(user), role));
        }).AllowAnonymous();

        auth.MapPost("/logout", (HttpContext http, IHostEnvironment environment) =>
        {
            http.Response.Cookies.Delete("access_token", new CookieOptions
            {
                HttpOnly = true,
                Secure = !environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Path = "/"
            });
            return Results.NoContent();
        }).RequireAuthorization();

        auth.MapPost("/signup", async (
            SignUpRequest body,
            UserService users,
            IPasswordHasher<string> hasher,
            CancellationToken ct
        ) =>
        {
            var email = body.Email;
            var password = body.Password;
            var name = body.Name;

            // Create hashed password
            var hashedPassword = hasher.HashPassword(email,password);

            var user = await users.CreateAsync(new UserCreate(name,email, hashedPassword), ct);

            if (user is null)
            {
                return Results.Conflict(new ProblemDetails
                {
                    Title = "Email Conflict",
                    Detail = "A user with this email address already exists.",
                    Status = StatusCodes.Status409Conflict
                });
            }

            return Results.Ok(SignUpResponse.FromDomain(user));

        }).AllowAnonymous();
    }
}
