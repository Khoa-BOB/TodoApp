using System.Net.Mail;
using TodoApp.Api.DTOs;
using TodoApp.Api.Service;

namespace TodoApp.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var users = app.MapGroup("/users").RequireAuthorization("AdminOnly");

        users.MapGet("", async (UserService service, CancellationToken ct) =>
            Results.Ok((await service.GetAllAsync(ct)).Select(AdminUserResponse.FromDomain)));

        users.MapGet("/{id:guid}", async (Guid id, UserService service, CancellationToken ct) =>
            await service.GetByIdAsync(id, ct) is { } user ? Results.Ok(UserResponse.FromDomain(user)) : Results.NotFound());

        users.MapPost("", async (UserCreate dto, UserService service, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return Results.BadRequest("Name is required.");
            if (!MailAddress.TryCreate(dto.Email, out _)) return Results.BadRequest("A valid email is required.");

            var user = await service.CreateAsync(dto, ct);
            return user is null
                ? Results.Conflict("Email is already in use.")
                : Results.Created($"/users/{user.ID}", UserResponse.FromDomain(user));
        });

        users.MapGet("/{id:guid}/todos", async (Guid id, UserService users, TodoService todos, CancellationToken ct) =>
            await users.ExistsAsync(id, ct)
                ? Results.Ok(await todos.GetByOwnerIdAsync(id, ct))
                : Results.NotFound());
    }
}
