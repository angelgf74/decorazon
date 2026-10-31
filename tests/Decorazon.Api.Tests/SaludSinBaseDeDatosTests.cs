using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Decorazon.Contratos.Salud;

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

        Assert.Contains("consultarSalud", ids);
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }
}
