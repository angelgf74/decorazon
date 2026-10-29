using Decorazon.Api.Tareas;
using Decorazon.Aplicacion.Limpieza;
using Decorazon.Dominio.Disenos;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Registro;
using Decorazon.Dominio.Usuarios;
using Decorazon.Infraestructura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Decorazon.Api.Tests;

/// <summary>Borrar lo caducado, contra PostgreSQL.</summary>
[Trait("Categoria", "Integracion")]
public class LimpiezaDeCaducadosTests(ApiConPostgresFixture api) : IClassFixture<ApiConPostgresFixture>
{
    private static readonly TimeSpan Dia = TimeSpan.FromDays(1);

    /// <summary>
    /// Se queda lo vigente y lo terminado hace 7 días o menos; se va lo
    /// terminado antes, por cualquiera de los caminos: caducar, usarse o
    /// anularse. El diseño de un alta caducada se descarta ya, aunque la
    /// solicitud se conserve. Y nada más.
    /// </summary>
    [Fact]
    public async Task BorraSoloLoTerminadoHaceMasDeSieteDias_YDescartaLosDisenosCaducados()
    {
        var ahora = DateTimeOffset.UtcNow;
        await CuentasDePrueba.ConSesionAsync(api);

        using var ambito = api.Services.CreateScope();
        var contexto = ambito.ServiceProvider.GetRequiredService<DecorazonDbContext>();
        var usuarioId = await contexto.Usuarios.Select(usuario => usuario.Id).FirstAsync();

        // Alta: dura 24 h.
        var altaVigente = Alta(ahora, ConDiseno());
        var altaCaducadaHace6 = Alta(ahora - 6 * Dia - SolicitudDeRegistro.Vigencia, ConDiseno());
        var altaCaducadaHace8 = Alta(ahora - 8 * Dia - SolicitudDeRegistro.Vigencia);

        // Contraseña: dura 1 h.
        var contrasenaVigente = SolicitudDeContrasena.Crear(usuarioId, Hash(), ahora);
        var contrasenaUsadaHace8 = SolicitudDeContrasena.Crear(usuarioId, Hash(), ahora - 8 * Dia);
        contrasenaUsadaHace8.Consumir(ahora - 8 * Dia + TimeSpan.FromMinutes(5));
        var contrasenaAnuladaHace8 = SolicitudDeContrasena.Crear(usuarioId, Hash(), ahora - 8 * Dia);
        contrasenaAnuladaHace8.Invalidar(ahora - 8 * Dia + TimeSpan.FromMinutes(5));

        contexto.AddRange(altaVigente, altaCaducadaHace6, altaCaducadaHace8);
        contexto.AddRange(contrasenaVigente, contrasenaUsadaHace8, contrasenaAnuladaHace8);
        await contexto.SaveChangesAsync();

        var otrasTablasAntes = await ContarOtrasTablasAsync(contexto);

        var resultado = await ambito.ServiceProvider.GetRequiredService<LimpiarCaducados>().EjecutarAsync();

        contexto.ChangeTracker.Clear();
        var altas = await contexto.SolicitudesDeRegistro.ToListAsync();
        var contrasenas = await contexto.SolicitudesDeContrasena.Select(fila => fila.Id).ToListAsync();

        Assert.Contains(altas, alta => alta.Id == altaVigente.Id && alta.Diseno is not null);
        Assert.Contains(altas, alta => alta.Id == altaCaducadaHace6.Id && alta.Diseno is null);
        Assert.DoesNotContain(altas, alta => alta.Id == altaCaducadaHace8.Id);

        Assert.Contains(contrasenaVigente.Id, contrasenas);
        Assert.DoesNotContain(contrasenaUsadaHace8.Id, contrasenas);
        Assert.DoesNotContain(contrasenaAnuladaHace8.Id, contrasenas);

        Assert.Equal(1, resultado.SolicitudesDeAlta);
        Assert.Equal(2, resultado.SolicitudesDeContrasena);
        Assert.Equal(1, resultado.DisenosDescartados);
        Assert.Equal(otrasTablasAntes, await ContarOtrasTablasAsync(contexto));
    }

    /// <summary>
    /// Una vuelta que falla no se escapa: si lo hiciera, el host de .NET pararía
    /// la API entera.
    /// </summary>
    [Fact]
    public async Task Tarea_UnaVueltaQueFalla_NoLanza()
    {
        var servicios = new ServiceCollection()
            .AddSingleton<ILimpiezaDeCaducados, LimpiezaQueFalla>()
            .AddSingleton<IReloj, RelojFijo>()
            .AddScoped<LimpiarCaducados>()
            .BuildServiceProvider();

        var tarea = new TareaDeLimpieza(servicios.GetRequiredService<IServiceScopeFactory>(), NullLogger<TareaDeLimpieza>.Instance);

        await tarea.VueltaAsync(CancellationToken.None);
    }

    /// <summary>Encendida por defecto; las fixtures la apagan con <c>Limpieza:Activa=false</c>.</summary>
    [Fact]
    public void Tarea_ApagadaEnLosTests()
    {
        Assert.DoesNotContain(api.Services.GetServices<Microsoft.Extensions.Hosting.IHostedService>(), servicio => servicio is TareaDeLimpieza);
    }

    private static SolicitudDeRegistro Alta(DateTimeOffset creada, DisenoPendiente? diseno = null) =>
        SolicitudDeRegistro.Crear(CorreoElectronico.Crear($"alta-{Guid.NewGuid():N}@ejemplo.com"), Hash(), diseno, creada);

    private static DisenoPendiente ConDiseno()
    {
        NombreDeDiseno.TryCrear("Pendiente", out var nombre);
        ContenidoDeDiseno.Validar(DisenosDePrueba.ContenidoMinimo, out var contenido);

        return new DisenoPendiente(nombre, TipoDeEstancia.Salon, contenido!);
    }

    private static string Hash() => Guid.NewGuid().ToString("N");

    private static async Task<string> ContarOtrasTablasAsync(DecorazonDbContext contexto) =>
        $"usuarios={await contexto.Usuarios.CountAsync()} disenos={await contexto.Disenos.CountAsync()}";

    private sealed class LimpiezaQueFalla : ILimpiezaDeCaducados
    {
        public Task<ResultadoDeLimpieza> BorrarTerminadasAntesDeAsync(DateTimeOffset limite, CancellationToken cancelacion = default) =>
            throw new InvalidOperationException("La base de datos no responde (simulado).");

        public Task<int> DescartarDisenosCaducadosAsync(DateTimeOffset ahora, CancellationToken cancelacion = default) =>
            throw new InvalidOperationException("La base de datos no responde (simulado).");
    }

    private sealed class RelojFijo : IReloj
    {
        public DateTimeOffset Ahora => new(2026, 10, 11, 3, 0, 0, TimeSpan.Zero);
    }
}
