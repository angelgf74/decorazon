using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Decorazon.Contratos;

namespace Decorazon.Api.Tests;

/// <summary>
/// El documento OpenAPI es de donde sale el cliente TypeScript de la web: tiene
/// que describir la autenticación, los códigos y las cabeceras de verdad. Ni el
/// documento ni los 400 del framework tocan la base de datos, así que no
/// necesita Docker.
/// </summary>
public class OpenApiTests(ApiSinBaseDeDatos api) : IClassFixture<ApiSinBaseDeDatos>
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
        Assert.True(PideBearer(rutas.GetProperty("/disenos/{id}/enlace").GetProperty("put")));
        Assert.True(PideBearer(rutas.GetProperty("/disenos/{id}/enlace").GetProperty("delete")));
        Assert.False(PideBearer(rutas.GetProperty("/compartidos/{enlace}").GetProperty("get")));
        Assert.True(PideBearer(rutas.GetProperty("/disenos/{id}/vista-previa").GetProperty("put")));
        Assert.False(PideBearer(rutas.GetProperty("/compartidos/{enlace}/imagen").GetProperty("get")));
        Assert.False(PideBearer(rutas.GetProperty("/compartidos/{enlace}/tarjeta").GetProperty("get")));
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

        foreach (var esquema in new[] { "PeticionDeDiseno", "RespuestaDeDiseno", "RespuestaDeDisenoCompartido" })
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
                "actualizarDiseno", "compartirDiseno", "dejarDeCompartirDiseno", "leerDisenoCompartido", "subirVistaPrevia", "leerVistaPrevia", "leerTarjeta"
            }.Order(),
            ids.Order());
    }

    /// <summary>
    /// Todo lo que la API puede responder está declarado: los 400 del framework
    /// en lo que lleva cuerpo y los 429 del limitador en lo que lo usa.
    /// </summary>
    [Theory]
    [InlineData("/sesiones", "post", "400")]
    [InlineData("/sesiones", "post", "429")]
    [InlineData("/cuentas/contrasena", "post", "429")]
    [InlineData("/cuentas/yo", "delete", "429")]
    [InlineData("/cuentas/registro", "post", "429")]
    [InlineData("/cuentas/contrasena/olvido", "post", "429")]
    [InlineData("/compartidos/{enlace}", "get", "429")]
    [InlineData("/compartidos/{enlace}/imagen", "get", "429")]
    [InlineData("/compartidos/{enlace}/tarjeta", "get", "429")]
    public async Task Documento_DeclaraLos400YLos429QueDaLaApi(string ruta, string metodo, string codigo)
    {
        using var documento = await LeerDocumentoAsync();

        var respuesta = documento.RootElement.GetProperty("paths").GetProperty(ruta).GetProperty(metodo)
            .GetProperty("responses").GetProperty(codigo);

        Assert.Equal(
            "#/components/schemas/RespuestaDeMensaje",
            respuesta.GetProperty("content").GetProperty("application/json").GetProperty("schema")
                .GetProperty("$ref").GetString());
    }

    [Fact]
    public async Task UnCuerpoQueNoPasaLaValidacion_Responde400ConMensaje()
    {
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
        var respuesta = await api.CreateClient().PostAsync(
            "/sesiones", new StringContent(cuerpoEnviado, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<RespuestaDeMensaje>();
        Assert.Equal("La petición no es válida.", cuerpo?.Mensaje);
    }

    private static bool PideBearer(JsonElement operacion) =>
        operacion.TryGetProperty("security", out var seguridad)
        && seguridad.EnumerateArray().Any(requisito => requisito.TryGetProperty("Bearer", out _));

    private async Task<JsonDocument> LeerDocumentoAsync() =>
        JsonDocument.Parse(await api.CreateClient().GetStringAsync("/openapi/v1.json"));
}
