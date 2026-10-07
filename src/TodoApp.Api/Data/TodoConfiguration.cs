using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TodoApp.Api.Models;

public class TodoConfiguration : IEntityTypeConfiguration<TodoItem>
{
    public void Configure(EntityTypeBuilder<TodoItem> builder)
    {
        builder.ToTable("Todos");

        builder.HasKey(e => e.ID);
        builder.Property(u => u.Title)
                .IsRequired()
                .HasMaxLength(512);
        builder.Property(u => u.Description)
                .HasMaxLength(2048);

        builder.HasIndex(e => e.Title);

        builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}