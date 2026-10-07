using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repository;

namespace TodoApp.Api.Service;

public class TodoService
{
    private readonly ITodoRepository _repository;
    private readonly IUserRepository _users;

    public TodoService(ITodoRepository repository, IUserRepository users)
    {
        _repository = repository;
        _users = users;
    }

    // Returns null when the owner doesn't exist.
    public async Task<TodoItem?> CreateAsync(TodoItemCreate item, CancellationToken ct = default)
    {
        if (!await _users.ExistsAsync(item.OwnerId, ct)) return null;

        var todoItem = new TodoItem(item.OwnerId, item.Title, item.Description);
        return await _repository.AddAsync(todoItem, ct);
    }

    public Task<IReadOnlyList<TodoItem>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct = default)
        => _repository.GetByOwnerIdAsync(ownerId, ct);

    public async Task<TodoItem?> GetByIdAsync(Guid id, Guid ownerId, CancellationToken ct = default)
    {
        var item = await _repository.GetByIdAsync(id, ct);
        return item?.OwnerId == ownerId ? item : null;
    }

    // Returns null when the todo doesn't exist.
    public async Task<TodoItem?> UpdateAsync(Guid noteId, Guid ownerId, TodoItemUpdate item, CancellationToken ct = default)
    {
        var todoItem = await GetByIdAsync(noteId, ownerId, ct);
        if (todoItem is null) return null;
        todoItem.Update(item.Title, item.Description, item.IsCompleted);
        await _repository.UpdateAsync(todoItem, ct);
        return todoItem;
    }

    // Returns false when the todo doesn't exist.
    public async Task<bool> RemoveAsync(Guid id, Guid requesterId, CancellationToken ct = default)
    {
        var todoItem = await GetByIdAsync(id, requesterId, ct);
        if (todoItem is null) return false;

        await _repository.RemoveAsync(todoItem, ct);
        return true;
    }
}
