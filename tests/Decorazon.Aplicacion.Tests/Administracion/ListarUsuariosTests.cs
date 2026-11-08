using Decorazon.Aplicacion.Administracion;
using Decorazon.Dominio.Puertos;
using Decorazon.Dominio.Usuarios;

namespace Decorazon.Aplicacion.Tests.Administracion;

/// <summary>La lista de cuentas de la vista de administración.</summary>
public class ListarUsuariosTests
{
    private static readonly DateTimeOffset Alta = new(2026, 10, 1, 10, 0, 0, TimeSpan.Zero);

    private sealed class ConsultaFija(params UsoDeUsuario[] usos) : IConsultaDeUsuarios
    {
        public Task<IReadOnlyList<UsoDeUsuario>> UsoPorUsuarioAsync(CancellationToken cancelacion = default) =>
            Task.FromResult<IReadOnlyList<UsoDeUsuario>>(usos);
    }

    private static UsoDeUsuario Uso(string nombre, int disenos, long bytes, int diasDesdeAlta = 0) =>
        new(Guid.NewGuid(), $"{nombre}@x.es", nombre, Alta.AddDays(diasDesdeAlta), disenos, bytes);

    [Fact]
    public async Task OrdenaDeMasAMenosEspacio_ConLosTotales()
    {
        var caso = new ListarUsuarios(new ConsultaFija(Uso("poco", 1, 100), Uso("mucho", 5, 9_000), Uso("medio", 2, 3_000)));

        var listado = await caso.EjecutarAsync();

        Assert.Equal(["mucho", "medio", "poco"], listado.Usuarios.Select(u => u.Nombre));
        Assert.Equal(8, listado.TotalDeDisenos);
        Assert.Equal(12_100, listado.TotalDeBytes);
    }

    [Fact]
    public async Task ConElMismoEspacio_VanPrimeroLosDeMasDisenosYLuegoLosMasAntiguos()
    {
        var caso = new ListarUsuarios(new ConsultaFija(
            Uso("nueva", 0, 0, diasDesdeAlta: 5), Uso("antigua", 0, 0), Uso("con-disenos", 3, 0)));

        var listado = await caso.EjecutarAsync();

        Assert.Equal(["con-disenos", "antigua", "nueva"], listado.Usuarios.Select(u => u.Nombre));
    }

    [Fact]
    public async Task SinCuentas_ListaVaciaYTotalesACero()
    {
        var listado = await new ListarUsuarios(new ConsultaFija()).EjecutarAsync();

        Assert.Empty(listado.Usuarios);
        Assert.Equal(0, listado.TotalDeDisenos);
        Assert.Equal(0, listado.TotalDeBytes);
    }
}
