using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Decorazon.Contratos;
using Decorazon.Contratos.Cuentas;
using Decorazon.Contratos.Disenos;
using Decorazon.Dominio.Disenos;

namespace Decorazon.Api.Tests;

/// <summary>
/// El alta con el diseño que la persona hizo sin cuenta: pide el registro en un
/// dispositivo, abre el correo en otro, y su diseño la está esperando.
/// </summary>
[Trait("Categoria", "Integracion")]
public class RegistroConDisenoTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    private const string ContenidoDelPortatil =
        """{"formato":1,"estancia":{"ancho":280,"largo":310},"aberturas":[{"tipo":"ventana","pared":2}],"estructura":[],"elementos":[{"id":"sofa","x":1.5}]}""";

    /// <summary>
    /// El recorrido entre dispositivos: solo el enlace del correo une la petición
    /// del portátil con la sesión del móvil, y el diseño llega entero.
    /// </summary>
    [Fact]
    public async Task RecorridoEntreDispositivos_ElDisenoLlegaALaCuentaNueva()
    {
        var correo = CorreoUnico();
        var portatil = api.CreateClient();

        var solicitud = await portatil.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro
        {
            Correo = correo,
            Diseno = DisenosDePrueba.Peticion("Salón de casa", "salon", ContenidoDelPortatil)
        });
        Assert.Equal(HttpStatusCode.OK, solicitud.StatusCode);

        var movil = api.CreateClient();
        var confirmar = await movil.PostAsJsonAsync("/cuentas/registro/confirmar", new PeticionDeConfirmarRegistro
        {
            Token = api.Correo.TokenEnviadoA(correo),
            Nombre = "Ana Pérez",
            Contrasena = CuentasDePrueba.Contrasena
        });
        Assert.Equal(HttpStatusCode.OK, confirmar.StatusCode);

        await CuentasDePrueba.IniciarSesionAsync(movil, correo);

        var lista = (await movil.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!;
        var resumen = Assert.Single(lista);
        Assert.Equal("Salón de casa", resumen.Nombre);
        Assert.Equal("salon", resumen.TipoEstancia);
        Assert.Equal(1, resumen.Version);

        var diseno = (await movil.GetFromJsonAsync<RespuestaDeDiseno>($"/disenos/{resumen.Id}"))!;
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(ContenidoDelPortatil), JsonNode.Parse(diseno.Contenido.GetRawText())));
    }

    [Fact]
    public async Task DisenoSinNombre_SeGuardaConElNombrePorDefecto()
    {
        var correo = CorreoUnico();
        var cliente = api.CreateClient();

        await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro
        {
            Correo = correo,
            Diseno = new PeticionDeDiseno { TipoEstancia = "cocina", Contenido = DisenosDePrueba.Contenido() }
        });
        await ConfirmarAsync(cliente, correo);

        var resumen = Assert.Single((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
        Assert.Equal("Mi diseño", resumen.Nombre);
    }

    /// <summary>
    /// Un diseño que no vale se rechaza antes de mandar nada: si no, la persona
    /// recibiría un enlace que crea la cuenta sin el diseño que creía guardado.
    /// </summary>
    [Theory]
    [InlineData("""{"tipoEstancia":"salon"}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":null}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":[]}""")]
    [InlineData("""{"tipoEstancia":"bano","contenido":{"formato":1,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":{"formato":2,"estancia":{},"aberturas":[],"estructura":[],"elementos":[]}}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":{"formato":1,"estancia":{"n":"\uD800"},"aberturas":[],"estructura":[],"elementos":[]}}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":{"formato":1,"estancia":{"n":"\u0000"},"aberturas":[],"estructura":[],"elementos":[]}}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":{"formato":1,"estancia":{"ancho":1e200000},"aberturas":[],"estructura":[],"elementos":[]}}""")]
    [InlineData("""{"tipoEstancia":"salon","contenido":{"formato":1,"estancia":{"ancho":1234567890123456789012345678901234567890},"aberturas":[],"estructura":[],"elementos":[]}}""")]
    public async Task DisenoNoValido_Responde400ConMensaje_YNoEnviaCorreo(string diseno)
    {
        var correo = CorreoUnico();

        var respuesta = await api.CreateClient().PostAsync("/cuentas/registro",
            DisenosDePrueba.CuerpoCrudo($$"""{"correo":"{{correo}}","diseno":{{diseno}}}"""));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace((await respuesta.Content.ReadFromJsonAsync<RespuestaDeError>())?.Mensaje));
        Assert.DoesNotContain(api.Correo.EnlacesDeAlta, envio => envio.Destinatario == correo);
    }

    [Fact]
    public async Task DisenoDemasiadoGrande_Responde400()
    {
        var respuesta = await api.CreateClient().PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro
        {
            Correo = CorreoUnico(),
            Diseno = DisenosDePrueba.Peticion(json: DisenosDePrueba.ContenidoDeTamano(ContenidoDeDiseno.TamanoMaximoEnBytes + 1))
        });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    /// <summary>Casi 1 MB, dentro del límite: el cuerpo entero de la petición pasa sin problema.</summary>
    [Fact]
    public async Task DisenoDeCasiUnMega_SeAdmiteYLlegaEntero()
    {
        var correo = CorreoUnico();
        var cliente = api.CreateClient();
        var json = DisenosDePrueba.ContenidoDeTamano(ContenidoDeDiseno.TamanoMaximoEnBytes - 16);

        var respuesta = await cliente.PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro
        {
            Correo = correo,
            Diseno = DisenosDePrueba.Peticion("Grande", "salon", json)
        });
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        await ConfirmarAsync(cliente, correo);

        var resumen = Assert.Single((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
        var diseno = (await cliente.GetFromJsonAsync<RespuestaDeDiseno>($"/disenos/{resumen.Id}"))!;
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(json), JsonNode.Parse(diseno.Contenido.GetRawText())));
    }

    /// <summary>
    /// Con cuenta ya existente, misma respuesta que sin ella, y el diseño no se
    /// guarda en ningún sitio: la cuenta de otra persona no recibe diseños de un
    /// desconocido.
    /// </summary>
    [Fact]
    public async Task CorreoConCuenta_RespondeIgual_YNoAnadeElDiseno()
    {
        var correo = CorreoUnico();
        var duena = await CuentasDePrueba.ConSesionAsync(api, correo, "Dueña");

        var conCuenta = await api.CreateClient().PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro
        {
            Correo = correo,
            Diseno = DisenosDePrueba.Peticion("Intruso")
        });
        var sinCuenta = await api.CreateClient().PostAsJsonAsync("/cuentas/registro", new PeticionDeRegistro
        {
            Correo = CorreoUnico(),
            Diseno = DisenosDePrueba.Peticion("Intruso")
        });

        Assert.Equal(HttpStatusCode.OK, conCuenta.StatusCode);
        Assert.Equal(sinCuenta.StatusCode, conCuenta.StatusCode);
        Assert.Equal(await sinCuenta.Content.ReadAsStringAsync(), await conCuenta.Content.ReadAsStringAsync());
        Assert.Contains(correo, api.Correo.AvisosDeCuentaExistente);
        Assert.Empty((await duena.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
    }

    /// <summary>Pedir el alta otra vez invalida la anterior y su diseño: solo vale el último.</summary>
    [Fact]
    public async Task PedirloOtraVez_SoloLlegaElUltimoDiseno()
    {
        var correo = CorreoUnico();
        var cliente = api.CreateClient();

        await cliente.PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = correo, Diseno = DisenosDePrueba.Peticion("Primero") });
        await cliente.PostAsJsonAsync("/cuentas/registro",
            new PeticionDeRegistro { Correo = correo, Diseno = DisenosDePrueba.Peticion("Segundo") });

        await ConfirmarAsync(cliente, correo);

        var resumen = Assert.Single((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!);
        Assert.Equal("Segundo", resumen.Nombre);
    }

    private static string CorreoUnico() => $"con-diseno-{Guid.NewGuid():N}@ejemplo.com";

    private async Task ConfirmarAsync(HttpClient cliente, string correo)
    {
        var confirmar = await cliente.PostAsJsonAsync("/cuentas/registro/confirmar", new PeticionDeConfirmarRegistro
        {
            Token = api.Correo.TokenEnviadoA(correo),
            Nombre = "Ana Pérez",
            Contrasena = CuentasDePrueba.Contrasena
        });
        Assert.Equal(HttpStatusCode.OK, confirmar.StatusCode);

        await CuentasDePrueba.IniciarSesionAsync(cliente, correo);
    }
}
