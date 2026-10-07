using TodoApp.Api.Models;

namespace TodoApp.Api.DTOs;
public record LoginRequest(
    string Email,
    string Password
);

public record LoginResponse(
    DateTimeOffset expiresAt,
    UserResponse response,
    Role Role
);

public record SignUpRequest(
    string Email,
    string Password,
    string Name
);

public record SignUpResponse(
    string Email,
    string Name
){
    public static SignUpResponse FromDomain(User user) =>new(
        user.Name,
        user.Email
    );
};
