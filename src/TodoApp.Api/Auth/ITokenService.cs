namespace TodoApp.Api.Auth;

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) createAccessToken(Guid id, string role);
}