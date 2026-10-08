using System.Text;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.IdentityModel.Tokens.Experimental;
using TodoApp.Api.Auth;
using TodoApp.Api.Endpoints;
using TodoApp.Api.Models;
using TodoApp.Api.Repository;
using TodoApp.Api.Service;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<TodoDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddScoped<ITodoRepository, EfTodoRepository>();
builder.Services.AddScoped<TodoService>();
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ITokenService,JwtTokenService>();
builder.Services.AddSingleton<IPasswordHasher<string>, PasswordHasher<string>>();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;
});

// Add authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(jwtOptions =>
{
    var jwtSection = builder.Configuration.GetSection("Jwt");
    // jwtOptions.MetadataAddress
	// Optional if the MetadataAddress is specified
	// jwtOptions.Authority = builder.Configuration["Api:Authority"];
	// jwtOptions.Audience = builder.Configuration["Api:Audience"];
	jwtOptions.TokenValidationParameters = new TokenValidationParameters
	{
		ValidateIssuer = true,
		ValidateAudience = true,
		ValidateIssuerSigningKey = true,
        ValidateLifetime=true,
		ValidAudience = jwtSection["Audience"],
		ValidIssuer = jwtSection["Issuer"],
		//Jwt validation signing key
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured")))
	};

	jwtOptions.MapInboundClaims = false;
    jwtOptions.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (!context.Request.Headers.ContainsKey("Authorization"))
                context.Token = context.Request.Cookies["access_token"];
            return Task.CompletedTask;
        }
    };
});

var authorization = builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
});


var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.Use(async (http, next) =>
{
    var method = http.Request.Method;
    var unsafeMethod = HttpMethods.IsPost(method) || HttpMethods.IsPut(method)
        || HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);
    // Bearer headers aren't attached automatically by browsers; cookie requests need CSRF validation.
    var bearerAuthenticated = http.User.Identity?.IsAuthenticated == true
        && http.Request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase);
    if (unsafeMethod && !bearerAuthenticated)
    {
        try
        {
            await http.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(http);
        }
        catch (AntiforgeryValidationException)
        {
            await Results.BadRequest("A valid X-CSRF-TOKEN header is required. Get a token from /auth/csrf.").ExecuteAsync(http);
            return;
        }
    }
    await next(http);
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // ponytail: EnsureCreated can't evolve the schema; switch to `dotnet ef migrations` once the model changes after data exists.
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<TodoDbContext>();
    db.Database.EnsureCreated();
    // The known demo password must never seed a production administrator.
    if (!await db.Users.AnyAsync(user => user.Email == "admin@example.com"))
    {
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<string>>();
        db.Users.Add(new User("admin", "admin@example.com",
            hasher.HashPassword("admin@example.com", "ChangeMe123!"), Role.Admin));
        await db.SaveChangesAsync();
    }
}

app.MapTodoEndpoints();
app.MapUserEndpoints();
app.MapAuthEndpoints();

app.Run();
