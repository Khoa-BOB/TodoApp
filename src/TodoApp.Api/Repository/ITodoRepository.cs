using TodoApp.Api.DTOs;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repository;

public interface ITodoRepository
{
    Task<TodoItem> AddAsync(TodoItem entity, CancellationToken ct = default);
    
    Task<TodoItem?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<TodoItem>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct = default);

    Task UpdateAsync(TodoItem entity, CancellationToken ct = default);

    Task RemoveAsync(TodoItem entity, CancellationToken ct = default);
}