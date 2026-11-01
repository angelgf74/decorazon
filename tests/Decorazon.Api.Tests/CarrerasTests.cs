using System.Net;
using System.Net.Http.Json;
using Decorazon.Contratos.Disenos;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace Decorazon.Api.Tests;

/// <summary>
/// Interceptor que se arma desde el test: el próximo guardado de cualquier contexto
/// ejecuta antes la carrera (con otro contexto, ya confirmada). Se desarma al
/// dispararse, así que el guardado de la propia carrera no la repite.
/// </summary>
public sealed class CarreraArmable : SaveChangesInterceptor
{
    private Func<Task>? _pendiente;

    public void Armar(Func<Task> carrera) => _pendiente = carrera;

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData datos,
        InterceptionResult<int> resultado,
        CancellationToken cancelacion = default)
    {
        var accion = Interlocked.Exchange(ref _pendiente, null);
        if (accion is not null)
        {
            await accion();
        }

        return resultado;
    }
}

public sealed class ApiConCarrerasFixture : ApiConPostgresFixture
{
    public CarreraArmable Carrera { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        base.ConfigureWebHost(constructor);
        constructor.ConfigureTestServices(servicios =>
            servicios.ConfigureDbContext<DecorazonDbContext>(opciones => opciones.AddInterceptors(Carrera)));
    }

    /// <summary>Ejecuta <paramref name="accion"/> con un contexto propio, como haría otra petición.</summary>
    public async Task ConOtroContextoAsync(Func<DecorazonDbContext, Task> accion)
    {
        using var ambito = Services.CreateScope();
        await accion(ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>());
    }
}

/// <summary>
/// Las carreras entre leer y guardar, por HTTP: responden 412 o 404 como si la otra
/// petición hubiera llegado antes, nunca 500.
/// </summary>
[Trait("Categoria", "Integracion")]
public class CarrerasTests(ApiConCarrerasFixture api) : IClassFixture<ApiConCarrerasFixture>
{
    [Fact]
    public async Task Put_SiOtroGuardaEntreLeerYGuardar_Responde412ConLaVersionActual()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        api.Carrera.Armar(() => api.ConOtroContextoAsync(contexto =>
            contexto.Disenos.Where(diseno => diseno.Id == id)
                .ExecuteUpdateAsync(cambio => cambio.SetProperty(diseno => diseno.Version, 2))));

        var respuesta = await PutAsync(cliente, id, "\"1\"");

        Assert.Equal(HttpStatusCode.PreconditionFailed, respuesta.StatusCode);
        Assert.Equal("\"2\"", respuesta.Headers.ETag?.Tag);
        Assert.Equal(2, (await respuesta.Content.ReadFromJsonAsync<RespuestaDeVersionDistinta>())!.Version);
    }

    [Fact]
    public async Task Put_SiOtroLoBorraEntreLeerYGuardar_Responde404()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        api.Carrera.Armar(() => BorrarDisenoAsync(id));

        var respuesta = await PutAsync(cliente, id, "\"1\"");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Delete_SiOtroLoBorraAntes_Responde404()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = await DisenosDePrueba.CrearAsync(cliente);
        api.Carrera.Armar(() => BorrarDisenoAsync(id));

        var respuesta = await cliente.DeleteAsync($"/disenos/{id}");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Post_SiLaCuentaSeBorraEntreContarYGuardar_Responde404()
    {
        var correo = $"carrera-{Guid.NewGuid():N}@ejemplo.com";
        var cliente = await CuentasDePrueba.ConSesionAsync(api, correo, "Carrera");
        api.Carrera.Armar(() => api.ConOtroContextoAsync(contexto =>
            contexto.Usuarios.Where(usuario => usuario.Correo == Dominio.Usuarios.CorreoElectronico.Crear(correo))
                .ExecuteDeleteAsync()));

        var respuesta = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion());

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    /// <summary>
    /// Dos pestañas suben a la vez el mismo diseño nuevo: la segunda pasa la comprobación
    /// de que no existe, choca con la clave primaria al guardar y responde 200 con el que
    /// guardó la primera.
    /// </summary>
    [Fact]
    public async Task DosAltasSimultaneasConElMismoId_UnaFilaYAmbasCorrectas()
    {
        var cliente = await CuentasDePrueba.ConSesionAsync(api);
        var id = Guid.NewGuid();
        HttpResponseMessage? laOtra = null;
        api.Carrera.Armar(async () =>
            laOtra = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion("Mi salón", "salon", id: id)));

        var respuesta = await cliente.PostAsJsonAsync("/disenos", DisenosDePrueba.Peticion("Mi salón", "salon", id: id));

        Assert.Equal(HttpStatusCode.Created, laOtra!.StatusCode);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("\"1\"", respuesta.Headers.ETag?.Tag);
        Assert.Equal(id, (await respuesta.Content.ReadFromJsonAsync<RespuestaDeDiseno>())!.Id);
        Assert.Equal(id, Assert.Single((await cliente.GetFromJsonAsync<List<RespuestaDeResumenDeDiseno>>("/disenos"))!).Id);
    }

    private Task BorrarDisenoAsync(Guid id) =>
        api.ConOtroContextoAsync(contexto => contexto.Disenos.Where(diseno => diseno.Id == id).ExecuteDeleteAsync());

    private static Task<HttpResponseMessage> PutAsync(HttpClient cliente, Guid id, string ifMatch)
    {
        var peticion = new HttpRequestMessage(HttpMethod.Put, $"/disenos/{id}")
        {
            Content = JsonContent.Create(DisenosDePrueba.Peticion("Editado"))
        };
        peticion.Headers.TryAddWithoutValidation("If-Match", ifMatch);
        return cliente.SendAsync(peticion);
    }
}
