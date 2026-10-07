using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repository;

public class EfTodoRepository : ITodoRepository
{
    private readonly TodoDbContext _context;

    public EfTodoRepository(TodoDbContext context)
    {
        this._context = context;
    }

    public async Task<TodoItem> AddAsync(TodoItem entity, CancellationToken ct = default)
    {
        _context.TodoItems.Add(entity);    
        await _context.SaveChangesAsync(ct);
        
        return entity;
    }
    
    public async Task<TodoItem?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.TodoItems.FirstOrDefaultAsync(
            item => item.ID == id,
            ct
        );
    }

    public async Task<IReadOnlyList<TodoItem>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct = default)
    {
        var items = await _context.TodoItems
            .Where(item => item.OwnerId == ownerId)
            .ToListAsync(ct);

        // SQLite can't ORDER BY DateTimeOffset, so sort in memory.
        return items.OrderBy(item => item.CreatedAt).ToList();
    }

    public async Task UpdateAsync(TodoItem entity, CancellationToken ct = default)
    {
        _context.TodoItems.Update(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(TodoItem entity, CancellationToken ct = default)
    {
        _context.TodoItems.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }
}