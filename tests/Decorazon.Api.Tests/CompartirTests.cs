using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Decorazon.Contratos.Cuentas;
using Decorazon.Contratos.Disenos;

namespace Decorazon.Api.Tests;

/// <summary>
/// Compartir un diseño con un enlace: el dueño lo crea y lo retira, y cualquiera
/// con el enlace lee la última versión guardada sin sesión.
/// </summary>
[Trait("Categoria", "Integracion")]
public class CompartirTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    private static async Task<string> CompartirAsync(HttpClient cliente, Guid id)
    {
        var respuesta = await cliente.PutAsync($"/disenos/{id}/enlace", null);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<RespuestaDeEnlace>())!.Enlace;
    }

    [Fact]
    public async Task Compartir_DaUnEnlace_QueSeLeeSinSesion_SinIdNiUsuario()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno, "Baño de arriba");

        var enlace = await CompartirAsync(dueno, id);
        Assert.Matches("^[A-Za-z0-9_-]{40,}$", enlace);

        var respuesta = await api.CreateClient().GetAsync($"/compartidos/{enlace}");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.True(respuesta.Headers.CacheControl?.NoStore);

        using var cuerpo = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync());
        var raiz = cuerpo.RootElement;
        Assert.Equal("Baño de arriba", raiz.GetProperty("nombre").GetString());
        Assert.Equal("dormitorio", raiz.GetProperty("tipoEstancia").GetString());
        Assert.Equal(1, raiz.GetProperty("contenido").GetProperty("formato").GetInt32());
        Assert.True(raiz.TryGetProperty("fechaDeModificacion", out _));
        Assert.False(raiz.TryGetProperty("id", out _));
        Assert.False(raiz.TryGetProperty("usuarioId", out _));
        Assert.False(raiz.TryGetProperty("enlace", out _));
    }

    [Fact]
    public async Task CompartirDosVeces_DaElMismoEnlace_YNoCambiaLaVersion()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);

        var primero = await CompartirAsync(dueno, id);
        Assert.Equal(primero, await CompartirAsync(dueno, id));

        var detalle = await dueno.GetAsync($"/disenos/{id}");
        Assert.Equal("\"1\"", detalle.Headers.ETag?.Tag);
        Assert.Equal(primero, (await detalle.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!.Enlace);

        var listado = await dueno.GetFromJsonAsync<RespuestaDeResumenDeDiseno[]>("/disenos");
        Assert.Equal(primero, Assert.Single(listado!).Enlace);
    }

    [Fact]
    public async Task ElEnlace_EnsenaLaUltimaVersionGuardada()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno, "Antes");
        var enlace = await CompartirAsync(dueno, id);

        var peticion = new HttpRequestMessage(HttpMethod.Put, $"/disenos/{id}") { Content = JsonContent.Create(DisenosDePrueba.Peticion("Después")) };
        peticion.Headers.IfMatch.ParseAdd("\"1\"");
        Assert.Equal(HttpStatusCode.OK, (await dueno.SendAsync(peticion)).StatusCode);

        var compartido = await api.CreateClient().GetFromJsonAsync<RespuestaDeDisenoCompartido>($"/compartidos/{enlace}");
        Assert.Equal("Después", compartido!.Nombre);
    }

    [Fact]
    public async Task DejarDeCompartir_ElEnlaceYaNoFunciona_YVolverACompartirDaOtro()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        var enlace = await CompartirAsync(dueno, id);

        Assert.Equal(HttpStatusCode.NoContent, (await dueno.DeleteAsync($"/disenos/{id}/enlace")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/compartidos/{enlace}")).StatusCode);
        Assert.Null((await dueno.GetFromJsonAsync<RespuestaDeDiseno>($"/disenos/{id}"))!.Enlace);

        // Retirar uno que ya no se comparte también es 204.
        Assert.Equal(HttpStatusCode.NoContent, (await dueno.DeleteAsync($"/disenos/{id}/enlace")).StatusCode);

        var nuevo = await CompartirAsync(dueno, id);
        Assert.NotEqual(enlace, nuevo);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/compartidos/{enlace}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await api.CreateClient().GetAsync($"/compartidos/{nuevo}")).StatusCode);
    }

    [Fact]
    public async Task UnDisenoAjeno_NoSePuedeCompartirNiRetirar()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var otro = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        var enlace = await CompartirAsync(dueno, id);

        Assert.Equal(HttpStatusCode.NotFound, (await otro.PutAsync($"/disenos/{id}/enlace", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otro.DeleteAsync($"/disenos/{id}/enlace")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await api.CreateClient().GetAsync($"/compartidos/{enlace}")).StatusCode);
    }

    [Fact]
    public async Task SinSesion_NoSePuedeCompartir()
    {
        var anonimo = api.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.PutAsync($"/disenos/{Guid.NewGuid()}/enlace", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.DeleteAsync($"/disenos/{Guid.NewGuid()}/enlace")).StatusCode);
    }

    [Theory]
    [InlineData("noexiste")]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("con%20espacio")]
    [InlineData("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")]
    public async Task UnEnlaceDesconocidoORaro_Responde404ConMensaje(string enlace)
    {
        var respuesta = await api.CreateClient().GetAsync($"/compartidos/{enlace}");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace((await respuesta.Content.ReadFromJsonAsync<Contratos.RespuestaDeMensaje>())!.Mensaje));
    }

    [Fact]
    public async Task BorrarElDiseno_ApagaSuEnlace()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        var enlace = await CompartirAsync(dueno, id);

        Assert.Equal(HttpStatusCode.NoContent, (await dueno.DeleteAsync($"/disenos/{id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/compartidos/{enlace}")).StatusCode);
    }

    [Fact]
    public async Task BorrarLaCuenta_ApagaSusEnlaces()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var enlace = await CompartirAsync(dueno, await DisenosDePrueba.CrearAsync(dueno));

        var baja = await dueno.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/cuentas/yo")
        {
            Content = JsonContent.Create(new PeticionDeBaja { Contrasena = CuentasDePrueba.Contrasena })
        });
        Assert.True(baja.IsSuccessStatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/compartidos/{enlace}")).StatusCode);
    }

    [Fact]
    public async Task Duplicar_NoCopiaElEnlace()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        await CompartirAsync(dueno, id);

        var copia = await (await dueno.PostAsync($"/disenos/{id}/duplicar", null)).Content.ReadFromJsonAsync<RespuestaDeDiseno>();

        Assert.Null(copia!.Enlace);
    }
}
