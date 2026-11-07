using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Decorazon.Contratos.Disenos;
using Decorazon.Dominio.Puertos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Decorazon.Api.Tests;

/// <summary>Un reloj que el test adelanta: la copia depende de cuánto hace del último guardado.</summary>
public sealed class RelojAjustable : IReloj
{
    // Arranca en la hora real: los tokens de sesión se emiten con este reloj y se validan con el del sistema.
    public DateTimeOffset Ahora { get; set; } = DateTimeOffset.UtcNow;
    public void Adelantar(TimeSpan cuanto) => Ahora += cuanto;
}

public sealed class ApiConRelojAjustable : ApiConPostgresFixture
{
    public RelojAjustable Reloj { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        base.ConfigureWebHost(constructor);
        constructor.ConfigureTestServices(servicios =>
        {
            servicios.RemoveAll<IReloj>();
            servicios.AddSingleton<IReloj>(Reloj);
        });
    }
}

/// <summary>
/// M-21: la API guarda una copia del diseño (una por diseño) antes de sobrescribirlo, y se puede recuperar. La web guarda
/// cada dos segundos, así que no se copia en cada PUT: solo cuando el último guardado tiene 30 minutos o más (empieza otra
/// sesión de edición) o cuando la web pide la copia (<c>X-Copia-Previa: 1</c>, al sobrescribir tras un conflicto).
/// </summary>
[Trait("Categoria", "Integracion")]
public class VersionAnteriorTests(ApiConRelojAjustable api) : IClassFixture<ApiConRelojAjustable>
{
    // xUnit crea una instancia por test: el reloj vuelve a la hora real (un test anterior lo adelantó y el token de
    // sesión saldría con fecha futura).
    private readonly bool _relojEnHora = Poner(api);
    private static bool Poner(ApiConRelojAjustable api) { api.Reloj.Ahora = DateTimeOffset.UtcNow; return true; }

    private const string ConMesa =
        """{"formato":1,"estancia":{"ancho":300,"largo":400,"notas":"con mesa"},"aberturas":[],"estructura":[],"elementos":[]}""";
    private const string SinMesa =
        """{"formato":1,"estancia":{"ancho":300,"largo":400,"notas":"sin mesa"},"aberturas":[],"estructura":[],"elementos":[]}""";

    private static async Task<HttpResponseMessage> PutAsync(HttpClient cliente, Guid id, int version, string json, string nombre = "Mi dormitorio", bool copia = false)
    {
        var peticion = new HttpRequestMessage(HttpMethod.Put, $"/disenos/{id}") { Content = JsonContent.Create(DisenosDePrueba.Peticion(nombre, json: json)) };
        peticion.Headers.TryAddWithoutValidation("If-Match", $"\"{version}\"");
        if (copia) peticion.Headers.Add("X-Copia-Previa", "1");
        var respuesta = await cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return respuesta;
    }

    private static string Notas(JsonElement contenido) => contenido.GetProperty("estancia").GetProperty("notas").GetString()!;

    [Fact]
    public async Task GuardarSeguido_NoDejaCopia_PeroTrasMediaHoraSinGuardar_SiCopiaLoQueHabia()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        await PutAsync(cliente, id, 1, ConMesa);
        api.Reloj.Adelantar(TimeSpan.FromMinutes(5));
        await PutAsync(cliente, id, 2, ConMesa, nombre: "Mi dormitorio 2");

        // Guardados seguidos (la web guarda cada dos segundos): la copia de hace un momento no sirve.
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"/disenos/{id}/version-anterior")).StatusCode);

        // Al día siguiente se quita la mesa: lo de ayer queda copiado.
        api.Reloj.Adelantar(TimeSpan.FromHours(20));
        await PutAsync(cliente, id, 3, SinMesa);
        var copia = await cliente.GetFromJsonAsync<RespuestaDeVersionAnterior>($"/disenos/{id}/version-anterior");
        Assert.NotNull(copia);
        Assert.Equal("con mesa", Notas(copia.Contenido));
        Assert.Equal("Mi dormitorio 2", copia.Nombre);
        Assert.Equal("dormitorio", copia.TipoEstancia);
        Assert.Equal(3, copia.Version);
        // PostgreSQL guarda microsegundos: la fecha vuelve con un redondeo de menos de 1 ms.
        Assert.Equal(api.Reloj.Ahora - TimeSpan.FromHours(20), copia.Fecha, TimeSpan.FromMilliseconds(1));

        // Seguir guardando en la misma sesión no pisa la copia.
        api.Reloj.Adelantar(TimeSpan.FromMinutes(1));
        await PutAsync(cliente, id, 4, SinMesa, nombre: "otra cosa");
        var igual = await cliente.GetFromJsonAsync<RespuestaDeVersionAnterior>($"/disenos/{id}/version-anterior");
        Assert.Equal("con mesa", Notas(igual!.Contenido));
    }

    [Fact]
    public async Task ConXCopiaPrevia_CopiaAunqueElUltimoGuardadoSeaReciente()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        await PutAsync(cliente, id, 1, ConMesa);
        api.Reloj.Adelantar(TimeSpan.FromSeconds(10));
        await PutAsync(cliente, id, 2, SinMesa, copia: true);

        var copia = await cliente.GetFromJsonAsync<RespuestaDeVersionAnterior>($"/disenos/{id}/version-anterior");
        Assert.Equal("con mesa", Notas(copia!.Contenido));
    }

    [Fact]
    public async Task Recuperar_CambiaLaCopiaPorElActual_YSePuedeDeshacerRecuperandoOtraVez()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        await PutAsync(cliente, id, 1, ConMesa);
        api.Reloj.Adelantar(TimeSpan.FromDays(1));
        await PutAsync(cliente, id, 2, SinMesa);

        var recuperar = new HttpRequestMessage(HttpMethod.Post, $"/disenos/{id}/version-anterior/recuperar");
        recuperar.Headers.TryAddWithoutValidation("If-Match", "\"3\"");
        var respuesta = await cliente.SendAsync(recuperar);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("\"4\"", respuesta.Headers.ETag?.Tag);
        var actual = await respuesta.Content.ReadFromJsonAsync<RespuestaDeDiseno>();
        Assert.Equal("con mesa", Notas(actual!.Contenido));
        Assert.Equal(4, actual.Version);
        // Lo que había antes de recuperar es ahora la copia: recuperar se deshace recuperando otra vez.
        var copia = await cliente.GetFromJsonAsync<RespuestaDeVersionAnterior>($"/disenos/{id}/version-anterior");
        Assert.Equal("sin mesa", Notas(copia!.Contenido));
    }

    [Fact]
    public async Task Recuperar_ConOtraVersion_Da412_ySinIfMatch428_YSinCopia404()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);

        var sinCopia = new HttpRequestMessage(HttpMethod.Post, $"/disenos/{id}/version-anterior/recuperar");
        sinCopia.Headers.TryAddWithoutValidation("If-Match", "\"1\"");
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.SendAsync(sinCopia)).StatusCode);

        await PutAsync(cliente, id, 1, ConMesa, copia: true);
        var vieja = new HttpRequestMessage(HttpMethod.Post, $"/disenos/{id}/version-anterior/recuperar");
        vieja.Headers.TryAddWithoutValidation("If-Match", "\"1\"");
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await cliente.SendAsync(vieja)).StatusCode);

        Assert.Equal((HttpStatusCode)428, (await cliente.PostAsync($"/disenos/{id}/version-anterior/recuperar", null)).StatusCode);
    }

    [Fact]
    public async Task LaCopiaDeOtro_NoSeVeNiSeRecupera()
    {
        var dueno = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(dueno);
        await PutAsync(dueno, id, 1, ConMesa, copia: true);
        var otro = await CuentasDePrueba.ConSesionAsync(api);

        Assert.Equal(HttpStatusCode.NotFound, (await otro.GetAsync($"/disenos/{id}/version-anterior")).StatusCode);
        var recuperar = new HttpRequestMessage(HttpMethod.Post, $"/disenos/{id}/version-anterior/recuperar");
        recuperar.Headers.TryAddWithoutValidation("If-Match", "\"2\"");
        Assert.Equal(HttpStatusCode.NotFound, (await otro.SendAsync(recuperar)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().GetAsync($"/disenos/{id}/version-anterior")).StatusCode);
    }

    [Fact]
    public async Task BorrarElDiseno_SeLlevaSuCopia()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        await PutAsync(cliente, id, 1, ConMesa, copia: true);

        Assert.Equal(HttpStatusCode.NoContent, (await cliente.DeleteAsync($"/disenos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"/disenos/{id}/version-anterior")).StatusCode);
    }
}
