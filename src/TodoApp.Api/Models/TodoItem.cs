namespace TodoApp.Api.Models;


public class TodoItem
{
   public Guid ID {get; private set;}

   public Guid OwnerId {get; private set;}

   public string Title {get; private set;} = string.Empty;
   
   public string? Description {get; private set;}

   public bool IsCompleted {get; private set;}
   public DateTimeOffset CreatedAt {get; private set;}
   public DateTimeOffset? CompletedAt {get; private set;}

   private TodoItem() { } // EF Core

   public TodoItem(Guid ownerId, string title, string? description)
   {
      ArgumentException.ThrowIfNullOrWhiteSpace(title);
      ID = Guid.NewGuid();
      OwnerId = ownerId;
      Title = title;
      Description = description;
      CreatedAt = DateTimeOffset.UtcNow;
   }

   public void Update(string title, string? description, bool isCompleted)
   {
      ArgumentException.ThrowIfNullOrWhiteSpace(title);
      Title = title;
      Description = description;

      if (isCompleted != IsCompleted)
      {
         IsCompleted = isCompleted;
         CompletedAt = isCompleted ? DateTimeOffset.UtcNow : null;
      }
   }
}
