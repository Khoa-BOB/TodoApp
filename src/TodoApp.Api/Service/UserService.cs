using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repository;

namespace TodoApp.Api.Service;

public class UserService
{
    private readonly IUserRepository _repository;

    public UserService(IUserRepository repository)
    {
        _repository = repository;
    }

    // Returns null when the email is already taken.
    public async Task<User?> CreateAsync(UserCreate item, CancellationToken ct = default)
    {
        var user = new User(item.Name, item.Email, item.hashedPassword);
        if (await _repository.EmailExistsAsync(user.Email, ct)) return null;

        return await _repository.AddAsync(user, ct);
    }
    
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _repository.GetByEmailAsync(email,ct);
    }
    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
    {
        
        return await _repository.EmailExistsAsync(email, ct);
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _repository.GetByIdAsync(id, ct);

    public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
        => _repository.GetAllAsync(ct);

    public Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
        => _repository.ExistsAsync(id, ct);
}
