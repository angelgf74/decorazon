using Decorazon.Infraestructura;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Decorazon.Api;

/// <summary>
/// Construye el <see cref="DecorazonDbContext"/> para las herramientas de EF
/// (<c>dotnet ef</c> y el bundle de migraciones).
/// </summary>
/// <remarks>
/// <para>
/// Sin esta fábrica, EF arranca el host completo de la aplicación para localizar
/// el contexto. Eso hace que migrar exija toda la configuración de la API,
/// incluida la clave de firma del JWT, que en el servidor vive en un fichero
/// legible solo por <c>webapps</c> y que el despliegue deliberadamente no lee.
/// En <c>recetas</c> el síntoma fue un fallo de migración quejándose de
/// <c>Jwt:ClaveDeFirma</c>, que no tiene nada que ver con la base de datos.
/// </para>
/// <para>
/// Migrar solo necesita una cadena de conexión, y eso es lo único que se pide aquí.
/// Las opciones salen de <see cref="InyeccionDeDependencias.UsarPostgres"/>, las
/// mismas que usa la API.
/// </para>
/// </remarks>
public sealed class FabricaDeContextoEnTiempoDeDiseno : IDesignTimeDbContextFactory<DecorazonDbContext>
{
    public DecorazonDbContext CreateDbContext(string[] args)
    {
        var configuracion = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile(
                $"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"}.json",
                optional: true)
            .AddEnvironmentVariables()
            .Build();

        return Crear(CadenaDeConexion(configuracion));
    }

    /// <summary>
    /// Cadena para cuando no hay ninguna configurada: no apunta a ninguna base.
    /// </summary>
    public const string CadenaSinConexion = "Host=sin-conexion;Database=decorazon";

    /// <summary>
    /// La cadena configurada o, si no hay, <see cref="CadenaSinConexion"/>.
    /// </summary>
    /// <remarks>
    /// En local sale de appsettings.Development.json, igual que al ejecutar la API.
    /// <c>srv subir</c> compila el bundle sin secretos (construir el modelo no abre
    /// conexión); en el servidor srv-root ejecuta el bundle con la cadena en la
    /// variable de entorno <c>ConnectionStrings__Decorazon</c>.
    /// </remarks>
    public static string CadenaDeConexion(IConfiguration configuracion) =>
        configuracion.GetConnectionString("Decorazon") ?? CadenaSinConexion;

    /// <summary>El contexto con las mismas opciones que la API. No abre conexión.</summary>
    public static DecorazonDbContext Crear(string cadenaDeConexion)
    {
        var opciones = new DbContextOptionsBuilder<DecorazonDbContext>();
        opciones.UsarPostgres(cadenaDeConexion);

        return new DecorazonDbContext(opciones.Options);
    }
}
