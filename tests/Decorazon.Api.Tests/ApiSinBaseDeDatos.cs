using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Decorazon.Api.Tests;

/// <summary>
/// La API con la base de datos inalcanzable. Sirve para lo que no la toca
/// (el documento OpenAPI, los 400 del framework) y para comprobar que se degrada
/// bien sin ella. No necesita Docker.
/// </summary>
public sealed class ApiSinBaseDeDatos : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        constructor.UseEnvironment("Testing");
        constructor.UseSetting("Jwt:ClaveDeFirma", ApiConPostgresFixture.ClaveDeFirmaDePrueba);
        constructor.UseSetting("Limpieza:Activa", "false");
        // appsettings.json trae Brevo activo (producción); los tests nunca mandan correo.
        constructor.UseSetting("Correo:UsarBrevo", "false");

        // Puerto sin nada escuchando: la conexión falla de inmediato.
        constructor.UseSetting(
            "ConnectionStrings:Decorazon",
            "Host=127.0.0.1;Port=1;Database=inexistente;Username=nadie;Password=nada;Timeout=1;Command Timeout=1");
    }
}
