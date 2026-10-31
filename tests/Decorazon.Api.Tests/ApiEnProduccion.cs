using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Decorazon.Api.Tests;

/// <summary>
/// La API en Production con lo que trae appsettings.json más los ajustes que se
/// pasen. La base de datos apunta a un puerto cerrado: sirve para lo que falla o
/// se decide antes de tocarla (validación de arranque, configuración, log).
/// </summary>
internal sealed class ApiEnProduccion(params (string Clave, string Valor)[] ajustes) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        constructor.UseEnvironment("Production");
        constructor.UseSetting("Jwt:ClaveDeFirma", ApiConPostgresFixture.ClaveDeFirmaDePrueba);
        constructor.UseSetting("Limpieza:Activa", "false");
        constructor.UseSetting(
            "ConnectionStrings:Decorazon",
            "Host=127.0.0.1;Port=1;Database=inexistente;Username=nadie;Password=nada;Timeout=1;Command Timeout=1");

        foreach (var (clave, valor) in ajustes)
        {
            constructor.UseSetting(clave, valor);
        }
    }
}
