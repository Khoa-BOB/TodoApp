using TodoApp.Api.Models;

namespace TodoApp.Api.Repository;

public interface IUserRepository
{
    Task<User> AddAsync(User entity, CancellationToken ct = default);

    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);

    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);

    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
}
