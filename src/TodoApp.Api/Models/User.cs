namespace TodoApp.Api.Models;

public enum Role
{
   User = 1,
   Admin = 2
}
public class User
{
   public Guid ID {get; private set;}

   public string Name {get; private set;} = string.Empty;

   public string Email {get; private set;} = string.Empty;

   public string HashedPassword{get; private set;} = string.Empty;

   public Role Role{get; private set;} = Role.User;
   public DateTimeOffset CreatedAt {get; private set;}

   private User() { } // EF Core

   public User(string name, string email, string hashedPassword)
   {
      ArgumentException.ThrowIfNullOrWhiteSpace(name);
      ArgumentException.ThrowIfNullOrWhiteSpace(email);

      ID = Guid.NewGuid();
      Name = name.Trim();
      Email = email.Trim().ToLowerInvariant();
      HashedPassword = hashedPassword.Trim();
      Role = Role.User;
      CreatedAt = DateTimeOffset.UtcNow;
   }
}
