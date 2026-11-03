using Decorazon.Dominio.Puertos;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;

namespace Decorazon.Api.Tests;

/// <summary>
/// Levanta un PostgreSQL efímero con Testcontainers y arranca la API apuntando a él.
/// Cada ejecución parte de una base limpia.
/// </summary>
public class ApiConPostgresFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    /// <summary>Clave solo de test. La real vive fuera del repositorio.</summary>
    public const string ClaveDeFirmaDePrueba = "clave-de-pruebas-suficientemente-larga-para-hmac-sha256";

    /// <summary>Base de la web en los tests: los enlaces de los correos deben empezar por aquí.</summary>
    public const string BaseDeLaWeb = "https://decorazon.test";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("decorazon_test")
        .WithUsername("decorazon")
        .WithPassword("decorazon_test")
        .Build();

    /// <summary>Cadena de conexión al PostgreSQL del contenedor, para los tests que hablan con él directamente.</summary>
    public string CadenaDeConexion => _postgres.GetConnectionString();

    /// <summary>Correos que la API ha intentado enviar. Es donde se lee el enlace del alta.</summary>
    public EnviadorDeCorreoEspia Correo { get; } = new();

    /// <summary>Sugerencias que la API ha intentado entregar al buzón.</summary>
    public EnviadorDeSugerenciasEspia Sugerencias { get; } = new();

    /// <summary>Permite a un test bajar el límite de registros para comprobar el 429.</summary>
    protected virtual int MaximoDeRegistrosPorVentana => 1000;

    /// <summary>
    /// Los tests comparten origen, así que todos caen en el mismo cubo del
    /// limitador. Con el valor de producción, una clase con una docena de
    /// inicios de sesión empieza a recibir 429 a mitad, y el síntoma es un token
    /// nulo mucho más adelante, sin mencionar el límite por ningún lado.
    /// </summary>
    protected virtual int MaximoDeIniciosDeSesionPorVentana => 1000;

    /// <summary>Mismo motivo que <see cref="MaximoDeIniciosDeSesionPorVentana"/>.</summary>
    protected virtual int MaximoDeCambiosDeContrasenaPorVentana => 1000;

    /// <summary>Mismo motivo que <see cref="MaximoDeIniciosDeSesionPorVentana"/>.</summary>
    protected virtual int MaximoDeLecturasCompartidasPorVentana => 1000;

    /// <summary>Mismo motivo que <see cref="MaximoDeIniciosDeSesionPorVentana"/>.</summary>
    protected virtual int MaximoDeTarjetasPorVentana => 1000;

    /// <summary>Mismo motivo que <see cref="MaximoDeIniciosDeSesionPorVentana"/>.</summary>
    protected virtual int MaximoDeEscriturasPorVentana => 1000;

    /// <summary>Mismo motivo que <see cref="MaximoDeIniciosDeSesionPorVentana"/>.</summary>
    protected virtual int MaximoDeSugerenciasPorVentana => 1000;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        using var ambito = Services.CreateScope();
        var contexto = ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>();
        await contexto.Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        // Testing, no Development: así Program no intenta migrar al arrancar,
        // antes de que el contenedor esté listo. Migra InitializeAsync.
        constructor.UseEnvironment("Testing");
        constructor.UseSetting("ConnectionStrings:Decorazon", _postgres.GetConnectionString());
        constructor.UseSetting("Jwt:ClaveDeFirma", ClaveDeFirmaDePrueba);
        // appsettings.json trae Brevo activo (producción); los tests nunca mandan correo.
        constructor.UseSetting("Correo:UsarBrevo", "false");
        constructor.UseSetting("Correo:BaseDeLaWeb", BaseDeLaWeb);
        // La web de desarrollo; appsettings.json solo trae la de producción.
        constructor.UseSetting("Cors:Origenes:0", "http://localhost:5321");
        // La limpieza de caducados correría antes de que InitializeAsync migre
        // la base. Se prueba aparte, llamándola directamente.
        constructor.UseSetting("Limpieza:Activa", "false");

        constructor.UseSetting("Limites:RegistrosPorVentana", MaximoDeRegistrosPorVentana.ToString());
        constructor.UseSetting(
            "Limites:IniciosDeSesionPorVentana",
            MaximoDeIniciosDeSesionPorVentana.ToString());
        constructor.UseSetting(
            "Limites:CambiosDeContrasenaPorVentana",
            MaximoDeCambiosDeContrasenaPorVentana.ToString());
        constructor.UseSetting(
            "Limites:LecturasCompartidasPorVentana",
            MaximoDeLecturasCompartidasPorVentana.ToString());
        constructor.UseSetting("Limites:TarjetasPorVentana", MaximoDeTarjetasPorVentana.ToString());
        constructor.UseSetting("Limites:EscriturasPorVentana", MaximoDeEscriturasPorVentana.ToString());
        constructor.UseSetting("Limites:SugerenciasPorVentana", MaximoDeSugerenciasPorVentana.ToString());

        constructor.ConfigureTestServices(servicios =>
        {
            // Sustituye el enviador por un espía: ningún test manda correo real,
            // y es la única forma de leer el token que viaja en el enlace.
            servicios.RemoveAll<IEnviadorDeCorreo>();
            servicios.AddSingleton<IEnviadorDeCorreo>(Correo);

            // Igual con las sugerencias: ninguna llega al buzón real del autor.
            servicios.RemoveAll<IEnviadorDeSugerencias>();
            servicios.AddSingleton<IEnviadorDeSugerencias>(Sugerencias);
        });
    }
}
