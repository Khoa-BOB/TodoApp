using System.Security.Claims;
using TodoApp.Api.DTOs;
using TodoApp.Api.Service;

namespace TodoApp.Api.Endpoints;

public static class TodoEndpoints
{
    public static void MapTodoEndpoints(this IEndpointRouteBuilder app)
    {
        var todos = app.MapGroup("/todos");

        todos.MapGet("/", async (ClaimsPrincipal caller, TodoService service, CancellationToken ct) =>
        {
            if (CallerId(caller) is not { } requesterId)
            {
                return Results.Unauthorized();
            }

            var todoList = await service.GetByOwnerIdAsync(requesterId, ct);
            return Results.Ok(todoList);
        }).RequireAuthorization();

        todos.MapGet("/{noteId:guid}", async (Guid noteId, ClaimsPrincipal caller, TodoService service, CancellationToken ct) =>
        {
            if (CallerId(caller) is not { } requesterId) return Results.Unauthorized();

            return await service.GetByIdAsync(noteId, requesterId, ct) is { } item
                ? Results.Ok(item)
                : Results.NotFound();
        }).RequireAuthorization();

        todos.MapPost("/", async (TodoItemRequest dto, ClaimsPrincipal caller, TodoService service, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Title)) return Results.BadRequest("Title is required.");
            if (dto.Title.Length > 512) return Results.BadRequest("Title must be at most 512 characters.");
            if (dto.Description?.Length > 2048) return Results.BadRequest("Description must be at most 2048 characters.");
            if (CallerId(caller) is not { } requesterId)
            {
                return Results.Unauthorized();
            }
            var item = await service.CreateAsync(new TodoItemCreate(requesterId,dto.Title,dto.Description), ct);
            return item is null
                ? Results.BadRequest("Owner does not exist.")
                : Results.Created($"/todos/{item.ID}", item);
        }).RequireAuthorization();

        todos.MapPut("/{noteId:guid}", async (ClaimsPrincipal caller,Guid noteId, TodoItemUpdate dto, TodoService service, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Title)) return Results.BadRequest("Title is required.");
            if (dto.Title.Length > 512) return Results.BadRequest("Title must be at most 512 characters.");
            if (dto.Description?.Length > 2048) return Results.BadRequest("Description must be at most 2048 characters.");
            if (CallerId(caller) is not { } requesterId)
            {
                return Results.Unauthorized();
            }
            
            return await service.UpdateAsync(noteId,requesterId, dto, ct) is { } item ? Results.Ok(item) : Results.NotFound();
        }).RequireAuthorization();

        todos.MapDelete("/{noteId:guid}", async (ClaimsPrincipal caller, Guid noteId, TodoService service, CancellationToken ct) =>{
                if (CallerId(caller) is not { } requesterId)
                {
                    return Results.Unauthorized();
                }
                
                return await service.RemoveAsync(noteId, requesterId, ct) ? Results.NoContent() : Results.NotFound();
            }
        ).RequireAuthorization();
    }
    private static Guid? CallerId(ClaimsPrincipal caller) =>
        Guid.TryParse(caller.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
