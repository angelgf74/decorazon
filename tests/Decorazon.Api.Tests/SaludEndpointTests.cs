using System.Net;
using System.Net.Http.Json;
using Decorazon.Contratos.Salud;

namespace Decorazon.Api.Tests;

/// <summary>
/// Recorre el camino completo: HTTP, caso de uso, adaptador de EF y PostgreSQL real.
/// Requiere Docker; excluible con <c>dotnet test --filter "Categoria!=Integracion"</c>.
/// </summary>
[Trait("Categoria", "Integracion")]
public class SaludEndpointTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    [Fact]
    public async Task Salud_Responde200_CuandoLaBaseDeDatosEstaDisponible()
    {
        var cliente = api.CreateClient();

        var respuesta = await cliente.GetAsync("/salud");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        var cuerpo = await respuesta.Content.ReadFromJsonAsync<RespuestaDeSalud>();

        Assert.NotNull(cuerpo);
        Assert.Equal("correcto", cuerpo.Estado);
        Assert.True(cuerpo.BaseDeDatos);
    }

    /// <summary>Los monitores externos preguntan con HEAD: mismo estado, sin cuerpo.</summary>
    [Fact]
    public async Task Salud_ConHead_Responde200SinCuerpo()
    {
        var respuesta = await api.CreateClient().SendAsync(new HttpRequestMessage(HttpMethod.Head, "/salud"));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Empty(await respuesta.Content.ReadAsByteArrayAsync());
    }
}
