using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TodoApp.Api.Models;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(e => e.ID);
        builder.Property(u => u.Name)
                .IsRequired()
                .HasMaxLength(128);
        builder.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(100);

        builder.Property(u => u.HashedPassword)
                .IsRequired()
                .HasMaxLength(50);

        builder.HasIndex(e => e.Email).IsUnique();
    }
}
