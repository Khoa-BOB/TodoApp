namespace TodoApp.Api.DTOs;

public record TodoItemRequest(
    string Title,
    string? Description
);
public record TodoItemCreate(
    Guid OwnerId,
    string Title,
    string? Description
);

public record TodoItemUpdate(
    string Title,
    string? Description,
    bool IsCompleted
);
