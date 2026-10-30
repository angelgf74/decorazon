using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Decorazon.Contratos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Decorazon.Api.Tests;

/// <summary>
/// El documento OpenAPI es de donde sale el cliente TypeScript de la web: tiene
/// que describir la autenticación, los códigos y las cabeceras de verdad. Ni el
/// documento ni los 400 del framework tocan la base de datos, así que no
/// necesita Docker.
/// </summary>
public class OpenApiTests
{
    [Fact]
    public async Task Documento_DeclaraElEsquemaDeSeguridadBearer()
    {
        using var documento = await LeerDocumentoAsync();

        var bearer = documento.RootElement.GetProperty("components").GetProperty("securitySchemes").GetProperty("Bearer");

        Assert.Equal("http", bearer.GetProperty("type").GetString());
        Assert.Equal("bearer", bearer.GetProperty("scheme").GetString());
    }

    [Fact]
    public async Task Documento_LasRutasConSesionPidenBearer_YLasPublicasNo()
    {
        using var documento = await LeerDocumentoAsync();
        var rutas = documento.RootElement.GetProperty("paths");

        Assert.True(PideBearer(rutas.GetProperty("/disenos/{id}").GetProperty("put")));
        Assert.True(PideBearer(rutas.GetProperty("/cuentas/yo").GetProperty("get")));
        Assert.True(PideBearer(rutas.GetProperty("/cuentas/contrasena").GetProperty("post")));
        Assert.False(PideBearer(rutas.GetProperty("/sesiones").GetProperty("post")));
        Assert.False(PideBearer(rutas.GetProperty("/cuentas/contrasena/olvido").GetProperty("post")));
    }

    [Fact]
    public async Task ActualizarDiseno_TieneOperationId_412_428_EIfMatchEnLaCabecera()
    {
        using var documento = await LeerDocumentoAsync();

        var put = documento.RootElement.GetProperty("paths").GetProperty("/disenos/{id}").GetProperty("put");

        Assert.Equal("actualizarDiseno", put.GetProperty("operationId").GetString());

        var respuestas = put.GetProperty("responses");
        Assert.True(respuestas.TryGetProperty("412", out _));
        Assert.True(respuestas.TryGetProperty("428", out _));
        Assert.True(respuestas.GetProperty("200").GetProperty("headers").TryGetProperty("ETag", out _));

        var ifMatch = put.GetProperty("parameters").EnumerateArray()
            .Single(parametro => parametro.GetProperty("name").GetString() == "If-Match");
        Assert.Equal("header", ifMatch.GetProperty("in").GetString());
        Assert.True(ifMatch.GetProperty("required").GetBoolean());
    }

    [Fact]
    public async Task ElContenidoDeUnDiseno_SeDescribeComoObjeto()
    {
        using var documento = await LeerDocumentoAsync();
        var esquemas = documento.RootElement.GetProperty("components").GetProperty("schemas");

        foreach (var esquema in new[] { "PeticionDeDiseno", "RespuestaDeDiseno" })
        {
            var contenido = esquemas.GetProperty(esquema).GetProperty("properties").GetProperty("contenido");
            Assert.Equal("object", contenido.GetProperty("type").GetString());
        }
    }

    [Fact]
    public async Task CadaOperacion_TieneSuOperationId()
    {
        using var documento = await LeerDocumentoAsync();

        var ids = documento.RootElement.GetProperty("paths").EnumerateObject()
            .SelectMany(ruta => ruta.Value.EnumerateObject())
            .Where(operacion => operacion.Value.ValueKind == JsonValueKind.Object
                && operacion.Value.TryGetProperty("responses", out _))
            .Select(operacion => operacion.Value.TryGetProperty("operationId", out var id) ? id.GetString() : null)
            .ToList();

        Assert.Equal(
            new[]
            {
                "borrarDiseno", "borrarMiCuenta", "cambiarContrasena", "confirmarRegistro", "consultarSalud",
                "crearDiseno", "duplicarDiseno", "iniciarSesion", "listarDisenos", "obtenerDiseno",
                "obtenerMiCuenta", "restablecerContrasena", "solicitarOlvidoDeContrasena", "solicitarRegistro",
                "actualizarDiseno"
            }.Order(),
            ids.Order());
    }

    [Fact]
    public async Task UnCuerpoQueNoPasaLaValidacion_Responde400ConMensaje()
    {
        using var api = new ApiSinBaseDeDatos();

        var respuesta = await api.CreateClient().PostAsJsonAsync("/cuentas/registro", new { correo = "" });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<RespuestaDeMensaje>();
        Assert.Equal("Indica tu correo electrónico.", cuerpo?.Mensaje);
    }

    /// <summary>
    /// Ningún atributo de los contratos se queda con el mensaje en inglés del
    /// framework: la web lo enseña tal cual.
    /// </summary>
    [Theory]
    [InlineData("", "Ana", "Este enlace no es válido o ha caducado. Pide el alta de nuevo.")]
    [InlineData("token", "", "Indica tu nombre.")]
    [InlineData("token", "x101", "Indica tu nombre, de 100 caracteres como mucho.")]
    public async Task LosMensajesDeValidacion_EstanEnEspanol(string token, string nombre, string esperado)
    {
        using var api = new ApiSinBaseDeDatos();
        nombre = nombre == "x101" ? new string('x', 101) : nombre;

        var respuesta = await api.CreateClient().PostAsJsonAsync(
            "/cuentas/registro/confirmar", new { token, nombre, contrasena = new string('c', 12) });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal(esperado, (await respuesta.Content.ReadFromJsonAsync<RespuestaDeMensaje>())?.Mensaje);
    }

    [Theory]
    [InlineData("{")]
    [InlineData("")]
    public async Task UnJsonMalFormadoOAusente_Responde400ConMensaje(string cuerpoEnviado)
    {
        using var api = new ApiSinBaseDeDatos();

        var respuesta = await api.CreateClient().PostAsync(
            "/sesiones", new StringContent(cuerpoEnviado, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<RespuestaDeMensaje>();
        Assert.Equal("La petición no es válida.", cuerpo?.Mensaje);
    }

    private static bool PideBearer(JsonElement operacion) =>
        operacion.TryGetProperty("security", out var seguridad)
        && seguridad.EnumerateArray().Any(requisito => requisito.TryGetProperty("Bearer", out _));

    private static async Task<JsonDocument> LeerDocumentoAsync()
    {
        using var api = new ApiSinBaseDeDatos();

        return JsonDocument.Parse(await api.CreateClient().GetStringAsync("/openapi/v1.json"));
    }

    private sealed class ApiSinBaseDeDatos : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder constructor)
        {
            constructor.UseEnvironment("Testing");
            constructor.UseSetting("Jwt:ClaveDeFirma", ApiConPostgresFixture.ClaveDeFirmaDePrueba);
            constructor.UseSetting("Limpieza:Activa", "false");
            constructor.UseSetting("Correo:UsarBrevo", "false");
            constructor.UseSetting(
                "ConnectionStrings:Decorazon",
                "Host=127.0.0.1;Port=1;Database=inexistente;Username=nadie;Password=nada;Timeout=1;Command Timeout=1");
        }
    }
}
