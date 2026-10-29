using Decorazon.Infraestructura;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;
using Testcontainers.PostgreSql;

namespace Decorazon.Infraestructura.Tests.Persistencia;

/// <summary>
/// Un PostgreSQL real en un contenedor, compartido por todos los tests de la colección.
/// Cada test pide su propia base de datos, ya migrada: así ninguno ve las filas de otro
/// y se ejercita de paso la migración <c>Inicial</c>.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public async Task InitializeAsync() => await _postgres.StartAsync();

    public async Task DisposeAsync() => await _postgres.DisposeAsync();

    /// <summary>Crea una base de datos nueva, la migra y devuelve su cadena de conexión.</summary>
    public async Task<string> NuevaBaseAsync()
    {
        var nombre = "t_" + Guid.NewGuid().ToString("N");

        await using (var admin = new NpgsqlConnection(_postgres.GetConnectionString()))
        {
            await admin.OpenAsync();
            await using var orden = admin.CreateCommand();
            orden.CommandText = $"CREATE DATABASE {nombre}";
            await orden.ExecuteNonQueryAsync();
        }

        var cadena = new NpgsqlConnectionStringBuilder(_postgres.GetConnectionString()) { Database = nombre }
            .ConnectionString;

        await using var contexto = Contexto(cadena);
        await contexto.Database.MigrateAsync();

        return cadena;
    }

    public static DecorazonDbContext Contexto(string cadena, params IInterceptor[] interceptores)
    {
        var opciones = new DbContextOptionsBuilder<DecorazonDbContext>();
        opciones.UsarPostgres(cadena).AddInterceptors(interceptores);
        return new DecorazonDbContext(opciones.Options);
    }
}

[CollectionDefinition(Nombre)]
public sealed class ColeccionPostgres : ICollectionFixture<PostgresFixture>
{
    public const string Nombre = "Postgres";
}
