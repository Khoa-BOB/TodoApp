using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repository;

public class EfUserRepository : IUserRepository
{
    private readonly TodoDbContext _context;

    public EfUserRepository(TodoDbContext context)
    {
        this._context = context;
    }

    public async Task<User> AddAsync(User entity, CancellationToken ct = default)
    {
        _context.Users.Add(entity);
        await _context.SaveChangesAsync(ct);

        return entity;
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Users.FirstOrDefaultAsync(
            user => user.ID == id,
            ct
        );
    }

    // ponytail: The demo loads all accounts; paginate the directory when it reaches hundreds of users.
    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
        => await _context.Users.AsNoTracking().OrderBy(user => user.Name).ToListAsync(ct);

    public Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
        => _context.Users.AnyAsync(user => user.ID == id, ct);

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => _context.Users.AnyAsync(user => user.Email == email, ct);
    
    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => _context.Users.FirstOrDefaultAsync(user => user.Email == email, ct);
}
