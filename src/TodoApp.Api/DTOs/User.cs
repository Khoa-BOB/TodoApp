using TodoApp.Api.Models;

namespace TodoApp.Api.DTOs;

public record UserCreate(
    string Name,
    string Email,
    string hashedPassword
);

public record AdminUserResponse(Guid Id, string Name, string Email, Role Role, DateTimeOffset CreatedAt)
{
    public static AdminUserResponse FromDomain(User user) => new(
        user.ID, user.Name, user.Email, user.Role, user.CreatedAt);
}

public record UserResponse(
    string Email,
    string Name
){
    public static UserResponse FromDomain(User user) =>new(
        user.Email,
        user.Name
    );
}
