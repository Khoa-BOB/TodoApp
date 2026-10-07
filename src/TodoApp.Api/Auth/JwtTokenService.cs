
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TodoApp.Api.Auth;
using TodoApp.Api.Models;

public sealed class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;
    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTimeOffset ExpiresAt) createAccessToken(Guid id, string role)
    {
        // Extract configuration:
        var jwt = _configuration.GetSection("Jwt");
        var key = jwt["Key"] ?? throw new InvalidOperationException("Jwt: Key is not configured");

        var issuer = jwt["Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is not configured");

        var audience = jwt["Audience"] ?? throw new InvalidOperationException("Jwt:Audience is not configured");

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(jwt.GetValue("ExpiryMinutes", 60));

        var claims = new List<Claim>
        {
            new(ClaimTypes.Role, role),
            new(ClaimTypes.NameIdentifier, id.ToString()), 
            new(JwtRegisteredClaimNames.Sub, id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);
        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
