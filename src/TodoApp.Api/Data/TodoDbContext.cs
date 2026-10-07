using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;
using TodoApp.Api.Models;

public class TodoDbContext : DbContext
{
    public TodoDbContext(DbContextOptions<TodoDbContext> options)
    : base(options)
    {
        
    }

    public DbSet<TodoItem> TodoItems => Set<TodoItem>();

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TodoDbContext).Assembly);
    }
}