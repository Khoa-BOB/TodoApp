using TodoApp.Api.Models;

namespace TodoApp.Api.DTOs;

public record UserCreate(
    string Name,
    string Email,
    string hashedPassword
);

public record UserResponse(
    string Email,
    string Name
){
    public static UserResponse FromDomain(User user) =>new(
        user.Email,
        user.Name
    );
}
