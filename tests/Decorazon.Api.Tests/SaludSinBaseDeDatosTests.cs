using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Decorazon.Contratos.Salud;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Decorazon.Api.Tests;

/// <summary>
/// Con la base de datos inalcanzable, la API se degrada de forma controlada:
/// un 503 con cuerpo, no una excepción sin capturar. No necesita Docker.
/// </summary>
public class SaludSinBaseDeDatosTests
{
    [Fact]
    public async Task Salud_Responde503_CuandoLaBaseDeDatosNoResponde()
    {
        using var api = new ApiSinBaseDeDatos();
        var cliente = api.CreateClient();

        var respuesta = await cliente.GetAsync("/salud");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, respuesta.StatusCode);

        var cuerpo = await respuesta.Content.ReadFromJsonAsync<RespuestaDeSalud>();

        Assert.NotNull(cuerpo);
        Assert.Equal("degradado", cuerpo.Estado);
        Assert.False(cuerpo.BaseDeDatos);
    }

    /// <summary>Con HEAD, el monitor externo también ve la caída.</summary>
    [Fact]
    public async Task Salud_ConHead_Responde503_CuandoLaBaseDeDatosNoResponde()
    {
        using var api = new ApiSinBaseDeDatos();

        var respuesta = await api.CreateClient().SendAsync(new HttpRequestMessage(HttpMethod.Head, "/salud"));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, respuesta.StatusCode);
    }

    /// <summary>
    /// El documento OpenAPI no toca la base de datos, así que se comprueba aquí,
    /// sin Docker. Tiene que describir las rutas con parámetro tal cual.
    /// </summary>
    [Fact]
    public async Task OpenApi_Responde200_YDescribeLosDisenos()
    {
        using var api = new ApiSinBaseDeDatos();

        var respuesta = await api.CreateClient().GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Contains("/disenos/{id}", await respuesta.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// Un operationId repetido rompe los generadores de clientes: cada operación
    /// descrita debe tener el suyo.
    /// </summary>
    [Fact]
    public async Task OpenApi_NoRepiteNingunOperationId()
    {
        using var api = new ApiSinBaseDeDatos();

        using var documento = JsonDocument.Parse(await api.CreateClient().GetStringAsync("/openapi/v1.json"));

        var ids = documento.RootElement.GetProperty("paths").EnumerateObject()
            .SelectMany(ruta => ruta.Value.EnumerateObject())
            .Where(operacion => operacion.Value.ValueKind == JsonValueKind.Object
                && operacion.Value.TryGetProperty("operationId", out _))
            .Select(operacion => operacion.Value.GetProperty("operationId").GetString())
            .ToList();

        Assert.Contains("Salud", ids);
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    private sealed class ApiSinBaseDeDatos : WebApplicationFactory<Program>
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
}
