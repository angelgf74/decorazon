using System.Net;
using System.Net.Http.Json;
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
    /// Sin <c>Access-Control-Expose-Headers: ETag</c> el navegador esconde la
    /// cabecera a la web, que entonces no puede mandar el <c>If-Match</c>.
    /// </summary>
    [Fact]
    public async Task Cors_DesdeLaWebLocal_ExponeElETag()
    {
        using var api = new ApiSinBaseDeDatos();
        var peticion = new HttpRequestMessage(HttpMethod.Get, "/salud");
        peticion.Headers.Add("Origin", "http://localhost:5321");

        var respuesta = await api.CreateClient().SendAsync(peticion);

        Assert.Equal("http://localhost:5321", Assert.Single(respuesta.Headers.GetValues("Access-Control-Allow-Origin")));
        var expuestas = string.Join(",", respuesta.Headers.GetValues("Access-Control-Expose-Headers"));
        Assert.Contains("ETag", expuestas.Split(',', StringSplitOptions.TrimEntries));
        Assert.Contains("Location", expuestas.Split(',', StringSplitOptions.TrimEntries));
    }

    private sealed class ApiSinBaseDeDatos : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder constructor)
        {
            constructor.UseEnvironment("Testing");
            constructor.UseSetting("Jwt:ClaveDeFirma", ApiConPostgresFixture.ClaveDeFirmaDePrueba);
            constructor.UseSetting("Limpieza:Activa", "false");

            // Puerto sin nada escuchando: la conexión falla de inmediato.
            constructor.UseSetting(
                "ConnectionStrings:Decorazon",
                "Host=127.0.0.1;Port=1;Database=inexistente;Username=nadie;Password=nada;Timeout=1;Command Timeout=1");
        }
    }
}
